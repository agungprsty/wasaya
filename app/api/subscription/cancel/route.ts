import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { cancelTransaction as midtransCancel } from "@/lib/midtrans";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({ where: { orderId } });
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (transaction.userId !== user!.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (transaction.status !== "order" && transaction.status !== "pending") {
      return NextResponse.json({ error: "Transaction cannot be cancelled" }, { status: 409 });
    }

    if (transaction.status === "pending") {
      await midtransCancel(orderId);
    }

    await prisma.transaction.update({
      where: { orderId },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
