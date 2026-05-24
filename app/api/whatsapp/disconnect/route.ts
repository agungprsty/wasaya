import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  await whatsappManager.disconnect(user!.userId);
  return NextResponse.json({ ok: true });
}