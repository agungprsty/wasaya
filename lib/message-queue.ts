import { prisma } from "@/lib/prisma";
import { Queue, Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { whatsappManager } from "@/lib/whatsapp";
import { getTierLimits } from "@/lib/api-tier";
import { safetyMonitor } from "@/lib/safety-monitor";

export interface SendJobData {
  userId: string;
  tier: string;
  jid: string;
  body?: string;
  media?: { base64: string; mimetype: string; filename?: string } | null;
  deviceId: string;
  location?: { latitude: number; longitude: number; title?: string } | null;
}

const TIER_PRIORITY: Record<string, number> = {
  enterprise: 1,
  pro: 2,
  free: 3,
};

export const sendQueue = new Queue<SendJobData>("wa-send", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function enqueueMessage(
  data: SendJobData,
  options?: { dedupId?: string },
): Promise<Job<SendJobData, any, string>> {
  return sendQueue.add(`send:${data.jid}`, data, {
    priority: TIER_PRIORITY[data.tier] || 3,
    deduplication: options?.dedupId
      ? { id: options.dedupId, ttl: 60000 }
      : undefined,
  }) as any;
}

const TIER_CONCURRENCY: Record<string, number> = {
  enterprise: 10,
  pro: 2,
  free: 1,
};

const tierRunning: Record<string, number> = {
  enterprise: 0,
  pro: 0,
  free: 0,
};

const PER_CONVERSATION_LIMITS: Record<string, { maxPerWindow: number; windowMinutes: number }> = {
  free: { maxPerWindow: 5, windowMinutes: 10 },
  pro: { maxPerWindow: 10, windowMinutes: 5 },
  enterprise: { maxPerWindow: 20, windowMinutes: 1 },
};

async function checkThrottle(userId: string, jid: string, tier: string): Promise<boolean> {
  if (tier !== "free") {
    const settings = await prisma.settings.findUnique({ where: { userId } });
    const adminNumbers = (settings?.adminNumbers as string[]) || [];
    const normalizedJid = jid.split("@")[0];
    if (adminNumbers.includes(normalizedJid)) return true;
  }

  const limit = PER_CONVERSATION_LIMITS[tier] || PER_CONVERSATION_LIMITS.free;
  const key = `throttle:${userId}:${jid}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, limit.windowMinutes * 60);
  return count <= limit.maxPerWindow;
}

export function startWorker(): Worker {
  const worker = new Worker<SendJobData>(
    "wa-send",
    async (job) => {
      const { userId, tier, jid, body, media, deviceId, location } = job.data;

      const quarantined = await safetyMonitor.isQuarantined(userId, deviceId || "main");
      if (quarantined) {
        throw new Error(`User ${userId} is quarantined`);
      }

      const maxConcurrent = TIER_CONCURRENCY[tier] || 1;

      if (tierRunning[tier] >= maxConcurrent) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (tierRunning[tier] >= maxConcurrent) {
          throw new Error(`Tier ${tier} concurrency limit reached`);
        }
      }

      tierRunning[tier]++;

      try {
        const allowed = await checkThrottle(userId, jid, tier);
        if (!allowed) {
          throw new Error("Per-conversation limit reached");
        }

        await whatsappManager.sendMessage(userId, jid, body || "", media || null, deviceId, location || null);
      } finally {
        tierRunning[tier]--;
      }
    },
    {
      connection: redis as any,
      concurrency: 10,
      limiter: {
        max: 5,
        duration: 1000,
      },
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[Queue] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
