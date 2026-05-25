import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const contacts = await prisma.contact.findMany({
    where: { userId: user!.userId },
    orderBy: { createdAt: "desc" },
  });

  const csv = [
    "name,phone,createdAt",
    ...contacts.map((c) =>
      `"${c.name.replace(/"/g, '""')}","${c.phone}","${c.createdAt.toISOString()}"`
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=contacts.csv",
    },
  });
}
