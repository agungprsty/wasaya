import { getTokenFromCookies, verifyToken } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export function getUserFromRequest(request: Request): { userId: string; email: string } | null {
  const token = getTokenFromCookies(request);
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(request: Request) {
  const user = getUserFromRequest(request);
  if (user) {
    return { error: null, user };
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      select: { userId: true, id: true },
    });
    if (keyRecord) {
      prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      return { error: null, user: { userId: keyRecord.userId, email: "" } };
    }
  }

  return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
}
