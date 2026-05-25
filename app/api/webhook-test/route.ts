import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { deliverWebhook } from "@/lib/webhook";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    await deliverWebhook(user!.userId, "test", {
      message: "This is a test webhook from WAGateway",
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Webhook test failed" }, { status: 500 });
  }
}
