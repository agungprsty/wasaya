import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { PLANS, SERVICE_FEE } from "@/lib/plans";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    const { plan } = await request.json();

    if (!plan || plan.toUpperCase() !== "PRO") {
      return NextResponse.json({ error: "Only Pro plan is available" }, { status: 400 });
    }

    const planConfig = PLANS.PRO;
    const existingSub = await prisma.subscription.findUnique({ where: { userId: user!.userId } });
    if (existingSub?.plan === "PRO" && existingSub.planExpiresAt && existingSub.planExpiresAt > new Date()) {
      return NextResponse.json({ error: "You already have an active Pro subscription" }, { status: 409 });
    }

    await prisma.transaction.updateMany({
      where: { userId: user!.userId, status: { in: ["order", "pending"] }, expiredAt: { lte: new Date() } },
      data: { status: "expired" },
    });

    const pendingOrder = await prisma.transaction.findFirst({
      where: { userId: user!.userId, status: { in: ["order", "pending"] } },
    });
    if (pendingOrder) {
      return NextResponse.json({
        error: "You already have an unpaid order. Please complete or cancel it first.",
        existingOrderId: pendingOrder.orderId,
      }, { status: 409 });
    }

    const orderId = `WA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        userId: user!.userId,
        orderId,
        plan: "PRO",
        amount: planConfig.price + SERVICE_FEE,
        status: "order",
        expiredAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return NextResponse.json({ orderId: transaction.orderId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
