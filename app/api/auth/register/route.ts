import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setTokenCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    await Promise.all([
      prisma.whatsAppSession.create({
        data: { userId: user.id, deviceId: "main", name: "Main Device", status: "disconnected" },
      }),
      prisma.subscription.create({
        data: { userId: user.id },
      }),
    ]);

    const token = signToken({ userId: user.id, email: user.email });
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    }, { status: 201 });

    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}