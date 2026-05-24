import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import path from "path";

const SESSION_DIR = path.join(process.cwd(), "wa_sessions");

class WhatsAppManager {
  private clients: Map<string, Client> = new Map();
  private connecting: Set<string> = new Set();

  private get db() {
    if (!prisma.whatsAppSession) {
      throw new Error("WhatsAppSession model not found in Prisma schema. Run 'npx prisma migrate dev' first.");
    }
    return prisma;
  }

  async getStatus(userId: string) {
    const session = await this.db.whatsAppSession.findUnique({ where: { userId } });
    return session || { id: "", userId, status: "disconnected", phone: null, qrCode: null, createdAt: new Date(), updatedAt: new Date() };
  }

  async startConnect(userId: string) {
    if (this.connecting.has(userId)) return;
    this.connecting.add(userId);

    const existing = this.clients.get(userId);
    if (existing) {
      const state = await existing.getState().catch(() => "disconnected");
      if (state === "connected") { this.connecting.delete(userId); return; }
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
      this.connecting.delete(userId);
    });

    waClient.on("disconnected", async () => {
      await this.db.whatsAppSession.upsert({
        where: { userId },
        create: { userId, status: "disconnected" },
        update: { status: "disconnected", qrCode: null },
      });
      this.clients.delete(userId);
      this.connecting.delete(userId);
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
      await waClient.initialize();
    } catch (err) {
      await this.db.whatsAppSession.upsert({
        where: { userId },
        create: { userId, status: "disconnected" },
        update: { status: "disconnected", qrCode: null },
      });
      this.clients.delete(userId);
      this.connecting.delete(userId);
    }
  }

  async getQR(userId: string): Promise<string | null> {
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

  private getSessionPath(userId: string) {
    return path.join(SESSION_DIR, userId);
  }
}

export const whatsappManager = new WhatsAppManager();