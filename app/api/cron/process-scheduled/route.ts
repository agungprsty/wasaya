import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whatsappManager } from "@/lib/whatsapp";
import { requireUser } from "@/lib/api-auth";
import crypto from "crypto";

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

    const finalStatus = failed === recipients.length ? "failed" : sent > 0 ? "sent" : "failed";
    await prisma.scheduledMessage.update({
      where: { id: msg.id },
      data: { status: finalStatus },
    });

    results.push({ id: msg.id, status: finalStatus, sent, failed });
  }

  return NextResponse.json({ processed: results.length, results });
}
