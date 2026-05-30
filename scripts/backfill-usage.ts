/**
 * Backfill usage records from WhatsAppMessage history.
 *
 * Usage:
 *   npx tsx scripts/backfill-usage.ts
 *   npx tsx scripts/backfill-usage.ts --userId=<uuid>
 *
 * Scans all WhatsAppMessage records with status "sent" | "delivered" | "read",
 * groups by userId + date (WIB), and upserts into UsageRecord.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WIB_OFFSET_MS = 7 * 3_600_000;

function wibDateKey(date: Date): string {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wib.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function wibMonthKey(date: Date): string {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function backfillUser(userId: string): Promise<{ daily: number; monthly: number }> {
  const messages = await prisma.whatsAppMessage.findMany({
    where: {
      userId,
      status: { in: ["sent", "delivered", "read"] },
    },
    select: { timestamp: true },
  });

  const dailyMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();

  for (const msg of messages) {
    const ts = msg.timestamp;
    const dk = wibDateKey(ts);
    const mk = wibMonthKey(ts);

    dailyMap.set(dk, (dailyMap.get(dk) || 0) + 1);
    monthlyMap.set(mk, (monthlyMap.get(mk) || 0) + 1);
  }

  for (const [periodKey, count] of dailyMap) {
    await prisma.usageRecord.upsert({
      where: { userId_type_periodKey: { userId, type: "daily", periodKey } },
      update: { count },
      create: { userId, type: "daily", periodKey, count },
    });
  }

  for (const [periodKey, count] of monthlyMap) {
    await prisma.usageRecord.upsert({
      where: { userId_type_periodKey: { userId, type: "monthly", periodKey } },
      update: { count },
      create: { userId, type: "monthly", periodKey, count },
    });
  }

  return { daily: dailyMap.size, monthly: monthlyMap.size };
}

async function main() {
  const targetUserId = process.argv.find((a) => a.startsWith("--userId="))?.split("=")[1];

  const users = targetUserId
    ? [{ id: targetUserId }]
    : await prisma.user.findMany({ select: { id: true } });

  console.log(`Backfilling ${users.length} user(s)...`);

  let totalDaily = 0;
  let totalMonthly = 0;

  for (let i = 0; i < users.length; i++) {
    const { id } = users[i];
    process.stdout.write(`  [${i + 1}/${users.length}] ${id.slice(0, 8)}... `);
    try {
      const { daily, monthly } = await backfillUser(id);
      totalDaily += daily;
      totalMonthly += monthly;
      console.log(`✓ daily=${daily} monthly=${monthly}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${msg}`);
    }
  }

  console.log(`\nDone. ${totalDaily} daily + ${totalMonthly} monthly records created/updated.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
