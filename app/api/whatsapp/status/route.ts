import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId") || "main";

  const status = await whatsappManager.getStatus(user!.userId, deviceId);
  if (!status) {
    return NextResponse.json({ session: null, error: "Device not found" }, { status: 404 });
  }
  return NextResponse.json({ session: status });
}
