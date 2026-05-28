"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const TIER_DAILY_LIMITS: Record<string, number> = {
  free: 50,
  pro: 200,
  enterprise: Infinity,
};

const TIER_MONTHLY_LIMITS: Record<string, number> = {
  free: 500,
  pro: 5_000,
  enterprise: Infinity,
};

export default function LimitWatcher() {
  const shownRef = useRef(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json().catch(() => ({}));
        const sub = data.subscription;
        if (!sub) return;

        const tier = sub.tier || "free";
        const dailySent = sub.dailySentCount ?? 0;
        const monthlySent = sub.monthlySentCount ?? 0;
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
      } catch {
        // silent
      }
    }

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
