import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

export async function deliverWebhook(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings?.webhookUrl) return;

  const body = JSON.stringify({ eventType, payload, timestamp: new Date().toISOString() });
  const secret = settings.webhookSecret || "";

  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(settings.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": eventType,
        },
        body,
      });

      await prisma.webhookEvent.create({
        data: {
          userId,
          eventType,
          payload: payload as any,
          processed: res.ok,
          processedAt: new Date(),
        },
      });

      if (res.ok) return;
      lastError = new Error(`Webhook responded with ${res.status}`);
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
      }
    }
  }

  if (lastError) {
    await prisma.webhookEvent.create({
      data: {
        userId,
        eventType,
        payload: payload as any,
        processed: false,
        processedAt: new Date(),
      },
    }).catch(() => {});
  }
}
