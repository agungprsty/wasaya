import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getCurrentUsage } from "@/lib/usage-tracker";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    const [userData, subscription, settings, usage, device] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user!.userId },
        select: { id: true, name: true, email: true, avatar: true },
      }),
      prisma.subscription.findUnique({
        where: { userId: user!.userId },
        select: { tier: true },
      }),
      prisma.settings.findUnique({ where: { userId: user!.userId } }),
      getCurrentUsage(user!.userId),
      prisma.whatsAppSession.findUnique({
        where: { userId_deviceId: { userId: user!.userId, deviceId: "main" } },
        select: { proxyUrl: true, isQuarantined: true, safetyViolations: true },
      }),
    ]);

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    return NextResponse.json({
      user: userData,
      subscription: subscription ?? { tier: "free" },
      settings,
      usage,
      proxyUrl: device?.proxyUrl ?? null,
      isQuarantined: device?.isQuarantined ?? false,
      safetyViolations: device?.safetyViolations ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
