import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { validatePhone } from "@/lib/phone-utils";
import { getUserTier, getTierLimits } from "@/lib/api-tier";
import { checkAndTrack } from "@/lib/usage-tracker";
import { enqueueMessage } from "@/lib/message-queue";
import { toJID } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const rl = await rateLimit(user!.userId, "broadcast", 10, 60000);
  if (rl) return rl;

  const body = await request.json();

  const messages: { to: string; body: string; location?: { latitude: number; longitude: number } }[] = body.messages
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

  const deviceId = body.deviceId || "main";

  const tier = await getUserTier(user!.userId);
  const limits = getTierLimits(tier);
  if (!limits.broadcast) {
    return NextResponse.json(
      {
        error: "Fitur broadcast massal hanya tersedia di paket Pro.",
        upgrade_url: "/pricing",
      },
      { status: 403 },
    );
  }

  const results: { to: string; status: string; error?: string }[] = [];

  for (const { to, body: msgBody, location } of messages) {
    const limitCheck = await checkAndTrack(user!.userId, tier, undefined, 1);
    if (!limitCheck.allowed) {
      results.push({ to, status: "limit_exceeded" });
      continue;
    }

    try {
      const jid = toJID(to);
      await enqueueMessage({
        userId: user!.userId,
        tier,
        jid,
        body: msgBody,
        deviceId,
        location: location || null,
      });
      results.push({ to, status: "queued" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      results.push({ to, status: "failed", error: msg });
    }
  }

  const summary = {
    total: results.length,
    queued: results.filter((r) => r.status === "queued").length,
    limit_exceeded: results.filter((r) => r.status === "limit_exceeded").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  return NextResponse.json({ results, summary });
}
