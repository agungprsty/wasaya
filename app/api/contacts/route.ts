import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { checkContactLimit } from "@/lib/check-limit";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);

  if (searchParams.get("all") === "true") {
    const contacts = await prisma.contact.findMany({
      where: { userId: user!.userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ contacts });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: { userId: user!.userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where: { userId: user!.userId } }),
  ]);

  return NextResponse.json({ contacts, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const limitCheck = await checkContactLimit(user!.userId);
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.message }, { status: 429 });
  }

  const { name, phone } = await request.json();
  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: { userId: user!.userId, name, phone },
  });

  return NextResponse.json({ contact }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Contact ID required" }, { status: 400 });

  const { name, phone } = await request.json();
  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const contact = await prisma.contact.updateMany({
    where: { id, userId: user!.userId },
    data: { name, phone },
  });

  if (contact.count === 0) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const updated = await prisma.contact.findUnique({ where: { id } });
  return NextResponse.json({ contact: updated });
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Contact ID required" }, { status: 400 });

  await prisma.contact.deleteMany({ where: { id, userId: user!.userId } });
  return NextResponse.json({ ok: true });
}