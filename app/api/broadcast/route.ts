import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { validatePhone } from "@/lib/phone-utils";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const rl = rateLimit(user!.userId, "broadcast", 10, 60000);
  if (rl) return rl;

  const body = await request.json();

  // Support both new format { messages: [{ to, body }] } and legacy { recipients, body }
  const messages: { to: string; body: string }[] = body.messages
    || (body.recipients?.length
      ? body.recipients.map((to: string) => ({ to, body: body.body }))
      : []);

  if (!messages.length) {
    return NextResponse.json({ error: "Recipients and message body are required" }, { status: 400 });
  }

  for (const msg of messages) {
    const phoneCheck = validatePhone(msg.to);
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: `Invalid phone: ${msg.to} - ${phoneCheck.error}` }, { status: 400 });
    }
  }

  const results: { to: string; status: string; error?: string }[] = [];
  let current = 0;

  for (const { to, body: msgBody } of messages) {
    current++;
    try {
      await whatsappManager.sendMessage(user!.userId, to, msgBody);
      results.push({ to, status: "sent" });
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("not connected")) {
        await prisma.whatsAppMessage.create({
          data: {
            userId: user!.userId,
            to,
            from: "gateway",
            messageId: crypto.randomUUID(),
            body: msgBody,
            status: "pending",
          },
        });
        results.push({ to, status: "pending" });
      } else {
        results.push({ to, status: "failed", error: msg });
      }
    }
    // Rate limit: 1 msg per 1.2s to avoid ban
    await new Promise((r) => setTimeout(r, 1200));
  }

  const summary = {
    total: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    pending: results.filter((r) => r.status === "pending").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  return NextResponse.json({ results, summary });
}