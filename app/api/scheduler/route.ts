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

  const { recipients, body, scheduledAt, isRecurring, recurrence, interval, endDate, maxRepeats } = await request.json();

  if (!recipients?.length || !body?.trim() || !scheduledAt) {
    return NextResponse.json({ error: "Recipients, message body, and scheduled time are required" }, { status: 400 });
  }

  if (new Date(scheduledAt) <= new Date()) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
  }

  const data: any = {
    userId: user!.userId,
    recipients,
    body: body.trim(),
    scheduledAt: new Date(scheduledAt),
  };

  if (isRecurring) {
    data.isRecurring = true;
    data.recurrence = recurrence || "daily";
    data.interval = interval || 1;
    data.nextRunAt = new Date(scheduledAt);
    if (endDate) data.endDate = new Date(endDate);
    if (maxRepeats != null) data.maxRepeats = maxRepeats;
  }

  const message = await prisma.scheduledMessage.create({ data });

  return NextResponse.json({ message }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Scheduled message ID required" }, { status: 400 });

  const existing = await prisma.scheduledMessage.findFirst({
    where: { id, userId: user!.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  if (body.action === "stop_recurring") {
    await prisma.scheduledMessage.update({
      where: { id },
      data: { isRecurring: false, status: "completed" },
    });
    return NextResponse.json({ ok: true });
  }

  const updateData: any = {};
  if (body.recipients !== undefined) updateData.recipients = body.recipients;
  if (body.body !== undefined) updateData.body = body.body;
  if (body.scheduledAt !== undefined) updateData.scheduledAt = new Date(body.scheduledAt);
  if (body.isRecurring !== undefined) updateData.isRecurring = body.isRecurring;
  if (body.recurrence !== undefined) updateData.recurrence = body.recurrence;
  if (body.interval !== undefined) updateData.interval = body.interval;
  if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.maxRepeats !== undefined) updateData.maxRepeats = body.maxRepeats;

  if (Object.keys(updateData).length > 0) {
    await prisma.scheduledMessage.update({
      where: { id },
      data: updateData,
    });
  }

  return NextResponse.json({ ok: true });
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
