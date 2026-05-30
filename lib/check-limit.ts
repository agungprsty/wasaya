import { prisma } from "@/lib/prisma";
import { PLANS, PlanTier, getPlanLimits } from "@/lib/plans";

export interface LimitResult {
  ok: boolean;
  message?: string;
}

export async function checkMessageLimit(userId: string, additionalCount = 1): Promise<LimitResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { ok: false, message: "Subscription not found" };

  const plan = sub.plan as PlanTier;

  if (plan !== "FREE" && sub.planExpiresAt && sub.planExpiresAt < new Date()) {
    return { ok: false, message: "Your plan has expired. Renew to continue sending." };
  }

  const limits = getPlanLimits(plan);
  if (limits.maxMessagesPerMonth === Infinity) return { ok: true };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const count = await prisma.whatsAppMessage.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
      status: { in: ["sent", "delivered"] },
    },
  });

  if (count + additionalCount > limits.maxMessagesPerMonth) {
    return {
      ok: false,
      message: `Monthly message limit reached (${count + additionalCount}/${limits.maxMessagesPerMonth})`,
    };
  }

  return { ok: true };
}

export async function checkDeviceLimit(userId: string): Promise<LimitResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { ok: false, message: "Subscription not found" };

  const plan = sub.plan as PlanTier;

  if (plan !== "FREE" && sub.planExpiresAt && sub.planExpiresAt < new Date()) {
    return { ok: false, message: "Your plan has expired." };
  }

  const limits = getPlanLimits(plan);
  if (limits.maxDevices === Infinity) return { ok: true };

  const connected = await prisma.whatsAppSession.count({
    where: { userId, status: "connected" },
  });

  if (connected >= limits.maxDevices) {
    return {
      ok: false,
      message: `Device limit reached (${connected}/${limits.maxDevices})`,
    };
  }

  return { ok: true };
}

export async function checkContactLimit(userId: string): Promise<LimitResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { ok: false, message: "Subscription not found" };

  const plan = sub.plan as PlanTier;

  if (plan !== "FREE" && sub.planExpiresAt && sub.planExpiresAt < new Date()) {
    return { ok: false, message: "Your plan has expired." };
  }

  const limits = getPlanLimits(plan);
  if (limits.maxContacts === Infinity) return { ok: true };

  const count = await prisma.contact.count({ where: { userId } });

  if (count >= limits.maxContacts) {
    return {
      ok: false,
      message: `Contact limit reached (${count}/${limits.maxContacts})`,
    };
  }

  return { ok: true };
}

export async function checkTemplateLimit(userId: string): Promise<LimitResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { ok: false, message: "Subscription not found" };

  const plan = sub.plan as PlanTier;

  if (plan !== "FREE" && sub.planExpiresAt && sub.planExpiresAt < new Date()) {
    return { ok: false, message: "Your plan has expired." };
  }

  const limits = getPlanLimits(plan);
  if (limits.maxTemplates === Infinity) return { ok: true };

  const count = await prisma.messageTemplate.count({ where: { userId } });

  if (count >= limits.maxTemplates) {
    return {
      ok: false,
      message: `Template limit reached (${count}/${limits.maxTemplates})`,
    };
  }

  return { ok: true };
}

export async function requirePlan(userId: string, feature: string): Promise<LimitResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { ok: false, message: "Subscription not found" };

  const plan = sub.plan as PlanTier;

  if (plan === "FREE") return { ok: true };

  if (plan !== "FREE" && sub.planExpiresAt && sub.planExpiresAt < new Date()) {
    return { ok: false, message: "Your plan has expired. Renew to access Pro features." };
  }

  return { ok: true };
}
