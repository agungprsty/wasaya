import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { humanDelay } from "@/lib/delay-engine";
import { getUserTier, getTierLimits } from "@/lib/api-tier";
import { enqueueMessage } from "@/lib/message-queue";
import { getUsage } from "@/lib/usage";
import { toJID } from "@/lib/whatsapp";

function calculateNextRun(msg: {
  scheduledAt: Date;
  recurrence: string | null;
  interval: number | null;
  cronExpr: string | null;
}): Date {
  const base = new Date(msg.scheduledAt);
  const interval = msg.interval || 1;

  if (msg.recurrence === "hourly") {
    return new Date(base.getTime() + interval * 60 * 60 * 1000);
  }
  if (msg.recurrence === "daily") {
    const next = new Date(base);
    next.setDate(next.getDate() + interval);
    return next;
  }
  if (msg.recurrence === "weekly") {
    const next = new Date(base);
    next.setDate(next.getDate() + interval * 7);
    return next;
  }
  if (msg.recurrence === "monthly") {
    const next = new Date(base);
    next.setMonth(next.getMonth() + interval);
    return next;
  }

  return base;
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  const internalSecret = process.env.CRON_SECRET;

  let targetUserId: string | null = null;

  if (cronSecret && internalSecret && cronSecret === internalSecret) {
  } else {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    targetUserId = auth.user!.userId;
  }

  const now = new Date();

  const where: any = {
    scheduledAt: { lte: now },
    status: "pending",
  };
  if (targetUserId) where.userId = targetUserId;

  const dueMessages = await prisma.scheduledMessage.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
  });

  if (!dueMessages.length) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: { id: string; status: string; sent: number; failed: number }[] = [];

  for (const msg of dueMessages) {
    const recipients = (msg.recipients as { to: string; name?: string }[]) || [];

    await prisma.scheduledMessage.update({
      where: { id: msg.id },
      data: { status: "processing" },
    });

    const tier = await getUserTier(msg.userId);
    const limits = getTierLimits(tier);

    const usage = await getUsage(msg.userId);

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      if (usage.monthly + sent >= limits.monthlyLimit) {
        failed++;
        continue;
      }

      try {
        const jid = toJID(recipient.to);
        await enqueueMessage({
          userId: msg.userId,
          tier,
          jid,
          body: msg.body,
          deviceId: "main",
        });
        sent++;
      } catch {
        failed++;
      }

      await humanDelay("broadcast");
    }

    const deliveryStatus = failed === recipients.length ? "failed" : sent > 0 ? "sent" : "failed";

    if (msg.isRecurring && deliveryStatus !== "failed") {
      const nextRun = calculateNextRun(msg);
      const newCount = msg.repeatCount + 1;
      const shouldStop =
        (msg.maxRepeats != null && newCount >= msg.maxRepeats) ||
        (msg.endDate && nextRun && nextRun > msg.endDate);

      if (shouldStop) {
        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: "completed", repeatCount: newCount },
        });
        results.push({ id: msg.id, status: "completed", sent, failed });
      } else {
        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: {
            status: "pending",
            repeatCount: newCount,
            nextRunAt: nextRun,
            scheduledAt: nextRun,
          },
        });
        results.push({ id: msg.id, status: "rescheduled", sent, failed });
      }
    } else {
      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: deliveryStatus },
      });
      results.push({ id: msg.id, status: deliveryStatus, sent, failed });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
