import { prisma } from "@/lib/prisma";
import { interpolate } from "@/lib/template-utils";
import { whatsappManager } from "@/lib/whatsapp";

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
  deviceId = "main",
): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings?.autoReplyActive || !settings?.autoReplyText) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alreadyReplied = await prisma.autoReplyLog.findFirst({
    where: {
      userId,
      contact: from,
      repliedAt: { gte: today },
    },
  });
  if (alreadyReplied) return false;

  try {
    await whatsappManager.sendMessage(userId, from, settings.autoReplyText, null, deviceId);
    await prisma.autoReplyLog.create({
      data: { userId, contact: from },
    });
    return true;
  } catch {
    return false;
  }
}
