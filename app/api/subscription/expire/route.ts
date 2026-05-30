import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await prisma.subscription.updateMany({
      where: {
        plan: "PRO",
        planExpiresAt: { lte: new Date() },
      },
      data: {
        plan: "FREE",
        tier: "free",
        planExpiresAt: null,
      },
    });

    return NextResponse.json({
      ok: true,
      expired: result.count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
