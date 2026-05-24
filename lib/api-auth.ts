import { getTokenFromCookies, verifyToken } from "./auth";
import { NextResponse } from "next/server";

export function getUserFromRequest(request: Request): { userId: string; email: string } | null {
  const token = getTokenFromCookies(request);
  if (!token) return null;
  return verifyToken(token);
}

export function requireUser(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }
  return { error: null, user };
}