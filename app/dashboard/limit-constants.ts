export const TIER_DAILY_LIMITS: Record<string, number> = {
  free: 50,
  pro: 200,
  enterprise: Infinity,
};

export const TIER_MONTHLY_LIMITS: Record<string, number> = {
  free: 1_000,
  pro: 5_000,
  enterprise: Infinity,
};
