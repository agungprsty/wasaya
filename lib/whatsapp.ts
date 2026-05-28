import { Client, LocalAuth, MessageMedia, Location } from "whatsapp-web.js";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import path from "path";
import { deliverWebhook } from "@/lib/webhook";
import { processChatbot, processAutoReply } from "@/lib/chatbot";

const SESSION_DIR = path.join(process.cwd(), "wa_sessions");
const QR_TIMEOUT_MS = 20_000;
const MAX_RECONNECT_RETRIES = 5;
const RECONNECT_BASE_DELAY_MS = 5_000;
const HEALTH_CHECK_INTERVAL_MS = 30_000;

function makeKey(userId: string, deviceId: string): string {
  return `${userId}_${deviceId}`;
}

function toJID(to: string): string {
  if (to.includes("@")) {
    return to.replace(/@c\.us$/, "@s.whatsapp.net");
  }
  const clean = to.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

class WhatsAppManager {
  private clients: Map<string, Client> = new Map();
  private connecting: Map<string, Promise<void>> = new Map();
  private qrCache: Map<string, string | null> = new Map();
  private qrTimers: Map<string, NodeJS.Timeout> = new Map();
  private initialized = false;
  private manualDisconnects: Set<string> = new Set();
  private reconnectRetries: Map<string, number> = new Map();
  private knownSessions: Map<string, { userId: string; deviceId: string }> = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;

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
        where: { OR: [{ status: "connected" }, { status: "connecting" }] },
      });
      for (const session of sessions) {
        const key = makeKey(session.userId, session.deviceId);
        this.knownSessions.set(key, { userId: session.userId, deviceId: session.deviceId });
        this.startConnect(session.userId, 0, session.deviceId).catch(() => {});
      }
      this.startHealthCheck();
    } catch {}
  }

  async getStatus(userId: string, deviceId = "main") {
    await this.ensureInitialized().catch(() => {});
    const session = await this.db.whatsAppSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    const base = session || { id: "", userId, deviceId, name: "Main Device", phone: null, qrCode: null, createdAt: new Date(), updatedAt: new Date() };

    let status = session?.status || "disconnected";
    const key = makeKey(userId, deviceId);
    if (status === "connected" && !this.clients.has(key)) {
      status = this.connecting.has(key) ? "connecting" : "disconnected";
    }

    return { ...base, status };
  }

  async listDevices(userId: string) {
    await this.ensureInitialized().catch(() => {});
    const sessions = await this.db.whatsAppSession.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return sessions.map((s) => ({
      ...s,
      status: this.clients.has(makeKey(userId, s.deviceId))
        ? s.status
        : this.connecting.has(makeKey(userId, s.deviceId))
          ? "connecting"
          : s.status,
    }));
  }

  async addDevice(userId: string, name: string, deviceId: string) {
    if (!deviceId) deviceId = crypto.randomUUID().slice(0, 8);
    const count = await this.db.whatsAppSession.count({ where: { userId } });
    if (count >= 4) throw new Error("Maximum 4 devices allowed");
    const existing = await this.db.whatsAppSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (existing) throw new Error("Device ID already exists");
    const session = await this.db.whatsAppSession.create({
      data: { userId, deviceId, name, status: "disconnected" },
    });
    return session;
  }

  async deleteDevice(userId: string, deviceId: string) {
    const key = makeKey(userId, deviceId);
    this.manualDisconnects.delete(key);
    this.knownSessions.delete(key);
    this.reconnectRetries.delete(key);
    const client = this.clients.get(key);
    if (client) {
      await client.destroy().catch(() => {});
      this.clients.delete(key);
    }
    this.connecting.delete(key);
    this.qrCache.delete(key);
    const timer = this.qrTimers.get(key);
    if (timer) clearTimeout(timer);
    this.qrTimers.delete(key);
    await this.db.whatsAppSession.deleteMany({
      where: { userId, deviceId },
    });
  }

  async startConnect(userId: string, timeoutMs = 0, deviceId = "main") {
    const key = makeKey(userId, deviceId);

    // Wait for any existing connect attempt to finish
    const existing = this.connecting.get(key);
    if (existing) {
      try {
        await existing;
      } catch {
        // existing failed, continue with new attempt
      }
    }

    // Already connected, nothing to do
    if (this.clients.has(key)) return;

    const promise = this._doConnect(userId, deviceId, timeoutMs);
    this.connecting.set(key, promise);

    try {
      await promise;
    } finally {
      if (this.connecting.get(key) === promise) {
        this.connecting.delete(key);
      }
    }
  }

  private async _doConnect(userId: string, deviceId: string, timeoutMs = 0) {
    const key = makeKey(userId, deviceId);
    const existing = this.clients.get(key);
    if (existing) {
      const state = await existing.getState().catch(() => "disconnected");
      if (state === "connected") return;
      await existing.destroy().catch(() => {});
      this.clients.delete(key);
    }

    await this.db.whatsAppSession.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, deviceId, status: "connecting" },
      update: { status: "connecting", qrCode: null },
    });

    this.manualDisconnects.delete(key);
    this.qrCache.delete(key);
    const oldTimer = this.qrTimers.get(key);
    if (oldTimer) clearTimeout(oldTimer);
    this.qrTimers.delete(key);

    const waClient = new Client({
      authStrategy: new LocalAuth({ clientId: key, dataPath: this.getSessionPath(userId, deviceId) }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--no-first-run",
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-sync",
          "--disable-default-apps",
          "--mute-audio",
          "--hide-scrollbars",
          "--disable-notifications",
          "--disable-breakpad",
          "--disable-component-update",
          "--no-default-browser-check",
        ],
      },
    });

    waClient.on("qr", async (qr) => {
      await this.db.whatsAppSession.upsert({
        where: { userId_deviceId: { userId, deviceId } },
        create: { userId, deviceId, status: "connecting", qrCode: qr },
        update: { qrCode: qr },
      });
      this.qrCache.set(key, qr);
      const existing = this.qrTimers.get(key);
      if (existing) clearTimeout(existing);
      this.qrTimers.set(
        key,
        setTimeout(() => {
          this.qrCache.delete(key);
          this.qrTimers.delete(key);
          this.disconnect(userId, deviceId).catch(() => {});
        }, QR_TIMEOUT_MS),
      );
    });

    waClient.on("ready", async () => {
      const timer = this.qrTimers.get(key);
      if (timer) clearTimeout(timer);
      this.qrTimers.delete(key);
      this.qrCache.delete(key);
      const info = waClient.info;
      await this.db.whatsAppSession.upsert({
        where: { userId_deviceId: { userId, deviceId } },
        create: { userId, deviceId, status: "connected", phone: info?.wid?.user || null, qrCode: null },
        update: { status: "connected", phone: info?.wid?.user || null, qrCode: null },
      });
      this.retryPendingMessages(userId, deviceId, waClient).catch(() => {});
    });

    waClient.on("message_ack", async (msg, ack) => {
      const statusMap: Record<number, string> = {
        1: "sent",
        2: "delivered",
        3: "delivered",
        4: "failed",
      };
      const status = statusMap[ack] || "sent";
      const serialized = msg.id?._serialized;
      if (serialized) {
        await this.db.whatsAppMessage.updateMany({
          where: { messageId: serialized, userId },
          data: { status },
        }).catch(() => {});
        deliverWebhook(userId, `message.${status}`, {
          messageId: serialized,
          status,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }
    });

    waClient.on("disconnected", async () => {
      const timer = this.qrTimers.get(key);
      if (timer) clearTimeout(timer);
      this.qrTimers.delete(key);
      this.qrCache.delete(key);
      this.clients.delete(key);

      const isManual = this.manualDisconnects.has(key);
      if (!isManual) {
        const retries = this.reconnectRetries.get(key) || 0;
        if (retries < MAX_RECONNECT_RETRIES) {
          const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, retries);
          this.reconnectRetries.set(key, retries + 1);
          await new Promise((r) => setTimeout(r, delay));
          this.startConnect(userId, 45_000, deviceId).catch(() => {});
          return;
        }
      }

      this.manualDisconnects.delete(key);
      this.reconnectRetries.delete(key);
      await this.db.whatsAppSession.upsert({
        where: { userId_deviceId: { userId, deviceId } },
        create: { userId, deviceId, status: "disconnected" },
        update: { status: "disconnected", qrCode: null },
      });
    });

    waClient.on("message", async (msg) => {
      const from = msg.from || "";
      const body = msg.body || "";
      if (!from || !body) return;
      const record = await this.db.whatsAppMessage.create({
        data: {
          userId,
          deviceId,
          to: from,
          from: waClient.info?.wid?.user || "unknown",
          messageId: msg.id?._serialized || crypto.randomUUID(),
          body,
          status: "received",
        },
      });

      const autoReplied = await processAutoReply(userId, from).catch(() => false);
      if (autoReplied) return;

      const reply = await processChatbot(userId, from, body).catch(() => null);
      if (reply) {
        this.sendMessage(userId, from, reply, null, deviceId).catch(() => {});
        return;
      }

      deliverWebhook(userId, "message.received", {
        id: record.id,
        from,
        body,
        timestamp: record.timestamp.toISOString(),
      }).catch(() => {});
    });

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
      this.clients.set(key, waClient);
      this.knownSessions.set(key, { userId, deviceId });
      this.reconnectRetries.delete(key);
    } catch (err) {
      console.error(`[WhatsApp] _doConnect failed for ${key}:`, err);
      const isTimeout = err instanceof Error && err.message === "Connection timeout";
      if (isTimeout) {
        waClient.destroy().catch(() => {});
      }
      if (this.clients.has(key)) {
        this.clients.delete(key);
      }
      await this.db.whatsAppSession.upsert({
        where: { userId_deviceId: { userId, deviceId } },
        create: { userId, deviceId, status: "disconnected" },
        update: { status: "disconnected", qrCode: null },
      });
      if (isTimeout) throw err;
    }
  }

  private startHealthCheck() {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(async () => {
      try {
        for (const [key, info] of this.knownSessions) {
          const hasClient = this.clients.has(key);
          const isConnecting = this.connecting.has(key);
          if (!hasClient && !isConnecting) {
            this.startConnect(info.userId, 45_000, info.deviceId).catch(() => {});
          }
        }
      } catch {
        // ignore
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  async getQR(userId: string, deviceId = "main"): Promise<string | null> {
    const key = makeKey(userId, deviceId);
    if (this.qrCache.has(key)) return this.qrCache.get(key) ?? null;
    await this.ensureInitialized().catch(() => {});
    const session = await this.db.whatsAppSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (!session) return null;
    if (session.status === "connected") return null;
    if (session.qrCode) this.qrCache.set(key, session.qrCode);
    return session.qrCode;
  }

  async disconnect(userId: string, deviceId = "main") {
    const key = makeKey(userId, deviceId);
    this.manualDisconnects.add(key);
    this.knownSessions.delete(key);
    this.reconnectRetries.delete(key);
    const timer = this.qrTimers.get(key);
    if (timer) clearTimeout(timer);
    this.qrTimers.delete(key);
    this.qrCache.delete(key);
    const client = this.clients.get(key);
    if (client) {
      await client.destroy().catch(() => {});
      this.clients.delete(key);
    }
    this.connecting.delete(key);
    await this.db.whatsAppSession.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, deviceId, status: "disconnected" },
      update: { status: "disconnected", qrCode: null },
    });
  }

  async getContacts(userId: string, deviceId = "main") {
    await this.ensureInitialized().catch(() => {});
    const key = makeKey(userId, deviceId);
    const client = this.clients.get(key);
    if (!client) throw new Error("WhatsApp not connected");
    const contacts = await client.getContacts();
    const seen = new Set<string>();
    return contacts
      .filter((c) => {
        if (!c.isMyContact || !c.id?.user) return false;
        if (seen.has(c.id.user)) return false;
        seen.add(c.id.user);
        return true;
      })
      .map((c) => ({
        name: c.name || c.pushname || c.shortName || "",
        number: c.id.user,
        id: c.id._serialized,
      }));
  }

  async getGroups(userId: string, deviceId = "main") {
    await this.ensureInitialized().catch(() => {});
    const key = makeKey(userId, deviceId);
    const client = this.clients.get(key);
    if (!client) throw new Error("WhatsApp not connected");
    const chats = await client.getChats();
    const seen = new Set<string>();
    return chats
      .filter((c) => c.isGroup && c.id?._serialized)
      .filter((c) => {
        if (seen.has(c.id._serialized)) return false;
        seen.add(c.id._serialized);
        return true;
      })
      .map((c) => ({
        id: c.id._serialized,
        name: c.name || "Unnamed Group",
        participants: (c as unknown as { participants?: { length: number } }).participants?.length || 0,
      }));
  }

  async sendMessage(
    userId: string,
    to: string,
    body: string,
    media: { base64: string; mimetype: string; filename?: string } | null = null,
    deviceId = "main",
    location?: { latitude: number; longitude: number; title?: string } | null,
  ) {
    await this.ensureInitialized().catch(() => {});

    const key = makeKey(userId, deviceId);
    const session = await this.db.whatsAppSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (session?.status === "connected" || session?.status === "connecting") {
      await this.startConnect(userId, 15000, deviceId).catch(() => {});
    }

    const client = this.clients.get(key);
    if (!client) throw new Error("WhatsApp not connected");

    const cleanNumber = to.replace(/[^0-9]/g, "");
    const chatId = to.includes("@") ? to : `${cleanNumber}@c.us`;

    if (location) {
      await client.sendMessage(chatId, new Location(location.latitude, location.longitude));
    }
    if (body) {
      if (media) {
        const msgMedia = new MessageMedia(
          media.mimetype,
          media.base64,
          media.filename || "file",
        );
        await client.sendMessage(chatId, msgMedia, { caption: body || undefined });
      } else {
        await client.sendMessage(chatId, body);
      }
    } else if (!location && !media) {
      throw new Error("Nothing to send");
    }

    await this.db.whatsAppMessage.create({
      data: {
        userId,
        deviceId,
        to,
        from: "me",
        messageId: crypto.randomUUID(),
        body,
        status: "sent",
      },
    });
  }

  private async retryPendingMessages(userId: string, deviceId = "main", client?: Client) {
    const pending = await this.db.whatsAppMessage.findMany({
      where: { userId, status: "pending" },
    });
    if (pending.length === 0) return;

    const key = makeKey(userId, deviceId);
    const waClient = client || this.clients.get(key);
    if (!waClient) return;

    for (const msg of pending) {
      try {
        const chatId = msg.to.includes("@") ? msg.to : `${msg.to}@c.us`;
        await waClient.sendMessage(chatId, msg.body);
        await this.db.whatsAppMessage.update({
          where: { id: msg.id },
          data: { status: "sent" },
        });
      } catch {}
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

  private getSessionPath(userId: string, deviceId: string) {
    return path.join(SESSION_DIR, `${userId}_${deviceId}`);
  }
}

export const whatsappManager = new WhatsAppManager();
