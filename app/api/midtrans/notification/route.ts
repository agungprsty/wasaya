import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyNotification } from "@/lib/midtrans";

export async function POST(request: NextRequest) {
  try {
    const body: Record<string, unknown> = await request.json();

    if (!verifyNotification(body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const orderId = body.order_id as string;
    const transactionStatus = body.transaction_status as string;
    const fraudStatus = body.fraud_status as string;

    const transaction = await prisma.transaction.findUnique({ where: { orderId } });
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    let status: string;
    if (transactionStatus === "capture") {
      if (fraudStatus === "accept") {
        status = "success";
      } else if (fraudStatus === "challenge") {
        status = "challenge";
      } else {
        status = "failed";
      }
    } else if (transactionStatus === "settlement") {
      status = "success";
    } else if (transactionStatus === "pending") {
      status = "pending";
    } else if (transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "expire") {
      status = "failed";
    } else {
      status = transactionStatus;
    }

    await prisma.transaction.update({
      where: { orderId },
      data: {
        status,
        paidAt: status === "success" ? new Date() : undefined,
      },
    });

    if (status === "success") {
      const plan = transaction.plan;
      const durationDays = 30;
      const planExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      await prisma.subscription.upsert({
        where: { userId: transaction.userId },
        update: { plan, tier: plan.toLowerCase(), planExpiresAt },
        create: {
          userId: transaction.userId,
          plan,
          tier: plan.toLowerCase(),
          planExpiresAt,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
