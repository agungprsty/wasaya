import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const devices = await whatsappManager.listDevices(user!.userId);
  return NextResponse.json({ devices });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { name, deviceId } = await request.json();
  try {
    const device = await whatsappManager.addDevice(user!.userId, name || "New Device", deviceId || undefined);
    return NextResponse.json({ device }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to add device" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  await whatsappManager.deleteDevice(user!.userId, deviceId);
  return NextResponse.json({ ok: true });
}
