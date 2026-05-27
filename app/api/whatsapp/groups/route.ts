import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId") || "main";

  let groups;
  try {
    groups = await whatsappManager.getGroups(user!.userId, deviceId);
  } catch {
    return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
  }

  return NextResponse.json({ groups });
}
