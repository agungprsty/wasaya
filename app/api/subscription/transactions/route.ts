import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

async function expireOverdueOrders(userId: string) {
  await prisma.transaction.updateMany({
    where: {
      userId,
      status: { in: ["order", "pending"] },
      expiredAt: { lte: new Date() },
    },
    data: { status: "expired" },
  });
}

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    await expireOverdueOrders(user!.userId);

    const transactions = await prisma.transaction.findMany({
      where: { userId: user!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: transactions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
