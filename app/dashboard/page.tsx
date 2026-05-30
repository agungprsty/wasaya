"use client";

import { useEffect, useState } from "react";
import { TIER_DAILY_LIMITS, TIER_MONTHLY_LIMITS } from "@/app/dashboard/limit-constants";

interface DailyData {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  received: number;
}

interface Analytics {
  daily: DailyData[];
  summary: {
    total: number;
    totalSent: number;
    totalFailed: number;
    totalReceived: number;
    successRate: number;
    busiestHour: number;
    topRecipient: string | null;
    topRecipientCount: number;
  };
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [days, setDays] = useState(7);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [tier, setTier] = useState("free");
  const [dailySent, setDailySent] = useState(0);
  const [monthlySent, setMonthlySent] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch(`/api/analytics?days=${days}`).then((r) => r.json().catch(() => null)),
      fetch("/api/settings").then((r) => r.json().catch(() => ({}))),
    ]).then(([a, s]) => {
      setAnalytics(a);
      setWebhookUrl(s.settings?.webhookUrl || "");
      if (s.subscription) {
        setTier(s.subscription.tier ?? "free");
      }
      if (s.usage) {
        setDailySent(s.usage.daily ?? 0);
        setMonthlySent(s.usage.monthly ?? 0);
      }
    });
  }, [days]);

  const summary = analytics?.summary;

  const dailyLimit = TIER_DAILY_LIMITS[tier] ?? 50;
  const monthlyLimit = TIER_MONTHLY_LIMITS[tier] ?? 500;
  const dailyPct = dailyLimit === Infinity ? 0 : Math.min(100, Math.round((dailySent / dailyLimit) * 100));
  const monthlyPct = monthlyLimit === Infinity ? 0 : Math.min(100, Math.round((monthlySent / monthlyLimit) * 100));

  const maxVal = analytics?.daily?.length
    ? Math.max(
        ...analytics.daily.flatMap((d) => [d.sent + d.delivered + d.failed + d.received]),
        1
      )
    : 1;

  const barHeight = (val: number) => Math.max(4, (val / maxVal) * 140);

  const totalSent = summary?.totalSent ?? 0;
  const totalReceived = summary?.totalReceived ?? 0;
  const totalFailed = summary?.totalFailed ?? 0;
  const totalAll = totalSent + totalReceived + totalFailed;
  const deg = (val: number) => totalAll > 0 ? (val / totalAll) * 360 : 0;
  const sentDeg = deg(totalSent);
  const receivedDeg = deg(totalReceived);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#075E54]">Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">Your account at a glance.</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-700 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {summary && (
        <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <p className="text-sm font-medium text-zinc-500">Total Messages</p>
            <p className="mt-2 text-3xl font-bold text-[#075E54]">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <p className="text-sm font-medium text-zinc-500">Messages Sent</p>
            <p className="mt-2 text-3xl font-bold text-[#25D366]">{summary.totalSent}</p>
          </div>
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <p className="text-sm font-medium text-zinc-500">Messages Received</p>
            <p className="mt-2 text-3xl font-bold text-blue-500">{summary.totalReceived}</p>
          </div>
          <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
            <p className="text-sm font-medium text-zinc-500">Success Rate</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${summary.successRate >= 80 ? "text-[#25D366]" : summary.successRate >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                {summary.successRate}%
              </p>
              <span className="text-xs text-zinc-400">of sent</span>
            </div>
          </div>
        </div>
      )}

      {analytics?.daily && analytics.daily.length > 0 && (
        <div className="mb-10 rounded-xl border border-[#DCF8C6] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#075E54]">Message Trend ({days} days)</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#25D366]" />
                Sent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-blue-400" />
                Received
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-400" />
                Failed
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1.5" style={{ height: 150 }}>
            {analytics!.daily.map((d) => {
              const sentH = d.sent + d.delivered;
              const receivedH = d.received;
              const failedH = d.failed;
              const totalH = sentH + receivedH + failedH;
              return (
                <div
                  key={d.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  style={{ height: "100%" }}
                >
                  <div className="w-full rounded-t" style={{ height: barHeight(totalH) }}>
                    {sentH > 0 && (
                      <div
                        className="w-full bg-[#25D366] transition-all group-hover:opacity-80"
                        style={{ height: `${(sentH / totalH) * 100}%` }}
                        title={`${d.date}: ${sentH} sent`}
                      />
                    )}
                    {receivedH > 0 && (
                      <div
                        className="w-full bg-blue-400 transition-all group-hover:opacity-80"
                        style={{ height: `${(receivedH / totalH) * 100}%` }}
                        title={`${d.date}: ${receivedH} received`}
                      />
                    )}
                    {failedH > 0 && (
                      <div
                        className="w-full rounded-t bg-red-400 transition-all group-hover:opacity-80"
                        style={{ height: `${(failedH / totalH) * 100}%` }}
                        title={`${d.date}: ${failedH} failed`}
                      />
                    )}
                  </div>
                  {totalH > 0 && (
                    <span className="absolute -top-5 text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
                      {totalH}
                    </span>
                  )}
                  <span className="mt-1 text-[9px] text-zinc-400">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribution + Usage Analytics */}
      <div className="mb-10 grid gap-6 lg:grid-cols-3">
        {/* Donut Chart */}
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-base font-semibold text-[#075E54]">Distribution</h2>
          <div className="mt-5 flex items-center justify-center">
            {totalAll > 0 ? (
              <div className="relative h-32 w-32">
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background: `conic-gradient(#25D366 0deg ${sentDeg}deg, #60A5FA ${sentDeg}deg ${sentDeg + receivedDeg}deg, #F87171 ${sentDeg + receivedDeg}deg 360deg)`,
                  }}
                />
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-zinc-200">
                <span className="text-xs text-zinc-400">Belum ada data</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-center gap-5 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#25D366]" />
              Sent {totalSent}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400" />
              Received {totalReceived}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
              Failed {totalFailed}
            </span>
          </div>
        </div>

        {/* Tier Usage */}
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-base font-semibold text-[#075E54]">Usage / Limits</h2>
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700">Harian</span>
                <span className="text-zinc-500">{dailySent.toLocaleString("id-ID")} / {dailyLimit === Infinity ? "∞" : dailyLimit.toLocaleString("id-ID")}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all ${dailyPct >= 80 ? "bg-red-500" : dailyPct >= 50 ? "bg-yellow-500" : "bg-[#25D366]"}`}
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700">Bulanan</span>
                <span className="text-zinc-500">{monthlySent.toLocaleString("id-ID")} / {monthlyLimit === Infinity ? "∞" : monthlyLimit.toLocaleString("id-ID")}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all ${monthlyPct >= 80 ? "bg-red-500" : monthlyPct >= 50 ? "bg-yellow-500" : "bg-[#25D366]"}`}
                  style={{ width: `${monthlyPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-400">
            Tier: <span className="font-medium text-zinc-600">{tier === "enterprise" ? "Enterprise" : tier === "pro" ? "Pro" : "Free"}</span>
          </div>
        </div>

        {/* Insights */}
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-base font-semibold text-[#075E54]">Insights</h2>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-700">Busiest Hour</p>
              <p className="mt-1 text-2xl font-bold text-[#075E54]">
                {summary?.busiestHour ?? 0}:00
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700">Top Recipient</p>
              <p className="mt-1 text-sm text-zinc-600 truncate">
                {summary?.topRecipient ? `${summary.topRecipient} (${summary.topRecipientCount}x)` : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700">Success Rate</p>
              <p className={`mt-1 text-2xl font-bold ${(summary?.successRate ?? 100) >= 80 ? "text-[#25D366]" : (summary?.successRate ?? 100) >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                {summary?.successRate ?? 100}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-base font-semibold text-[#075E54]">Quick Start</h2>
          <ul className="mt-5 space-y-4">
            {[
              { label: "Add contacts", done: (summary?.totalReceived || 0) > 0 || (summary?.totalSent || 0) > 0 },
              { label: "Send your first message", done: (summary?.totalSent || 0) > 0 },
              { label: "Configure webhook", done: !!webhookUrl },
            ].map((item, i) => (
              <li key={item.label} className="flex items-center gap-3">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${item.done ? "bg-[#DCF8C6] text-[#075E54]" : "border border-zinc-300 text-zinc-400"}`}>
                  {item.done ? "\u2713" : i + 1}
                </div>
                <span className={`text-sm ${item.done ? "text-zinc-400 line-through" : "text-zinc-700"}`}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-base font-semibold text-[#075E54]">Account Info</h2>
          <div className="mt-5 space-y-3 text-sm text-zinc-600">
            <p>Webhook: {webhookUrl ? "\u2705 Configured" : "\u2014"}</p>
            <p>Messages sent: {summary?.totalSent || 0}</p>
            <p>Messages received: {summary?.totalReceived || 0}</p>
            <p>Failed: {summary?.totalFailed || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
