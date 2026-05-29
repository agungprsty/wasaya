import { prisma } from "@/lib/prisma";
import { interpolate } from "@/lib/template-utils";

export async function processChatbot(
  userId: string,
  from: string,
  body: string,
): Promise<string | null> {
  const rules = await prisma.chatbotRule.findMany({
    where: { userId, isActive: true },
    orderBy: { priority: "desc" },
  });

  if (rules.length === 0) return null;

  const lowerBody = body.toLowerCase();

  for (const rule of rules) {
    const match = rule.keywords.some((kw) => lowerBody.includes(kw.toLowerCase()));
    if (!match) continue;

    return interpolate(rule.response, { from, body });
  }

  return null;
}

export async function processAutoReply(
  userId: string,
  from: string,
): Promise<string | null> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings?.autoReplyActive || !settings?.autoReplyText) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alreadyReplied = await prisma.autoReplyLog.findFirst({
    where: {
      userId,
      contact: from,
      repliedAt: { gte: today },
    },
  });
  if (alreadyReplied) return null;

  return settings.autoReplyText;
}

export async function markAutoReplySent(userId: string, from: string): Promise<void> {
  await prisma.autoReplyLog.create({
    data: { userId, contact: from },
  }).catch(() => {});
}
