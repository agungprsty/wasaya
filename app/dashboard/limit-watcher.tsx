"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { TIER_DAILY_LIMITS, TIER_MONTHLY_LIMITS } from "@/app/dashboard/limit-constants";
import { useDashboard } from "./dashboard-context";

export default function LimitWatcher() {
  const shownRef = useRef(false);
  const { subscription, usage } = useDashboard();

  useEffect(() => {
    const tier = subscription?.tier ?? "free";
    const dailySent = usage.daily;
    const monthlySent = usage.monthly;
    const dailyLimit = TIER_DAILY_LIMITS[tier] ?? 50;
    const monthlyLimit = TIER_MONTHLY_LIMITS[tier] ?? 500;

    const dailyPct = dailyLimit === Infinity ? 0 : Math.round((dailySent / dailyLimit) * 100);
    const monthlyPct = monthlyLimit === Infinity ? 0 : Math.round((monthlySent / monthlyLimit) * 100);
    const maxPct = Math.max(dailyPct, monthlyPct);

    if (maxPct > 80 && !shownRef.current) {
      shownRef.current = true;
      toast.warning("Limit Mendekati Batas", {
        description:
          dailyPct >= monthlyPct
            ? `Kamu sudah menggunakan ${dailyPct}% kuota harian (${dailySent.toLocaleString("id-ID")} dari ${dailyLimit === Infinity ? "∞" : dailyLimit.toLocaleString("id-ID")}).`
            : `Kamu sudah menggunakan ${monthlyPct}% kuota bulanan (${monthlySent.toLocaleString("id-ID")} dari ${monthlyLimit === Infinity ? "∞" : monthlyLimit.toLocaleString("id-ID")}).`,
        duration: 10000,
      });
    }
  }, [subscription, usage]);

  return null;
}
