import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { validatePhone } from "@/lib/phone-utils";
import { getUserTier, getTierLimits, getDailyLimit } from "@/lib/api-tier";
import { enqueueMessage } from "@/lib/message-queue";
import { getUsage } from "@/lib/usage";
import { toJID } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");

  const where: Record<string, string | undefined> = { userId: user!.userId };
  if (status && status !== "all") where.status = status;

  const [messages, total] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.whatsAppMessage.count({ where: where as any }),
  ]);

  return NextResponse.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const rl = rateLimit(user!.userId, "messages", 30, 60000);
  if (rl) return rl;

  const { to, body, media, deviceId, location } = await request.json();
  if (!to && !location) {
    return NextResponse.json({ error: "Recipient number is required" }, { status: 400 });
  }

  const tier = await getUserTier(user!.userId);
  const limits = getTierLimits(tier);

  const isBroadcast = Array.isArray(to) && to.length > 1;
  if (isBroadcast && !limits.broadcast) {
    return NextResponse.json(
      {
        error: "Fitur broadcast massal hanya tersedia di paket Pro.",
        upgrade_url: "/pricing",
      },
      { status: 403 },
    );
  }

  const recipients = Array.isArray(to) ? to : [to];
  const jids = recipients.map((r: string) => {
    if (r.includes("@")) return toJID(r);
    const phoneCheck = validatePhone(r);
    if (!phoneCheck.valid) throw new Error(`${r}: ${phoneCheck.error}`);
    return toJID(phoneCheck.normalized);
  });

  const [usage, dbUser] = await Promise.all([
    getUsage(user!.userId),
    prisma.user.findUnique({ where: { id: user!.userId }, select: { createdAt: true } }),
  ]);

  const dailyLimit = await getDailyLimit(tier, dbUser?.createdAt ?? new Date());
  if (usage.daily + jids.length > dailyLimit) {
    return NextResponse.json(
      {
        error: `Batas harian tercapai (${usage.daily}/${dailyLimit} pesan/hari). Lanjut bulan depan atau upgrade ke Pro untuk ${limits.monthlyLimit === 500 ? "5.000" : "lebih banyak"} pesan/bulan.`,
        upgrade_url: "/pricing",
      },
      { status: 429 },
    );
  }

  if (usage.monthly + jids.length > limits.monthlyLimit) {
    return NextResponse.json(
      {
        error: `Batas bulanan tercapai (${usage.monthly}/${limits.monthlyLimit}). Upgrade ke Pro untuk ${limits.monthlyLimit === 500 ? "5.000" : "lebih banyak"} pesan/bulan.`,
        upgrade_url: "/pricing",
      },
      { status: 429 },
    );
  }

  try {
    for (const jid of jids) {
      await enqueueMessage({
        userId: user!.userId,
        tier,
        jid,
        body: body || "",
        media: media || null,
        deviceId: deviceId || "main",
        location: location || null,
      });
    }

    return NextResponse.json({ ok: true, count: jids.length }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to queue message" }, { status: 500 });
  }
}
