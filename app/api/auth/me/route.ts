import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const [user, subscription] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, avatar: true },
      }),
      prisma.subscription.findUnique({
        where: { userId: payload.userId },
        select: { tier: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user, subscription });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}