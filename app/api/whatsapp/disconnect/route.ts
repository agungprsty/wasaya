import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId") || "main";

  await whatsappManager.disconnect(user!.userId, deviceId);
  return NextResponse.json({ ok: true });
}
