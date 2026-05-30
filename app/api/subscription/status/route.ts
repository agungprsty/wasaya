import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    const subscription = await prisma.subscription.findUnique({ where: { userId: user!.userId } });
    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const planConfig = PLANS[subscription.plan as keyof typeof PLANS] || PLANS.FREE;

    return NextResponse.json({
      plan: subscription.plan,
      tier: subscription.tier,
      planExpiresAt: subscription.planExpiresAt,
      isActive: subscription.planExpiresAt ? subscription.planExpiresAt > new Date() : subscription.plan === "FREE",
      limits: planConfig,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
