import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { chargeVA, chargeQRIS } from "@/lib/midtrans";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    const { orderId, paymentType, bank } = await request.json();

    if (!orderId || !paymentType) {
      return NextResponse.json({ error: "orderId and paymentType are required" }, { status: 400 });
    }

    if (paymentType !== "bank_transfer" && paymentType !== "qris") {
      return NextResponse.json({ error: "paymentType must be bank_transfer or qris" }, { status: 400 });
    }

    if (paymentType === "bank_transfer" && !bank) {
      return NextResponse.json({ error: "bank is required for bank_transfer" }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({ where: { orderId } });
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.userId !== user!.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (transaction.status !== "order") {
      return NextResponse.json({ error: "Transaction already processed or expired" }, { status: 409 });
    }

    if (transaction.expiredAt && transaction.expiredAt <= new Date()) {
      await prisma.transaction.update({ where: { orderId }, data: { status: "expired" } });
      return NextResponse.json({ error: "Order has expired. Please create a new order." }, { status: 410 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { email: true },
    });

    const amount = transaction.amount;
    let chargeResult;
    if (paymentType === "bank_transfer") {
      chargeResult = await chargeVA(orderId, amount, bank, {
        email: userData?.email || "",
      });
    } else {
      chargeResult = await chargeQRIS(orderId, amount, {
        email: userData?.email || "",
      });
    }

    if (chargeResult.status_code !== "201") {
      return NextResponse.json({ error: chargeResult.status_message || "Payment failed" }, { status: 502 });
    }

    const vaNumber =
      chargeResult.va_numbers?.[0]?.va_number ||
      chargeResult.permata_va_number ||
      chargeResult.bill_key ||
      null;

    await prisma.transaction.update({
      where: { orderId },
      data: {
        status: "pending",
        paymentType,
        bank: paymentType === "bank_transfer" ? bank : null,
        vaNumber,
        qrCodeUrl: chargeResult.actions?.find((a: { name: string }) => a.name === "generate-qr-code")?.url || null,
        midtransTxId: chargeResult.transaction_id,
      },
    });

    return NextResponse.json({
      orderId,
      paymentType,
      vaNumber,
      qrCodeUrl: chargeResult.actions?.find((a: { name: string }) => a.name === "generate-qr-code")?.url || null,
      bank: paymentType === "bank_transfer" ? bank : null,
      amount,
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
