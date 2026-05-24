import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  let settings = await prisma.settings.findUnique({ where: { userId: user!.userId } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { userId: user!.userId } });
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  const { webhookUrl, webhookSecret } = await request.json();

  const settings = await prisma.settings.upsert({
    where: { userId: user!.userId },
    create: { userId: user!.userId, webhookUrl, webhookSecret },
    update: { webhookUrl, webhookSecret },
  });

  return NextResponse.json({ settings });
}