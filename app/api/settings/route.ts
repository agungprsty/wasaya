import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  let settings = await prisma.settings.findUnique({ where: { userId: user!.userId } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { userId: user!.userId } });
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { webhookUrl, webhookSecret, autoReplyText, autoReplyActive, watermarkText, watermarkActive } = await request.json();

  const data: Record<string, unknown> = {};
  if (webhookUrl !== undefined) data.webhookUrl = webhookUrl;
  if (webhookSecret !== undefined) data.webhookSecret = webhookSecret;
  if (autoReplyText !== undefined) data.autoReplyText = autoReplyText;
  if (autoReplyActive !== undefined) data.autoReplyActive = autoReplyActive;
  if (watermarkText !== undefined) data.watermarkText = watermarkText;
  if (watermarkActive !== undefined) data.watermarkActive = watermarkActive;

  const settings = await prisma.settings.upsert({
    where: { userId: user!.userId },
    create: { userId: user!.userId, ...data },
    update: data,
  });

  return NextResponse.json({ settings });
}
