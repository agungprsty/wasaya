import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authorization?.replace("Bearer ", "") !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.subscription.updateMany({
      data: { monthlySentCount: 0, lastMonthlyReset: new Date() },
    });

    return NextResponse.json({ ok: true, message: "Monthly counts reset at 01:00 on the 1st" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reset monthly counts" }, { status: 500 });
  }
}
