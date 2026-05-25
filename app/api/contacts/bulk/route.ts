import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const rl = rateLimit(user!.userId, "contacts-bulk", 5, 60000);
  if (rl) return rl;

  const { contacts } = await request.json();
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "Contacts array is required" }, { status: 400 });
  }

  const data = contacts.map((c: { name: string; phone: string }) => ({
    userId: user!.userId,
    name: c.name,
    phone: c.phone,
  }));

  const result = await prisma.contact.createMany({ data, skipDuplicates: true });

  return NextResponse.json({ count: result.count }, { status: 201 });
}
