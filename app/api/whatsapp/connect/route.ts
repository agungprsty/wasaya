import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId") || "main";

  const { phone } = await request.json().catch(() => ({}));

  if (phone) {
    try {
      const code = await whatsappManager.startPairing(user!.userId, phone, deviceId);
      if (!code) {
        return NextResponse.json({ error: "Failed to generate pairing code" }, { status: 500 });
      }
      return NextResponse.json({ pairingCode: code, ok: true });
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Failed to start pairing" },
        { status: 409 },
      );
    }
  }

  whatsappManager.startConnect(user!.userId, 0, deviceId).catch(() => {});
  return NextResponse.json({ ok: true, mode: "qr" });
}
