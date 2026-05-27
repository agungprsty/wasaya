import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { whatsappManager } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId") || "main";

  let waContacts;
  try {
    waContacts = await whatsappManager.getContacts(user!.userId, deviceId);
  } catch {
    return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
  }

  const existing = await prisma.contact.findMany({
    where: { userId: user!.userId },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map((c) => c.phone));

  const available = Object.values(
    waContacts.reduce(
      (groups, c) => {
        if (!c.number || existingPhones.has(c.number)) return groups;
        const key = c.name.toLowerCase().trim();
        const prev = groups[key];
        if (!prev) {
          groups[key] = c;
          return groups;
        }
        if (prev.number === c.number) return groups;
        const validLen = (n: string) => n.length >= 10 && n.length <= 14;
        if (!validLen(prev.number) && validLen(c.number)) {
          groups[key] = c;
        }
        return groups;
      },
      {} as Record<string, (typeof waContacts)[0]>,
    ),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ contacts: available });
}
