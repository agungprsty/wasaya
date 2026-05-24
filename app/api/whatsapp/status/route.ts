import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  const { error, user } = requireUser(request);
  if (error) return error;

  const status = await whatsappManager.getStatus(user!.userId);
  return NextResponse.json({ session: status });
}