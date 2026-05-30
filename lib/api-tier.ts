import { prisma } from "@/lib/prisma";
import { PLANS, getPlanLimits } from "@/lib/plans";

export type Tier = "free" | "pro" | "enterprise";

export interface TierLimits {
  dailyLimit: number;
  monthlyLimit: number;
  concurrency: number;
  adminSlots: number;
  broadcast: boolean;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { dailyLimit: 50, monthlyLimit: PLANS.FREE.maxMessagesPerMonth, concurrency: PLANS.FREE.concurrency, adminSlots: PLANS.FREE.adminSlots, broadcast: true },
  pro: { dailyLimit: 200, monthlyLimit: PLANS.PRO.maxMessagesPerMonth, concurrency: PLANS.PRO.concurrency, adminSlots: PLANS.PRO.adminSlots, broadcast: true },
  enterprise: { dailyLimit: Infinity, monthlyLimit: Infinity, concurrency: PLANS.ENTERPRISE.concurrency, adminSlots: PLANS.ENTERPRISE.adminSlots, broadcast: true },
};

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier as Tier] || TIER_LIMITS.free;
}

export function getMonthlyLimit(tier: string): number {
  return TIER_LIMITS[tier as Tier]?.monthlyLimit ?? TIER_LIMITS.free.monthlyLimit;
}

export async function getUserTier(userId: string): Promise<Tier> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return (sub?.tier as Tier) || "free";
}

export async function getDailyLimit(tier: string, userCreatedAt: Date): Promise<number> {
  if (tier === "enterprise") return Infinity;
  const ageDays = (Date.now() - userCreatedAt.getTime()) / 86400000;
  const base: Record<string, number[]> = {
    free: [50, 50, 50],
    pro: [200, 200, 200],
  };
  const limits = base[tier] || base.free;
  if (ageDays < 7) return limits[0];
  if (ageDays < 30) return limits[1];
  return limits[2];
}
