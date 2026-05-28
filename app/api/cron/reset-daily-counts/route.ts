import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authorization?.replace("Bearer ", "") !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.whatsAppSession.updateMany({
      data: { dailyCount: 0 },
    });

    await prisma.subscription.updateMany({
      data: { dailySentCount: 0, lastDailyReset: new Date() },
    });

    return NextResponse.json({ ok: true, message: "Daily counts reset at 00:00" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reset daily counts" }, { status: 500 });
  }
}
