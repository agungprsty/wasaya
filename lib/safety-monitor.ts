import { prisma } from "@/lib/prisma";

export type SafetyLevel = "normal" | "caution" | "danger" | "quarantine";

interface SafetyStatus {
  level: SafetyLevel;
  violations: number;
  lastViolationAt: number;
  slowFactor: number;
}

interface ErrorRecord {
  time: number;
  code: number;
}

const SAFETY_GLOBAL_KEY = "__safety_monitor_instance__";

export class SafetyMonitor {
  private errorHistory: Map<string, ErrorRecord[]> = new Map();
  private statusCache: Map<string, SafetyStatus> = new Map();

  private key(userId: string, deviceId: string): string {
    return `${userId}_${deviceId}`;
  }

  private defaultStatus(): SafetyStatus {
    return { level: "normal", violations: 0, lastViolationAt: 0, slowFactor: 1 };
  }

  private getSlowFactor(level: SafetyLevel): number {
    switch (level) {
      case "caution": return 2;
      case "danger": return 3;
      case "quarantine": return Infinity;
      default: return 1;
    }
  }

  private evaluateLevel(recent: ErrorRecord[]): SafetyLevel {
    const now = Date.now();
    const fiveMinAgo = now - 300_000;
    const tenMinAgo = now - 600_000;

    const errors5m = recent.filter((e) => e.time > fiveMinAgo);
    const errors10m = recent.filter((e) => e.time > tenMinAgo);

    const hasLoggedOut = recent.some((e) => e.code === 401);
    if (hasLoggedOut) return "quarantine";

    const has429 = recent.some((e) => e.code === 429);
    if (has429) return "danger";

    const disconnects = recent.filter((e) => e.code === 0 || e.code === 1);
    if (disconnects.length > 2 && recent.length > 3) return "quarantine";

    const timeouts = recent.filter((e) => e.code === 408);
    if (timeouts.length > 2 && errors10m.length > 2) return "danger";

    if (errors5m.length > 3) return "caution";

    return "normal";
  }

  async recordError(userId: string, deviceId: string, errorCode: number): Promise<SafetyLevel> {
    const k = this.key(userId, deviceId);
    const now = Date.now();

    const history = this.errorHistory.get(k) || [];
    history.push({ time: now, code: errorCode });

    const cutoff = now - 3_600_000;
    const recent = history.filter((e) => e.time > cutoff);
    this.errorHistory.set(k, recent);

    const level = this.evaluateLevel(recent);
    const status: SafetyStatus = {
      level,
      violations: recent.length,
      lastViolationAt: now,
      slowFactor: this.getSlowFactor(level),
    };
    this.statusCache.set(k, status);

    if (level === "quarantine") {
      await prisma.whatsAppSession.updateMany({
        where: { userId, deviceId },
        data: { isQuarantined: true, lastViolationAt: new Date(now), safetyViolations: recent.length },
      }).catch(() => {});
    } else if (recent.length > 0) {
      await prisma.whatsAppSession.updateMany({
        where: { userId, deviceId },
        data: { safetyViolations: recent.length, lastViolationAt: new Date(now) },
      }).catch(() => {});
    }

    return level;
  }

  getLevel(userId: string, deviceId: string): SafetyLevel {
    return this.statusCache.get(this.key(userId, deviceId))?.level ?? "normal";
  }

  getSlowFactorForUser(userId: string, deviceId: string): number {
    return this.statusCache.get(this.key(userId, deviceId))?.slowFactor ?? 1;
  }

  async isQuarantined(userId: string, deviceId: string): Promise<boolean> {
    const cached = this.statusCache.get(this.key(userId, deviceId));
    if (cached?.level === "quarantine") return true;
    const session = await prisma.whatsAppSession.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
      select: { isQuarantined: true },
    });
    return session?.isQuarantined ?? false;
  }

  async checkOutboundRatio(userId: string): Promise<{ ratio: number; level: SafetyLevel }> {
    const sessions = await prisma.whatsAppSession.findMany({
      where: { userId },
      select: { outboundCount: true, inboundCount: true },
    });

    const outbound = sessions.reduce((s, x) => s + (x.outboundCount ?? 0), 0);
    const inbound = sessions.reduce((s, x) => s + (x.inboundCount ?? 0), 0);
    const ratio = inbound > 0 ? outbound / inbound : outbound;

    const sub = await prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true },
    });
    const tier = sub?.tier || "free";

    const thresholds: Record<string, number> = { free: 10, pro: 15, enterprise: 20 };
    const threshold = thresholds[tier] || 10;
    const level: SafetyLevel = ratio > threshold ? "danger" : ratio > threshold * 0.8 ? "caution" : "normal";

    return { ratio, level };
  }

  async pauseUser(userId: string): Promise<void> {
    await prisma.whatsAppSession.updateMany({
      where: { userId },
      data: { isQuarantined: true },
    }).catch(() => {});
  }

  async resumeUser(userId: string, deviceId: string): Promise<void> {
    await prisma.whatsAppSession.updateMany({
      where: { userId, deviceId },
      data: { isQuarantined: false },
    }).catch(() => {});
    this.statusCache.delete(this.key(userId, deviceId));
    this.errorHistory.delete(this.key(userId, deviceId));
  }
}

function getSafetyMonitorInstance(): SafetyMonitor {
  if ((globalThis as any)[SAFETY_GLOBAL_KEY]) {
    return (globalThis as any)[SAFETY_GLOBAL_KEY] as SafetyMonitor;
  }
  const instance = new SafetyMonitor();
  (globalThis as any)[SAFETY_GLOBAL_KEY] = instance;
  return instance;
}

export const safetyMonitor = getSafetyMonitorInstance();
