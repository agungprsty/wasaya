import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  const messages = await prisma.whatsAppMessage.findMany({
    where: { userId: user!.userId },
    orderBy: { createdAt: "desc" },
  });

  const csv = [
    "to,body,status,createdAt",
    ...messages.map((m) =>
      `"${m.to}","${m.body.replace(/"/g, '""')}","${m.status}","${m.createdAt.toISOString()}"`
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=messages.csv",
    },
  });
}
