import { NextRequest, NextResponse } from "next/server";
import { syncUsageToDatabase } from "@/lib/usage-tracker";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  const internalSecret = process.env.CRON_SECRET;

  if (!cronSecret || !internalSecret || cronSecret !== internalSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const synced = await syncUsageToDatabase();
    return NextResponse.json({ ok: true, synced });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
