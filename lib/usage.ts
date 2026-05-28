import { prisma } from "@/lib/prisma";

export async function getUsage(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const statuses: string[] = ["sent", "delivered", "read"];
  const whereBase = { userId, status: { in: statuses } };

  const [daily, monthly] = await Promise.all([
    prisma.whatsAppMessage.count({
      where: { ...whereBase, timestamp: { gte: startOfDay } },
    }),
    prisma.whatsAppMessage.count({
      where: { ...whereBase, timestamp: { gte: startOfMonth } },
    }),
  ]);

  return { daily, monthly };
}
