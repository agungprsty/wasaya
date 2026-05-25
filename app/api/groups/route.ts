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

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      where: { userId: user!.userId },
      include: { contacts: { include: { contact: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.group.count({ where: { userId: user!.userId } }),
  ]);

  return NextResponse.json({ groups, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { name, contactIds } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      userId: user!.userId,
      name,
      contacts: contactIds?.length
        ? { create: contactIds.map((contactId: string) => ({ contactId })) }
        : undefined,
    },
    include: { contacts: { include: { contact: true } } },
  });

  return NextResponse.json({ group }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Group ID required" }, { status: 400 });

  const { name, contactIds } = await request.json();

  const existing = await prisma.group.findFirst({ where: { id, userId: user!.userId } });
  if (!existing) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  await prisma.contactGroup.deleteMany({ where: { groupId: id } });

  const group = await prisma.group.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      contacts: contactIds?.length
        ? { create: contactIds.map((contactId: string) => ({ contactId })) }
        : undefined,
    },
    include: { contacts: { include: { contact: true } } },
  });

  return NextResponse.json({ group });
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Group ID required" }, { status: 400 });

  await prisma.group.deleteMany({ where: { id, userId: user!.userId } });
  return NextResponse.json({ ok: true });
}
