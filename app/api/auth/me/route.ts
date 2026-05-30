import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookies, verifyToken, clearTokenCookie } from "@/lib/auth";
import { getCurrentUsage } from "@/lib/usage-tracker";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      const res = NextResponse.json({ error: "Invalid token" }, { status: 401 });
      clearTokenCookie(res);
      return res;
    }

    const [user, subscription, usage] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, avatar: true },
      }),
      prisma.subscription.findUnique({
        where: { userId: payload.userId },
        select: { tier: true },
      }),
      getCurrentUsage(payload.userId),
    ]);

    if (!user) {
      const res = NextResponse.json({ error: "User not found" }, { status: 401 });
      clearTokenCookie(res);
      return res;
    }

    return NextResponse.json({ user, subscription, usage });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}