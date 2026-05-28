import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whatsappManager } from "@/lib/whatsapp";
import { requireUser } from "@/lib/api-auth";
import crypto from "crypto";

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

  // System-wide trigger via CRON_SECRET
  if (cronSecret && internalSecret && cronSecret === internalSecret) {
    // Process all users
  } else {
    // User-triggered via session (from page load)
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

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        await whatsappManager.sendMessage(msg.userId, recipient.to, msg.body);
        sent++;
      } catch (err: any) {
        if ((err.message || "").includes("not connected")) {
          await prisma.whatsAppMessage.create({
            data: {
              userId: msg.userId,
              to: recipient.to,
              from: "gateway",
              messageId: crypto.randomUUID(),
              body: msg.body,
              status: "pending",
            },
          });
          sent++;
        } else {
          failed++;
        }
      }
      // Rate limit: 1 msg per 1.2s
      await new Promise((r) => setTimeout(r, 1200));
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
