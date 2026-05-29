import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getUsage } from "@/lib/usage";

interface DailyData {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  received: number;
}

async function getDashboardAnalytics(userId: string, days: number) {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const messages = await prisma.whatsAppMessage.findMany({
    where: { userId, timestamp: { gte: startDate } },
    select: { timestamp: true, status: true, from: true, to: true },
  });

  const dateMap = new Map<string, DailyData>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    dateMap.set(dateStr, { date: dateStr, sent: 0, delivered: 0, failed: 0, received: 0 });
  }

  let total = 0;
  let totalSent = 0;
  let totalReceived = 0;
  let totalFailed = 0;

  const isFailed = (s: string) => s === "failed";
  const isReceived = (s: string) => s === "received";

  for (const msg of messages) {
    const dateStr = msg.timestamp.toISOString().split("T")[0];
    const entry = dateMap.get(dateStr);
    if (!entry) continue;

    total++;
    if (isFailed(msg.status)) {
      entry.failed++;
      totalFailed++;
    } else if (isReceived(msg.status)) {
      entry.received++;
      totalReceived++;
    } else {
      entry.sent++;
      totalSent++;
    }
  }

  const daily = Array.from(dateMap.values());
  const successRate = totalSent + totalFailed > 0
    ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
    : 100;

  const hourCounts = new Array(24).fill(0);
  for (const msg of messages) {
    hourCounts[msg.timestamp.getHours()]++;
  }
  const busiestHour = hourCounts.indexOf(Math.max(...hourCounts));

  const recipientMap = new Map<string, number>();
  for (const msg of messages) {
    if (isReceived(msg.status) && msg.from) {
      recipientMap.set(msg.from, (recipientMap.get(msg.from) ?? 0) + 1);
    }
  }
  let topRecipient: string | null = null;
  let topRecipientCount = 0;
  for (const [phone, count] of recipientMap) {
    if (count > topRecipientCount) {
      topRecipient = phone;
      topRecipientCount = count;
    }
  }

  return {
    daily,
    summary: { total, totalSent, totalFailed, totalReceived, successRate, busiestHour, topRecipient, topRecipientCount },
  };
}

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const metric = searchParams.get("metric");
  const days = parseInt(searchParams.get("days") || "7", 10);

  try {
    if (metric) {
      switch (metric) {
        case "daily-sends": {
          const dailySends = await getDailySends(user!.userId);
          return NextResponse.json({ metric: "daily-sends", data: dailySends });
        }
        case "monthly-usage": {
          const usage = await getMonthlyUsage(user!.userId);
          return NextResponse.json({ metric: "monthly-usage", data: usage });
        }
        case "outbound-inbound-ratio": {
          const ratio = await getOutboundInboundRatio(user!.userId);
          return NextResponse.json({ metric: "outbound-inbound-ratio", data: ratio });
        }
        case "failed-rate": {
          const failedRate = await getFailedRate(user!.userId);
          return NextResponse.json({ metric: "failed-rate", data: failedRate });
        }
        default:
          return NextResponse.json({ error: `Unknown metric: ${metric}` }, { status: 400 });
      }
    }

    const analytics = await getDashboardAnalytics(user!.userId, days);
    return NextResponse.json(analytics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

interface DailySendEntry {
  date: string;
  count: number;
}

async function getDailySends(userId: string): Promise<DailySendEntry[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const messages = await prisma.whatsAppMessage.findMany({
    where: {
      userId,
      status: { in: ["sent", "delivered", "read"] },
      timestamp: { gte: sevenDaysAgo },
    },
    select: {
      timestamp: true,
    },
  });

  const dateMap = new Map<string, number>();
  for (const msg of messages) {
    const dateStr = msg.timestamp.toISOString().split("T")[0];
    dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + 1);
  }

  const result: DailySendEntry[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    result.push({ date: dateStr, count: dateMap.get(dateStr) ?? 0 });
  }

  return result;
}

interface MonthlyUsageEntry {
  month: string;
  sent: number;
  limit: number;
  percentage: number;
}

async function getMonthlyUsage(userId: string): Promise<MonthlyUsageEntry> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true },
  });

  const tiers = { free: 500, pro: 5_000, enterprise: Infinity };
  const limit = tiers[(sub?.tier as keyof typeof tiers) || "free"] ?? 500;
  const usage = await getUsage(userId);
  const percentage = limit === Infinity ? 0 : Math.round((usage.monthly / limit) * 100);

  const currentMonth = new Date().toISOString().slice(0, 7);

  return {
    month: currentMonth,
    sent: usage.monthly,
    limit,
    percentage,
  };
}

interface RatioEntry {
  outbound: number;
  inbound: number;
  ratio: string;
}

async function getOutboundInboundRatio(userId: string): Promise<RatioEntry> {
  const sessions = await prisma.whatsAppSession.findMany({
    where: { userId },
    select: {
      outboundCount: true,
      inboundCount: true,
    },
  });

  const outbound = sessions.reduce((sum, s) => sum + (s.outboundCount ?? 0), 0);
  const inbound = sessions.reduce((sum, s) => sum + (s.inboundCount ?? 0), 0);
  const ratio = inbound > 0 ? `${outbound}:${inbound}` : `${outbound}:0`;

  return { outbound, inbound, ratio };
}

interface FailedRateEntry {
  total: number;
  failed: number;
  rate: number;
}

async function getFailedRate(userId: string): Promise<FailedRateEntry> {
  const total = await prisma.whatsAppMessage.count({
    where: { userId },
  });
  const failed = await prisma.whatsAppMessage.count({
    where: { userId, status: "failed" },
  });

  return {
    total,
    failed,
    rate: total > 0 ? Math.round((failed / total) * 100) : 0,
  };
}
