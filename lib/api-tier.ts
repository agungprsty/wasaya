import { prisma } from "@/lib/prisma";

export type Tier = "free" | "pro" | "enterprise";

export interface TierLimits {
  dailyLimit: number;
  monthlyLimit: number;
  concurrency: number;
  adminSlots: number;
  broadcast: boolean;
}

const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { dailyLimit: 50, monthlyLimit: 500, concurrency: 1, adminSlots: 0, broadcast: false },
  pro: { dailyLimit: 200, monthlyLimit: 5_000, concurrency: 2, adminSlots: 3, broadcast: true },
  enterprise: { dailyLimit: Infinity, monthlyLimit: Infinity, concurrency: 10, adminSlots: Infinity, broadcast: true },
};

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier as Tier] || TIER_LIMITS.free;
}

export async function getUserTier(userId: string): Promise<Tier> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return (sub?.tier as Tier) || "free";
}

export async function getDailyLimit(tier: string, userCreatedAt: Date): Promise<number> {
  if (tier === "enterprise") return Infinity;
  const ageDays = (Date.now() - userCreatedAt.getTime()) / 86400000;
  const base: Record<string, number[]> = {
    free: [20, 35, 50],
    pro: [50, 100, 200],
  };
  const limits = base[tier] || base.free;
  if (ageDays < 7) return limits[0];
  if (ageDays < 30) return limits[1];
  return limits[2];
}
