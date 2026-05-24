import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  const { error, user } = requireUser(request);
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
  const { error, user } = requireUser(request);
  if (error) return error;

  const { to, body, media } = await request.json();
  if (!to) {
    return NextResponse.json({ error: "Recipient number is required" }, { status: 400 });
  }

  try {
    await whatsappManager.sendMessage(user!.userId, to, body, media || null);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("not connected") || msg.includes("disconnected")) {
      const fallback = await prisma.whatsAppMessage.create({
        data: {
          userId: user!.userId,
          to,
          from: "gateway",
          messageId: crypto.randomUUID(),
          body,
          status: "pending",
        },
      });
      return NextResponse.json({ message: fallback, warning: "WhatsApp not connected. Message queued." }, { status: 202 });
    }
    return NextResponse.json({ error: msg || "Failed to send message" }, { status: 500 });
  }
}