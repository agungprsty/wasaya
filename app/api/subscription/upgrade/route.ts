import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { chargeVA, chargeQRIS } from "@/lib/midtrans";
import { PLANS } from "@/lib/plans";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { plan, paymentType, bank } = body;

    if (!plan || !paymentType) {
      return NextResponse.json({ error: "plan and paymentType are required" }, { status: 400 });
    }

    const planKey = plan.toUpperCase();
    if (planKey !== "PRO") {
      return NextResponse.json({ error: "Only Pro plan is available for self-upgrade" }, { status: 400 });
    }

    if (paymentType !== "bank_transfer" && paymentType !== "qris") {
      return NextResponse.json({ error: "paymentType must be bank_transfer or qris" }, { status: 400 });
    }

    if (paymentType === "bank_transfer" && !bank) {
      return NextResponse.json({ error: "bank is required for bank_transfer" }, { status: 400 });
    }

    const planConfig = PLANS[planKey as keyof typeof PLANS];
    if (!planConfig) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const existingSub = await prisma.subscription.findUnique({ where: { userId: user!.userId } });
    if (existingSub?.plan === "PRO" && existingSub.planExpiresAt && existingSub.planExpiresAt > new Date()) {
      return NextResponse.json({ error: "You already have an active Pro subscription" }, { status: 409 });
    }

    const orderId = `WA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const userData = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { email: true },
    });

    let chargeResult;
    if (paymentType === "bank_transfer") {
      chargeResult = await chargeVA(orderId, planConfig.price, bank, {
        email: userData?.email || "",
      });
    } else {
      chargeResult = await chargeQRIS(orderId, planConfig.price, {
        email: userData?.email || "",
      });
    }

    if (chargeResult.status_code !== "201") {
      return NextResponse.json({ error: chargeResult.status_message || "Payment initiation failed" }, { status: 502 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: user!.userId,
        orderId,
        plan: "PRO",
        amount: planConfig.price,
        paymentType,
        bank: paymentType === "bank_transfer" ? bank : null,
        vaNumber: chargeResult.va_numbers?.[0]?.va_number || null,
        qrCodeUrl: chargeResult.actions?.find((a: { name: string }) => a.name === "generate-qr-code")?.url || null,
        status: "pending",
        midtransTxId: chargeResult.transaction_id,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      orderId: transaction.orderId,
      paymentType: transaction.paymentType,
      vaNumber: transaction.vaNumber,
      qrCodeUrl: transaction.qrCodeUrl,
      bank: transaction.bank,
      amount: transaction.amount,
      expiredAt: transaction.expiredAt,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

