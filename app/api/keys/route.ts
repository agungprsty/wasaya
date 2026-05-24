import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  const keys = await prisma.apiKey.findMany({
    where: { userId: user!.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, key: true, lastUsedAt: true, createdAt: true },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Key name is required" }, { status: 400 });
  }

  const raw = `wag_${crypto.randomBytes(32).toString("hex")}`;

  const apiKey = await prisma.apiKey.create({
    data: { userId: user!.userId, name, key: raw },
  });

  return NextResponse.json({ key: { id: apiKey.id, name: apiKey.name, key: apiKey.key, createdAt: apiKey.createdAt } }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Key ID required" }, { status: 400 });

  await prisma.apiKey.deleteMany({ where: { id, userId: user!.userId } });
  return NextResponse.json({ ok: true });
}