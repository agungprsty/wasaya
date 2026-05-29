import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getUsage } from "@/lib/usage";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  let settings = await prisma.settings.findUnique({ where: { userId: user!.userId } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { userId: user!.userId } });
  }

  let subscription = await prisma.subscription.findUnique({ where: { userId: user!.userId } });
  if (!subscription) {
    subscription = await prisma.subscription.create({ data: { userId: user!.userId } });
  }

  const device = await prisma.whatsAppSession.findUnique({
    where: { userId_deviceId: { userId: user!.userId, deviceId: "main" } },
    select: { proxyUrl: true, isQuarantined: true, safetyViolations: true },
  });

  const usage = await getUsage(user!.userId);

  return NextResponse.json({
    settings,
    subscription,
    usage,
    proxyUrl: device?.proxyUrl ?? null,
    isQuarantined: device?.isQuarantined ?? false,
    safetyViolations: device?.safetyViolations ?? 0,
  });
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { webhookUrl, webhookSecret, autoReplyText, autoReplyActive, watermarkText, watermarkActive, msPerChar, readDelayMs, typingEnabled, broadcastEnabled, concurrency, adminNumbers, safetyMode, enterpriseCustomSettings, proxyUrl } = await request.json();

  const data: Record<string, unknown> = {};
  if (webhookUrl !== undefined) data.webhookUrl = webhookUrl;
  if (webhookSecret !== undefined) data.webhookSecret = webhookSecret;
  if (autoReplyText !== undefined) data.autoReplyText = autoReplyText;
  if (autoReplyActive !== undefined) data.autoReplyActive = autoReplyActive;
  if (watermarkText !== undefined) data.watermarkText = watermarkText;
  if (watermarkActive !== undefined) data.watermarkActive = watermarkActive;
  if (msPerChar !== undefined) data.msPerChar = msPerChar;
  if (readDelayMs !== undefined) data.readDelayMs = readDelayMs;
  if (typingEnabled !== undefined) data.typingEnabled = typingEnabled;
  if (broadcastEnabled !== undefined) data.broadcastEnabled = broadcastEnabled;
  if (concurrency !== undefined) data.concurrency = concurrency;
  if (adminNumbers !== undefined) data.adminNumbers = adminNumbers;
  if (safetyMode !== undefined) data.safetyMode = safetyMode;
  if (enterpriseCustomSettings !== undefined) data.enterpriseCustomSettings = enterpriseCustomSettings;

  if (proxyUrl !== undefined) {
    await prisma.whatsAppSession.updateMany({
      where: { userId: user!.userId, deviceId: "main" },
      data: { proxyUrl },
    });
  }

  const settings = await prisma.settings.upsert({
    where: { userId: user!.userId },
    create: { userId: user!.userId, ...data },
    update: data,
  });

  return NextResponse.json({ settings });
}
