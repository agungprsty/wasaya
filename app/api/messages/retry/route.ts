import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";
import { getUserTier, getTierLimits, getDailyLimit } from "@/lib/api-tier";
import { getUsage } from "@/lib/usage";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Array of message IDs required" }, { status: 400 });
  }

  const messages = await prisma.whatsAppMessage.findMany({
    where: { id: { in: ids }, userId: user!.userId },
  });

  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages found" }, { status: 404 });
  }

  const [usage, dbUser] = await Promise.all([
    getUsage(user!.userId),
    prisma.user.findUnique({ where: { id: user!.userId }, select: { createdAt: true } }),
  ]);
  const tier = await getUserTier(user!.userId);
  const limits = getTierLimits(tier);
  const dailyLimit = await getDailyLimit(tier, dbUser?.createdAt ?? new Date());
  if (usage.daily + messages.length > dailyLimit) {
    return NextResponse.json(
      {
        error: `Batas harian tercapai (${usage.daily}/${dailyLimit}).`,
      },
      { status: 429 },
    );
  }
  if (usage.monthly + messages.length > limits.monthlyLimit) {
    return NextResponse.json(
      {
        error: `Batas bulanan tercapai (${usage.monthly}/${limits.monthlyLimit}).`,
        upgrade_url: "/pricing",
      },
      { status: 429 },
    );
  }

  const results: { id: string; status: string }[] = [];

  for (const msg of messages) {
    try {
      await whatsappManager.sendMessage(user!.userId, msg.to, msg.body);
      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: { status: "sent" },
      });
      results.push({ id: msg.id, status: "sent" });
    } catch (err: any) {
      const errMsg = err.message || "";
      if (errMsg.includes("not connected") || errMsg.includes("disconnected")) {
        results.push({ id: msg.id, status: "pending" });
      } else {
        results.push({ id: msg.id, status: "failed" });
        await prisma.whatsAppMessage.update({
          where: { id: msg.id },
          data: { status: "failed" },
        });
      }
    }
  }

  return NextResponse.json({ results });
}
