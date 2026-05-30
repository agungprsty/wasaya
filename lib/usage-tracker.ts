import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getTierLimits, getDailyLimit } from "@/lib/api-tier";

const WIB_OFFSET_MS = 7 * 3_600_000;
const DAILY_TTL_S = 48 * 3_600;
const MONTHLY_TTL_S = 62 * 86_400;

export function getPeriodKeysWIB(now: Date = new Date()): { daily: string; monthly: string } {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wib.getUTCDate()).padStart(2, "0");
  return { daily: `${y}-${m}-${d}`, monthly: `${y}-${m}` };
}

function redisDailyKey(userId: string, periodKey: string) {
  return `usage:harian:${userId}:${periodKey}`;
}

function redisMonthlyKey(userId: string, periodKey: string) {
  return `usage:bulanan:${userId}:${periodKey}`;
}

export async function trackUsage(userId: string, count = 1): Promise<void> {
  const { daily, monthly } = getPeriodKeysWIB();

  const dKey = redisDailyKey(userId, daily);
  const mKey = redisMonthlyKey(userId, monthly);

  await Promise.all([
    redis.incrby(dKey, count).then((v) => {
      if (v === count) redis.expire(dKey, DAILY_TTL_S).catch(() => {});
    }),
    redis.incrby(mKey, count).then((v) => {
      if (v === count) redis.expire(mKey, MONTHLY_TTL_S).catch(() => {});
    }),
  ]);

  await Promise.all([
    prisma.usageRecord.upsert({
      where: { userId_type_periodKey: { userId, type: "daily", periodKey: daily } },
      update: { count: { increment: count } },
      create: { userId, type: "daily", periodKey: daily, count },
    }),
    prisma.usageRecord.upsert({
      where: { userId_type_periodKey: { userId, type: "monthly", periodKey: monthly } },
      update: { count: { increment: count } },
      create: { userId, type: "monthly", periodKey: monthly, count },
    }),
  ]);
}

export async function getCurrentUsage(userId: string): Promise<{ daily: number; monthly: number }> {
  const { daily, monthly } = getPeriodKeysWIB();

  const dKey = redisDailyKey(userId, daily);
  const mKey = redisMonthlyKey(userId, monthly);

  let [dVal, mVal] = await Promise.all([
    redis.get(dKey).then((v) => (v ? parseInt(v, 10) : null)),
    redis.get(mKey).then((v) => (v ? parseInt(v, 10) : null)),
  ]);

  if (dVal === null || mVal === null) {
    const [dbDaily, dbMonthly] = await Promise.all([
      dVal === null
        ? prisma.usageRecord.findUnique({
            where: { userId_type_periodKey: { userId, type: "daily", periodKey: daily } },
          })
        : null,
      mVal === null
        ? prisma.usageRecord.findUnique({
            where: { userId_type_periodKey: { userId, type: "monthly", periodKey: monthly } },
          })
        : null,
    ]);

    if (dVal === null) {
      dVal = dbDaily?.count ?? 0;
      if (dVal > 0) {
        redis.setex(dKey, DAILY_TTL_S, dVal).catch(() => {});
      }
    }
    if (mVal === null) {
      mVal = dbMonthly?.count ?? 0;
      if (mVal > 0) {
        redis.setex(mKey, MONTHLY_TTL_S, mVal).catch(() => {});
      }
    }
  }

  return { daily: dVal, monthly: mVal };
}

export interface CheckResult {
  allowed: boolean;
  error: string | null;
  status: number | null;
  usage: { daily: number; monthly: number };
}

export async function checkLimit(
  userId: string,
  tier: string,
  userCreatedAt?: Date,
  additionalCount = 1,
): Promise<CheckResult> {
  const usage = await getCurrentUsage(userId);
  const limits = getTierLimits(tier);
  const dailyLimit = await getDailyLimit(tier, userCreatedAt ?? new Date());

  if (usage.daily + additionalCount > dailyLimit) {
    return {
      allowed: false,
      error: `Batas harian tercapai (${usage.daily}/${dailyLimit} pesan/hari).`,
      status: 429,
      usage,
    };
  }

  if (usage.monthly + additionalCount > limits.monthlyLimit) {
    return {
      allowed: false,
      error: `Batas bulanan tercapai (${usage.monthly}/${limits.monthlyLimit}).`,
      status: 429,
      usage,
    };
  }

  return { allowed: true, error: null, status: null, usage };
}

export async function checkAndTrack(
  userId: string,
  tier: string,
  userCreatedAt?: Date,
  additionalCount = 1,
): Promise<CheckResult> {
  const result = await checkLimit(userId, tier, userCreatedAt, additionalCount);
  if (!result.allowed) return result;

  await trackUsage(userId, additionalCount);
  result.usage.daily += additionalCount;
  result.usage.monthly += additionalCount;
  return result;
}

export async function syncUsageToDatabase(userId?: string): Promise<number> {
  const pattern = userId
    ? `usage:*:${userId}:*`
    : `usage:*`;

  let cursor = "0";
  let synced = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", "100");
    cursor = nextCursor;

    if (keys.length === 0) continue;

    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.get(key);
    }
    const values = await pipeline.exec();
    if (!values) continue;

    for (let i = 0; i < keys.length; i++) {
      const val = values[i];
      if (!val || val[1] === null) continue;

      const count = parseInt(val[1] as string, 10);
      if (count <= 0) continue;

      const parts = keys[i].split(":");
      const type = parts[1]; // "harian" or "bulanan"
      const recordUserId = parts[2];
      const periodKey = parts[3];

      const dbType = type === "harian" ? "daily" : "monthly";

      await prisma.usageRecord.upsert({
        where: {
          userId_type_periodKey: { userId: recordUserId, type: dbType, periodKey },
        },
        update: { count },
        create: { userId: recordUserId, type: dbType, periodKey, count },
      });
      synced++;
    }
  } while (cursor !== "0");

  return synced;
}
