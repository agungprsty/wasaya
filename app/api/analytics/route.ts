import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const days = Math.min(30, Math.max(1, parseInt(searchParams.get("days") || "7")));

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const messages = await prisma.whatsAppMessage.findMany({
    where: {
      userId: user!.userId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
  });

  // Daily aggregation
  const dailyMap = new Map<string, { sent: number; delivered: number; failed: number; received: number }>();
  const hourCount = new Array(24).fill(0);
  const recipientCount = new Map<string, number>();

  for (const msg of messages) {
    const day = msg.createdAt.toISOString().slice(0, 10);
    if (!dailyMap.has(day)) {
      dailyMap.set(day, { sent: 0, delivered: 0, failed: 0, received: 0 });
    }
    const d = dailyMap.get(day)!;
    if (msg.status === "sent") d.sent++;
    else if (msg.status === "delivered") d.delivered++;
    else if (msg.status === "failed") d.failed++;
    else if (msg.status === "received") d.received++;

    hourCount[msg.createdAt.getHours()]++;
    if (msg.to) {
      recipientCount.set(msg.to, (recipientCount.get(msg.to) || 0) + 1);
    }
  }

  const daily = Array.from(dailyMap.entries()).map(([date, counts]) => ({ date, ...counts }));

  // Fill missing days with zeroes
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    if (!dailyMap.has(key)) {
      daily.push({ date: key, sent: 0, delivered: 0, failed: 0, received: 0 });
    }
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));

  const total = messages.length;
  const totalSent = messages.filter((m) => m.from === "me" && (m.status === "sent" || m.status === "delivered")).length;
  const totalSentAttempts = messages.filter((m) => m.from === "me").length;
  const successRate = totalSentAttempts > 0 ? Math.round((totalSent / totalSentAttempts) * 100) : 0;

  const busiestHour = hourCount.indexOf(Math.max(...hourCount));

  let topRecipient = "";
  let topRecipientCount = 0;
  for (const [to, count] of recipientCount) {
    if (count > topRecipientCount) {
      topRecipientCount = count;
      topRecipient = to;
    }
  }

  return NextResponse.json({
    daily,
    summary: {
      total,
      totalSent,
      totalFailed: messages.filter((m) => m.from === "me" && m.status === "failed").length,
      totalReceived: messages.filter((m) => m.status === "received").length,
      successRate,
      busiestHour,
      topRecipient: topRecipient || null,
      topRecipientCount: topRecipientCount || 0,
    },
  });
}
