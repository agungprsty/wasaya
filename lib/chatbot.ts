import { prisma } from "@/lib/prisma";
import { interpolate } from "@/lib/template-utils";

export async function processChatbot(
  userId: string,
  from: string,
  body: string
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
