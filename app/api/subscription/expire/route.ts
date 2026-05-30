import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [subResult, txResult] = await Promise.all([
      prisma.subscription.updateMany({
        where: { plan: "PRO", planExpiresAt: { lte: new Date() } },
        data: { plan: "FREE", tier: "free", planExpiresAt: null },
      }),
      prisma.transaction.updateMany({
        where: { status: { in: ["order", "pending"] }, expiredAt: { lte: new Date() } },
        data: { status: "expired" },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      expiredSubscriptions: subResult.count,
      expiredOrders: txResult.count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
