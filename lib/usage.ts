import { getCurrentUsage } from "@/lib/usage-tracker";

export async function getUsage(userId: string) {
  return getCurrentUsage(userId);
}
