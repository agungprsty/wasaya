import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: any = { userId: user!.userId };
  if (status && ["pending", "processing", "sent", "failed", "cancelled"].includes(status)) {
    where.status = status;
  }

  const [messages, total] = await Promise.all([
    prisma.scheduledMessage.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.scheduledMessage.count({ where }),
  ]);

  return NextResponse.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { recipients, body, scheduledAt } = await request.json();

  if (!recipients?.length || !body?.trim() || !scheduledAt) {
    return NextResponse.json({ error: "Recipients, message body, and scheduled time are required" }, { status: 400 });
  }

  if (new Date(scheduledAt) <= new Date()) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
  }

  const message = await prisma.scheduledMessage.create({
    data: {
      userId: user!.userId,
      recipients,
      body: body.trim(),
      scheduledAt: new Date(scheduledAt),
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Scheduled message ID required" }, { status: 400 });

  const existing = await prisma.scheduledMessage.findFirst({
    where: { id, userId: user!.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "sent" || existing.status === "processing") {
    return NextResponse.json({ error: "Cannot cancel a message that is already sent or being processed" }, { status: 400 });
  }

  await prisma.scheduledMessage.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}
