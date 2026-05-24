import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  const contacts = await prisma.contact.findMany({
    where: { userId: user!.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  const { name, phone } = await request.json();
  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: { userId: user!.userId, name, phone },
  });

  return NextResponse.json({ contact }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Contact ID required" }, { status: 400 });

  await prisma.contact.deleteMany({ where: { id, userId: user!.userId } });
  return NextResponse.json({ ok: true });
}