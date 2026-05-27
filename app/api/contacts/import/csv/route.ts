import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validatePhone } from "@/lib/phone-utils";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "CSV file required" }, { status: 400 });

    const text = await file.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ error: "CSV must have header + at least 1 row" }, { status: 400 });

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => ["name", "nama", "full name", "contact name"].includes(h));
    const phoneIdx = headers.findIndex((h) => ["phone", "telepon", "nomor", "number", "no", "whatsapp", "hp"].includes(h));

    if (phoneIdx === -1) return NextResponse.json({ error: "Could not detect phone column. Expected: name, phone" }, { status: 400 });

    const imported: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];
    let count = 0;

    for (let i = 1; i < lines.length; i++) {
      if (count >= 1000) {
        failed.push(`Row ${i + 1}: Batch limit of 1000 reached`);
        break;
      }
      const cols = parseCSVLine(lines[i]);
      if (cols.length <= phoneIdx) {
        failed.push(`Row ${i + 1}: Missing phone column`);
        continue;
      }

      const phone = cols[phoneIdx].replace(/[\s\-\(\)]/g, "");
      const nameCandidate = nameIdx >= 0 ? cols[nameIdx] : cols[0];
      const name = nameCandidate || "Unknown";

      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.valid) {
        failed.push(`Row ${i + 1}: ${phoneCheck.error}`);
        continue;
      }

      const existing = await prisma.contact.findFirst({
        where: { userId: user!.userId, phone },
      });
      if (existing) {
        skipped.push(`Row ${i + 1}: ${phone} (duplicate)`);
        continue;
      }

      await prisma.contact.create({
        data: { userId: user!.userId, name, phone },
      });
      imported.push(phone);
      count++;
    }

    return NextResponse.json({
      imported: imported.length,
      skipped: skipped.length,
      failed: failed.length,
      details: { imported, skipped, failed: failed.slice(0, 10) },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse CSV";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
