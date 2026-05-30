import { NextRequest, NextResponse } from "next/server";
import { cleanupOldAutoReplyLogs } from "@/lib/chatbot";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  const internalSecret = process.env.CRON_SECRET;

  if (!cronSecret || !internalSecret || cronSecret !== internalSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await cleanupOldAutoReplyLogs();
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
