import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const [rules, total] = await Promise.all([
    prisma.chatbotRule.findMany({
      where: { userId: user!.userId },
      orderBy: { priority: "desc" },
      skip,
      take: limit,
    }),
    prisma.chatbotRule.count({ where: { userId: user!.userId } }),
  ]);

  return NextResponse.json({ rules, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { name, keywords, response, priority } = await request.json();
  if (!name || !keywords?.length || !response) {
    return NextResponse.json({ error: "Name, keywords array, and response are required" }, { status: 400 });
  }

  const rule = await prisma.chatbotRule.create({
    data: {
      userId: user!.userId,
      name,
      keywords,
      response,
      priority: priority || 0,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Rule ID required" }, { status: 400 });

  const { name, keywords, response, isActive, priority } = await request.json();

  const existing = await prisma.chatbotRule.findFirst({ where: { id, userId: user!.userId } });
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const rule = await prisma.chatbotRule.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(keywords !== undefined ? { keywords } : {}),
      ...(response !== undefined ? { response } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(priority !== undefined ? { priority } : {}),
    },
  });

  return NextResponse.json({ rule });
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Rule ID required" }, { status: 400 });

  await prisma.chatbotRule.deleteMany({ where: { id, userId: user!.userId } });
  return NextResponse.json({ ok: true });
}
