import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { deliverWebhook } from "@/lib/webhook";
import { processChatbot, processAutoReply } from "@/lib/chatbot";
import { waLogger } from "@/lib/logger";
import { usePrismaAuthState } from "@/lib/baileys-auth";
import makeWASocket, {
  DisconnectReason,
  fetchLatestWaWebVersion,
  type WASocket,
  type AuthenticationState,
  type WAVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

const QR_TIMEOUT_MS = 20_000;
const MAX_RECONNECT_RETRIES = 5;
const RECONNECT_BASE_DELAY_MS = 5_000;
const HEALTH_CHECK_INTERVAL_MS = 30_000;
const VERSION_REFRESH_MS = 6 * 60 * 60 * 1000; // 6 hours

let cachedVersion: WAVersion | null = null;
let lastVersionFetch = 0;

async function getLatestVersion(): Promise<WAVersion> {
  const now = Date.now();
  if (cachedVersion && now - lastVersionFetch < VERSION_REFRESH_MS) {
    return cachedVersion;
  }
  try {
    const { version } = await fetchLatestWaWebVersion();
    cachedVersion = version;
    lastVersionFetch = now;
    return version;
  } catch {
    return cachedVersion ?? [2, 3000, 1035194821];
  }
}

function makeKey(userId: string, deviceId: string): string {
  return `${userId}_${deviceId}`;
}

export function toJID(to: string): string {
  if (to.includes("@")) {
    return to.replace(/@c\.us$/, "@s.whatsapp.net");
  }
  const clean = to.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

interface ContactEntry {
  name: string;
  number: string;
  jid: string;
}

const MANAGER_GLOBAL_KEY = "__baileys_manager_instance__";

class BaileysManager {
  private sockets: Map<string, WASocket> = new Map();
  private connecting: Map<string, Promise<void>> = new Map();
  private qrCache: Map<string, string | null> = new Map();
  private qrTimers: Map<string, NodeJS.Timeout> = new Map();
  private authStates: Map<string, AuthenticationState> = new Map();
  private contactsCache: Map<string, Map<string, ContactEntry>> = new Map();
  private initialized = false;
  private manualDisconnects: Set<string> = new Set();
  private reconnectRetries: Map<string, number> = new Map();
  private knownSessions: Map<string, { userId: string; deviceId: string }> = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private pendingPairings: Map<string, string> = new Map();
  private credsSavePromises: Map<string, Promise<void>> = new Map();
  private saveCredsFns: Map<string, () => Promise<void>> = new Map();

  private async ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const sessions = await prisma.whatsAppSession.findMany({
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
    const session = await prisma.whatsAppSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (!session) return null;

    let status = session.status;
    const key = makeKey(userId, deviceId);
    if (status === "connected" && !this.sockets.has(key)) {
      status = this.connecting.has(key) ? "connecting" : "disconnected";
    }

    return { ...session, status };
  }

  async listDevices(userId: string) {
    await this.ensureInitialized().catch(() => {});
    const sessions = await prisma.whatsAppSession.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return sessions.map((s) => ({
      ...s,
      status: this.sockets.has(makeKey(userId, s.deviceId))
        ? s.status
        : this.connecting.has(makeKey(userId, s.deviceId))
          ? "connecting"
          : s.status,
    }));
  }

  async addDevice(userId: string, name: string, deviceId: string) {
    if (!deviceId) deviceId = crypto.randomUUID().slice(0, 8);
    const count = await prisma.whatsAppSession.count({ where: { userId } });
    if (count >= 4) throw new Error("Maximum 4 devices allowed");
    const existing = await prisma.whatsAppSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (existing) throw new Error("Device ID already exists");
    const session = await prisma.whatsAppSession.create({
      data: { userId, deviceId, name, status: "disconnected" },
    });
    return session;
  }

  async deleteDevice(userId: string, deviceId: string) {
    const key = makeKey(userId, deviceId);
    this.manualDisconnects.delete(key);
    this.knownSessions.delete(key);
    this.reconnectRetries.delete(key);
    const sock = this.sockets.get(key);
    if (sock) {
      sock.end(new Error("Device deleted"));
      this.sockets.delete(key);
    }
    this.connecting.delete(key);
    this.credsSavePromises.delete(key);
    this.saveCredsFns.delete(key);
    this.qrCache.delete(key);
    this.authStates.delete(key);
    this.contactsCache.delete(key);
    const timer = this.qrTimers.get(key);
    if (timer) clearTimeout(timer);
    this.qrTimers.delete(key);
    await prisma.baileysAuthCred.deleteMany({
      where: { userId, deviceId },
    }).catch(() => {});
    await prisma.whatsAppSession.deleteMany({
      where: { userId, deviceId },
    });
  }

  async startConnect(userId: string, timeoutMs = 0, deviceId = "main") {
    const key = makeKey(userId, deviceId);

    const existing = this.connecting.get(key);
    if (existing) {
      try {
        await existing;
      } catch {}
    }

    if (this.sockets.has(key)) return;

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

  async startPairing(userId: string, phone: string, deviceId = "main"): Promise<string | null> {
    const key = makeKey(userId, deviceId);
    this.pendingPairings.set(key, phone);
    try {
      await this.startConnect(userId, 30_000, deviceId);
      const code = this.qrCache.get(key);
      return code ?? null;
    } catch {
      this.pendingPairings.delete(key);
      return null;
    }
  }

  private async _doConnect(userId: string, deviceId: string, timeoutMs = 0) {
    const key = makeKey(userId, deviceId);

    const existing = this.sockets.get(key);
    if (existing) {
      existing.end(new Error("Reconnecting"));
      this.sockets.delete(key);
    }

    await prisma.whatsAppSession.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, deviceId, status: "connecting" },
      update: { status: "connecting", qrCode: null },
    });

    this.manualDisconnects.delete(key);
    this.qrCache.delete(key);
    const oldTimer = this.qrTimers.get(key);
    if (oldTimer) clearTimeout(oldTimer);
    this.qrTimers.delete(key);

    let state = this.authStates.get(key);
    let saveCreds = this.saveCredsFns.get(key);

    if (!state || !saveCreds) {
      const auth = await usePrismaAuthState(userId, deviceId);
      state = auth.state;
      saveCreds = auth.saveCreds;
      this.authStates.set(key, state);
      this.saveCredsFns.set(key, saveCreds);
    }

    const sock = makeWASocket({
      auth: state,
      version: await getLatestVersion(),
      logger: waLogger,
      emitOwnEvents: false,
    });

    sock.ev.on("creds.update", () => {
      const p = saveCreds().catch(() => {});
      this.credsSavePromises.set(key, p);
      p.finally(() => {
        if (this.credsSavePromises.get(key) === p) this.credsSavePromises.delete(key);
      });
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        await prisma.whatsAppSession.upsert({
          where: { userId_deviceId: { userId, deviceId } },
          create: { userId, deviceId, status: "connecting", qrCode: qr },
          update: { qrCode: qr },
        });
        this.qrCache.set(key, qr);
        const existingTimer = this.qrTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);
        this.qrTimers.set(
          key,
          setTimeout(() => {
            this.qrCache.delete(key);
            this.qrTimers.delete(key);
            this.disconnect(userId, deviceId).catch(() => {});
          }, QR_TIMEOUT_MS),
        );
      }

      if (connection === "open") {
        const timer = this.qrTimers.get(key);
        if (timer) clearTimeout(timer);
        this.qrTimers.delete(key);
        this.qrCache.delete(key);

        const phone = state.creds.me?.id
          ? state.creds.me.id.split(":")[0]
          : null;
        await prisma.whatsAppSession.upsert({
          where: { userId_deviceId: { userId, deviceId } },
          create: { userId, deviceId, status: "connected", phone, qrCode: null },
          update: { status: "connected", phone, qrCode: null },
        });
        this.sockets.set(key, sock);
        this.knownSessions.set(key, { userId, deviceId });
        this.reconnectRetries.delete(key);
        this._setupContactsStore(sock, key);
        this.retryPendingMessages(userId, deviceId, sock).catch(() => {});
      }

      if (connection === "close") {
        const timer = this.qrTimers.get(key);
        if (timer) clearTimeout(timer);
        this.qrTimers.delete(key);
        this.qrCache.delete(key);
        this.sockets.delete(key);
        this.contactsCache.delete(key);

        const isManual = this.manualDisconnects.has(key);
        if (!isManual) {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          if (statusCode !== DisconnectReason.loggedOut) {
            await (this.credsSavePromises.get(key) ?? Promise.resolve());
            await (this.saveCredsFns.get(key)?.() ?? Promise.resolve());
            const retries = this.reconnectRetries.get(key) || 0;
            if (retries < MAX_RECONNECT_RETRIES) {
              const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, retries);
              this.reconnectRetries.set(key, retries + 1);
              setTimeout(() => {
                this.startConnect(userId, 0, deviceId).catch(() => {});
              }, delay);
              return;
            }
          }
        }

        this.manualDisconnects.delete(key);
        this.reconnectRetries.delete(key);
        await prisma.whatsAppSession.upsert({
          where: { userId_deviceId: { userId, deviceId } },
          create: { userId, deviceId, status: "disconnected" },
          update: { status: "disconnected", qrCode: null },
        });
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (msg.key?.fromMe) continue;
        const jid = msg.key?.remoteJid;
        if (!jid) continue;

        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          msg.message?.documentMessage?.caption ||
          "";

        if (!body) continue;

        const record = await prisma.whatsAppMessage.create({
          data: {
            userId,
            deviceId,
            to: jid,
            from: state.creds.me?.id?.split(":")[0] || "unknown",
            messageId: msg.key.id || crypto.randomUUID(),
            body,
            status: "received",
          },
        });

        const autoReplied = await processAutoReply(userId, jid, deviceId).catch(() => false);
        if (autoReplied) return;

        const reply = await processChatbot(userId, jid, body).catch(() => null);
        if (reply) {
          this.sendMessage(userId, jid, reply, null, deviceId).catch(() => {});
          return;
        }

        deliverWebhook(userId, "message.received", {
          id: record.id,
          from: jid,
          body,
          timestamp: record.timestamp.toISOString(),
        }).catch(() => {});
      }
    });

    sock.ev.on("messages.update", async (updates) => {
      for (const { key, update } of updates) {
        if (update.status == null) continue;
        const messageId = key.id;
        if (!messageId) continue;
        const statusMap: Record<number, string> = {
          1: "sent",
          2: "delivered",
          3: "read",
        };
        const status = statusMap[update.status] || "sent";
        await prisma.whatsAppMessage.updateMany({
          where: { messageId, userId },
          data: { status },
        }).catch(() => {});
        deliverWebhook(userId, `message.${status}`, {
          messageId,
          status,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }
    });

    const pairingPhone = this.pendingPairings.get(key);
    if (pairingPhone) {
      this.pendingPairings.delete(key);
      try {
        const code = await sock.requestPairingCode(pairingPhone);
        const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
        await prisma.whatsAppSession.upsert({
          where: { userId_deviceId: { userId, deviceId } },
          create: { userId, deviceId, status: "connecting", qrCode: formattedCode },
          update: { qrCode: formattedCode },
        });
        this.qrCache.set(key, formattedCode);
      } catch {}
    }

    try {
      if (timeoutMs > 0) {
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            const onOpen = () => {
              sock.ev.off("connection.update", onUpdate);
              resolve();
            };
            const onUpdate = (u: any) => {
              if (u.connection === "open") onOpen();
            };
            sock.ev.on("connection.update", onUpdate);
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), timeoutMs)
          ),
        ]);
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === "Connection timeout";
      if (isTimeout) {
        sock.end(new Error("Connection timeout"));
      }
      if (this.sockets.has(key)) {
        this.sockets.delete(key);
      }
      await prisma.whatsAppSession.upsert({
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
          const hasSocket = this.sockets.has(key);
          const isConnecting = this.connecting.has(key);
          if (!hasSocket && !isConnecting) {
            this.startConnect(info.userId, 0, info.deviceId).catch(() => {});
          }
        }
      } catch {}
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private _setupContactsStore(sock: WASocket, key: string) {
    sock.ev.on("contacts.upsert", (contacts) => {
      for (const c of contacts) {
        const jid = c.id;
        if (!jid) continue;
        const existing = this.contactsCache.get(key) || new Map();
        existing.set(jid, {
          name: c.name || c.notify || "",
          number: jid.split("@")[0],
          jid,
        });
        this.contactsCache.set(key, existing);
      }
    });

    sock.ev.on("contacts.update", (updates) => {
      const existing = this.contactsCache.get(key);
      if (!existing) return;
      for (const u of updates) {
        const jid = u.id;
        if (!jid) continue;
        const contact = existing.get(jid);
        if (contact) {
          if (u.name) contact.name = u.name;
          if (u.notify) contact.name = u.notify;
        }
      }
    });
  }

  async getQR(userId: string, deviceId = "main"): Promise<string | null> {
    const key = makeKey(userId, deviceId);
    if (this.qrCache.has(key)) return this.qrCache.get(key) ?? null;
    await this.ensureInitialized().catch(() => {});
    const session = await prisma.whatsAppSession.findUnique({
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
    this.contactsCache.delete(key);
    const sock = this.sockets.get(key);
    if (sock) {
      sock.end(new Error("Manual disconnect"));
      this.sockets.delete(key);
    }
    this.connecting.delete(key);
    this.credsSavePromises.delete(key);
    this.saveCredsFns.delete(key);
    this.authStates.delete(key);
    await prisma.whatsAppSession.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, deviceId, status: "disconnected" },
      update: { status: "disconnected", qrCode: null },
    });
  }

  async getContacts(userId: string, deviceId = "main") {
    await this.ensureInitialized().catch(() => {});
    const key = makeKey(userId, deviceId);
    const cached = this.contactsCache.get(key);
    if (cached && cached.size > 0) {
      return Array.from(cached.values());
    }
    return [];
  }

  async getGroups(userId: string, deviceId = "main") {
    await this.ensureInitialized().catch(() => {});
    const key = makeKey(userId, deviceId);
    const sock = this.sockets.get(key);
    if (!sock) throw new Error("WhatsApp not connected");
    const groups = await sock.groupFetchAllParticipating();
    return Object.entries(groups).map(([id, g]) => ({
      id,
      name: g.subject || "Unnamed Group",
      participants: g.participants?.length || 0,
    }));
  }

  private async applyWatermark(userId: string, body: string): Promise<string> {
    try {
      const settings = await prisma.settings.findUnique({ where: { userId } });
      if (settings?.watermarkActive && settings?.watermarkText) {
        const watermark = settings.watermarkText
          .replace(/\{\{user_name\}\}/g, "")
          .replace(/\{\{business_name\}\}/g, "")
          .replace(/\{\{phone\}\}/g, "")
          .trim();
        if (watermark) {
          return body + `\n\n---\n${watermark}`;
        }
      }
    } catch {}
    return body;
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
    if (body) body = await this.applyWatermark(userId, body);

    const key = makeKey(userId, deviceId);
    const session = await prisma.whatsAppSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
    if (session?.status === "connected" || session?.status === "connecting") {
      await this.startConnect(userId, 0, deviceId).catch(() => {});
    }

    const sock = this.sockets.get(key);
    if (!sock) throw new Error("WhatsApp not connected");

    const jid = toJID(to);

    if (location) {
      await sock.sendMessage(jid, {
        location: {
          degreesLatitude: location.latitude,
          degreesLongitude: location.longitude,
        },
      });
    }

    if (media && media.base64) {
      const buffer = Buffer.from(media.base64, "base64");
      const mime = media.mimetype || "application/octet-stream";

      let content: any;
      if (mime.startsWith("image/")) {
        content = { image: buffer, caption: body || undefined };
      } else if (mime.startsWith("video/")) {
        content = { video: buffer, caption: body || undefined };
      } else if (mime.startsWith("audio/")) {
        content = { audio: buffer };
      } else {
        content = {
          document: buffer,
          fileName: media.filename || "file",
          caption: body || undefined,
        };
      }
      await sock.sendMessage(jid, content);
    } else if (body) {
      await sock.sendMessage(jid, { text: body });
    } else if (!location) {
      throw new Error("Nothing to send");
    }

    await prisma.whatsAppMessage.create({
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

  private async retryPendingMessages(userId: string, deviceId = "main", sock?: WASocket) {
    const pending = await prisma.whatsAppMessage.findMany({
      where: { userId, status: "pending" },
    });
    if (pending.length === 0) return;

    const key = makeKey(userId, deviceId);
    const waSocket = sock || this.sockets.get(key);
    if (!waSocket) return;

    for (const msg of pending) {
      try {
        const jid = toJID(msg.to);
        await waSocket.sendMessage(jid, { text: msg.body });
        await prisma.whatsAppMessage.update({
          where: { id: msg.id },
          data: { status: "sent" },
        });
      } catch {}
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
}

function getManagerInstance(): BaileysManager {
  if ((globalThis as any)[MANAGER_GLOBAL_KEY]) {
    return (globalThis as any)[MANAGER_GLOBAL_KEY] as BaileysManager;
  }
  const instance = new BaileysManager();
  (globalThis as any)[MANAGER_GLOBAL_KEY] = instance;
  return instance;
}

export const whatsappManager = getManagerInstance();
