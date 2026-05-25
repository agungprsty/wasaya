import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const templates = await prisma.messageTemplate.findMany({
    where: { userId: user!.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { name, body } = await request.json();
  if (!name || !body) {
    return NextResponse.json({ error: "Name and body are required" }, { status: 400 });
  }

  const template = await prisma.messageTemplate.create({
    data: { userId: user!.userId, name, body },
  });

  return NextResponse.json({ template }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Template ID required" }, { status: 400 });

  const { name, body } = await request.json();
  if (!name || !body) {
    return NextResponse.json({ error: "Name and body are required" }, { status: 400 });
  }

  const template = await prisma.messageTemplate.updateMany({
    where: { id, userId: user!.userId },
    data: { name, body },
  });

  if (template.count === 0) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const updated = await prisma.messageTemplate.findUnique({ where: { id } });
  return NextResponse.json({ template: updated });
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Template ID required" }, { status: 400 });

  await prisma.messageTemplate.deleteMany({ where: { id, userId: user!.userId } });
  return NextResponse.json({ ok: true });
}