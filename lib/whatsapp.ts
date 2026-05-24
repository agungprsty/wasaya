import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import path from "path";

const SESSION_DIR = path.join(process.cwd(), "wa_sessions");

class WhatsAppManager {
  private clients: Map<string, Client> = new Map();
  private connecting: Map<string, Promise<void>> = new Map();
  private initialized = false;

  private get db() {
    if (!prisma.whatsAppSession) {
      throw new Error("WhatsAppSession model not found in Prisma schema. Run 'npx prisma migrate dev' first.");
    }
    return prisma;
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const sessions = await this.db.whatsAppSession.findMany({
        where: { status: "connected" },
      });
      for (const session of sessions) {
        this.startConnect(session.userId, 15000).catch(() => {});
      }
    } catch {}
  }

  async getStatus(userId: string) {
    await this.ensureInitialized().catch(() => {});
    const session = await this.db.whatsAppSession.findUnique({ where: { userId } });
    const base = session || { id: "", userId, phone: null, qrCode: null, createdAt: new Date(), updatedAt: new Date() };

    let status = session?.status || "disconnected";
    if (status === "connected" && !this.clients.has(userId)) {
      status = this.connecting.has(userId) ? "connecting" : "disconnected";
    }

    return { ...base, status };
  }

  async startConnect(userId: string, timeoutMs = 0) {
    const existing = this.connecting.get(userId);
    if (existing) return existing;

    const promise = this._doConnect(userId, timeoutMs);
    this.connecting.set(userId, promise);

    try {
      await promise;
    } finally {
      if (this.connecting.get(userId) === promise) {
        this.connecting.delete(userId);
      }
    }
  }

  private async _doConnect(userId: string, timeoutMs = 0) {
    const existing = this.clients.get(userId);
    if (existing) {
      const state = await existing.getState().catch(() => "disconnected");
      if (state === "connected") return;
      existing.destroy().catch(() => {});
      this.clients.delete(userId);
    }

    await this.db.whatsAppSession.upsert({
      where: { userId },
      create: { userId, status: "connecting" },
      update: { status: "connecting", qrCode: null },
    });

    const waClient = new Client({
      authStrategy: new LocalAuth({ clientId: userId, dataPath: this.getSessionPath(userId) }),
      puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
    });

    waClient.on("qr", async (qr) => {
      await this.db.whatsAppSession.upsert({
        where: { userId },
        create: { userId, status: "connecting", qrCode: qr },
        update: { qrCode: qr },
      });
    });

    waClient.on("ready", async () => {
      const info = waClient.info;
      await this.db.whatsAppSession.upsert({
        where: { userId },
        create: { userId, status: "connected", phone: info?.wid?.user || null, qrCode: null },
        update: { status: "connected", phone: info?.wid?.user || null, qrCode: null },
      });
      this.retryPendingMessages(userId).catch(() => {});
    });

    waClient.on("disconnected", async () => {
      await this.db.whatsAppSession.upsert({
        where: { userId },
        create: { userId, status: "disconnected" },
        update: { status: "disconnected", qrCode: null },
      });
      this.clients.delete(userId);
    });

    waClient.on("message", async (msg) => {
      const from = msg.from || "";
      const body = msg.body || "";
      if (!from || !body) return;
      await this.db.whatsAppMessage.create({
        data: {
          userId,
          to: from,
          from: waClient.info?.wid?.user || "unknown",
          messageId: msg.id?._serialized || crypto.randomUUID(),
          body,
          status: "received",
        },
      });
    });

    this.clients.set(userId, waClient);

    try {
      if (timeoutMs > 0) {
        await Promise.race([
          waClient.initialize(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), timeoutMs)
          ),
        ]);
      } else {
        await waClient.initialize();
      }
      await this.waitForStoreReady(waClient);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === "Connection timeout";
      if (isTimeout) {
        waClient.destroy().catch(() => {});
      }
      await this.db.whatsAppSession.upsert({
        where: { userId },
        create: { userId, status: "disconnected" },
        update: { status: "disconnected", qrCode: null },
      });
      this.clients.delete(userId);
      throw err;
    }
  }

  async getQR(userId: string): Promise<string | null> {
    await this.ensureInitialized().catch(() => {});
    const session = await this.db.whatsAppSession.findUnique({ where: { userId } });
    if (!session) return null;
    if (session.status === "connected") return null;
    return session.qrCode;
  }

  async disconnect(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      await client.destroy().catch(() => {});
      this.clients.delete(userId);
    }
    this.connecting.delete(userId);
    await this.db.whatsAppSession.upsert({
      where: { userId },
      create: { userId, status: "disconnected" },
      update: { status: "disconnected", qrCode: null },
    });
  }

  async sendMessage(userId: string, to: string, body: string, media: { base64: string; mimetype: string; filename?: string } | null = null) {
    await this.ensureInitialized().catch(() => {});

    const session = await this.db.whatsAppSession.findUnique({ where: { userId } });
    if (session?.status === "connected" || session?.status === "connecting") {
      await this.startConnect(userId, 15000).catch(() => {});
    }

    const client = this.clients.get(userId);
    if (!client) throw new Error("WhatsApp not connected");

    const chatId = to.includes("@c.us") ? to : `${to}@c.us`;

    let sent;
    if (media) {
      const msgMedia = new MessageMedia(
        media.mimetype,
        media.base64,
        media.filename || "file"
      );
      sent = await client.sendMessage(chatId, msgMedia, {
        caption: body || undefined,
      });
    } else {
      sent = await client.sendMessage(chatId, body);
    }

    await this.db.whatsAppMessage.create({
      data: {
        userId,
        to,
        from: "me",
        messageId: sent.id?._serialized || crypto.randomUUID(),
        body,
        status: "sent",
      },
    });
  }

  private async retryPendingMessages(userId: string) {
    const pending = await this.db.whatsAppMessage.findMany({
      where: { userId, status: "pending" },
    });
    if (pending.length === 0) return;

    const client = this.clients.get(userId);
    if (!client) return;

    for (const msg of pending) {
      try {
        const chatId = msg.to.includes("@c.us") ? msg.to : `${msg.to}@c.us`;
        await client.sendMessage(chatId, msg.body);
        await this.db.whatsAppMessage.update({
          where: { id: msg.id },
          data: { status: "sent" },
        });
      } catch {
        // leave as pending
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  private async waitForStoreReady(client: Client, retries = 10, delay = 500) {
    for (let i = 0; i < retries; i++) {
      try {
        await client.getChats();
        return;
      } catch {
        if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  private getSessionPath(userId: string) {
    return path.join(SESSION_DIR, userId);
  }
}

export const whatsappManager = new WhatsAppManager();
