export const PLANS = {
  FREE: {
    label: "Free",
    price: 0,
    maxMessagesPerMonth: 1000,
    maxContacts: 200,
    maxTemplates: 10,
    maxDevices: 1,
    concurrency: 1,
    adminSlots: 0,
    features: { webhook: true, watermark: true, chatbot: true, broadcast: true, scheduled: true, api: true },
  },
  PRO: {
    label: "Pro",
    price: 49000,
    maxMessagesPerMonth: 5000,
    maxContacts: Infinity,
    maxTemplates: Infinity,
    maxDevices: 4,
    concurrency: 2,
    adminSlots: 3,
    features: { webhook: true, watermark: true, chatbot: true, broadcast: true, scheduled: true, api: true },
  },
  ENTERPRISE: {
    label: "Enterprise",
    price: 0,
    maxMessagesPerMonth: Infinity,
    maxContacts: Infinity,
    maxTemplates: Infinity,
    maxDevices: Infinity,
    concurrency: 10,
    adminSlots: Infinity,
    features: { webhook: true, watermark: true, chatbot: true, broadcast: true, scheduled: true, api: true },
  },
} as const;

export type PlanTier = keyof typeof PLANS;

export function getPlanLimits(tier: string) {
  return PLANS[tier.toUpperCase() as PlanTier] || PLANS.FREE;
}
