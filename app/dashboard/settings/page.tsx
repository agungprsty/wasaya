"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { TIER_DAILY_LIMITS, TIER_MONTHLY_LIMITS } from "@/app/dashboard/limit-constants";
import { useDashboard } from "../dashboard-context";

function getSafetyLevel(pct: number): { label: string; color: string; bg: string } {
  if (pct < 50) return { label: "Aman", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (pct < 80) return { label: "Waspada", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "Berisiko", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

export default function SettingsPage() {
  const {
    settings: ctxSettings,
    subscription,
    usage: ctxUsage,
    isQuarantined: ctxIsQuarantined,
    safetyViolations: ctxSafetyViolations,
    loading: ctxLoading,
    refresh: dashboardRefresh,
  } = useDashboard();

  const [watermarkActive, setWatermarkActive] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [ratio, setRatio] = useState<{ outbound: number; inbound: number; ratio: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initializedRef = useRef(false);

  const sub = subscription as { tier: string; accountAge?: string } | null;
  const tier = sub?.tier || "free";
  const isFree = tier === "free";
  const dailyLimit = TIER_DAILY_LIMITS[tier] ?? 50;
  const monthlyLimit = TIER_MONTHLY_LIMITS[tier] ?? 500;
  const dailySent = ctxUsage.daily;
  const monthlySent = ctxUsage.monthly;
  const dailyPct = dailyLimit === Infinity ? 0 : Math.min(100, Math.round((dailySent / dailyLimit) * 100));
  const monthlyPct = monthlyLimit === Infinity ? 0 : Math.min(100, Math.round((monthlySent / monthlyLimit) * 100));
  const safetyLevel = getSafetyLevel(Math.max(dailyPct, monthlyPct));

  useEffect(() => {
    fetch("/api/analytics?metric=outbound-inbound-ratio")
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data.data) setRatio(data.data);
      });
  }, []);

  useEffect(() => {
    if (!initializedRef.current && !ctxLoading && ctxSettings) {
      initializedRef.current = true;
      setWatermarkActive(ctxSettings.watermarkActive);
      setWatermarkText(ctxSettings.watermarkText || "");
    }
  }, [ctxLoading, ctxSettings]);

  function getTierBadge(t: string) {
    switch (t) {
      case "pro":
        return { label: "Pro", classes: "bg-blue-100 text-blue-700 border-blue-200" };
      case "enterprise":
        return { label: "Enterprise", classes: "bg-purple-100 text-purple-700 border-purple-200" };
      default:
        return { label: "Free", classes: "bg-zinc-100 text-zinc-600 border-zinc-200" };
    }
  }

  const tierBadge = getTierBadge(tier);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        watermarkText: watermarkText || null,
        watermarkActive,
      }),
    });
    setSaving(false);
    setSaved(true);
    dashboardRefresh();
    setTimeout(() => setSaved(false), 3000);
  }

  function formatNumber(n: number) {
    return n === Infinity ? "\u221E" : n.toLocaleString("id-ID");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Account overview and watermark configuration.
        </p>
      </div>

      {/* Tier Info Panel */}
      <div className="mb-6 rounded-xl border border-[#DCF8C6] bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className={`inline-block rounded-lg border px-3 py-1 text-xs font-semibold ${tierBadge.classes}`}>
              {tierBadge.label}
            </span>
            <p className="mt-2 text-xs text-zinc-500">
              Akun:{" "}
              {sub?.accountAge === "newborn"
                ? "Baru (< 7 hari)"
                : sub?.accountAge === "growing"
                  ? "Bertumbuh (7-30 hari)"
                  : "Mapan (30+ hari)"}
            </p>
          </div>
          {isFree && (
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1DAF5A]"
            >
              Upgrade
            </button>
          )}
        </div>

        {/* Daily Usage */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">Harian</span>
            <span className="text-zinc-500">
              {dailySent.toLocaleString("id-ID")} / {formatNumber(dailyLimit)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-[#25D366] transition-all" style={{ width: `${dailyPct}%` }} />
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">Bulanan</span>
            <span className="text-zinc-500">
              {monthlySent.toLocaleString("id-ID")} / {formatNumber(monthlyLimit)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all ${
                monthlyPct > 80 ? "bg-red-500" : monthlyPct > 50 ? "bg-yellow-500" : "bg-[#25D366]"
              }`}
              style={{ width: `${monthlyPct}%` }}
            />
          </div>
        </div>

        {/* Safety Level */}
        <div className={`mt-4 rounded-lg border px-4 py-3 ${safetyLevel.bg}`}>
          <div className="flex items-center gap-2">
            <svg
              className={`h-4 w-4 ${safetyLevel.color}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0Z"
              />
            </svg>
            <span className={`text-sm font-medium ${safetyLevel.color}`}>
              Status Keamanan: {safetyLevel.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {dailyPct >= 80 || monthlyPct >= 80
              ? "Penggunaan mendekati batas. Kurangi frekuensi untuk menghindari flagging."
              : dailyPct >= 50 || monthlyPct >= 50
                ? "Penggunaan cukup tinggi. Pantau batas harian dan bulanan."
                : "Penggunaan masih aman. Lanjutkan dengan pengaturan saat ini."}
          </p>
        </div>

        {/* Quarantine Warning */}
        {ctxIsQuarantined && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              <span className="text-sm font-medium text-red-700">Mode Darurat — Akun DIKARANTINA</span>
            </div>
            <p className="mt-1 text-xs text-red-600">
              Terdeteksi {ctxSafetyViolations} pelanggaran keamanan. Pengiriman pesan dihentikan sementara.
              {tier !== "enterprise" && " Status akan dirilis otomatis dalam 12-24 jam."}
            </p>
          </div>
        )}

        {/* Outbound-Inbound Ratio */}
        {ratio && (
          <div className="mt-3 flex items-center gap-4 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5">
            <div className="text-sm">
              <span className="font-medium text-zinc-700">Rasio Kirim/Terima: </span>
              <span className="text-zinc-500">{ratio.ratio}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-zinc-700">Dikirim: </span>
              <span className="text-zinc-500">{ratio.outbound.toLocaleString("id-ID")}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-zinc-700">Diterima: </span>
              <span className="text-zinc-500">{ratio.inbound.toLocaleString("id-ID")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Watermark */}
      <form onSubmit={handleSave} className="mb-6">
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-sm font-semibold text-[#075E54]">Watermark</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Automatically add a footer to every message you send.{" "}
            {isFree
              ? 'Free tier always appends "Sent via temanwa".'
              : 'Supports {"{{business_name}}"}, {"{{user_name}}"}, {"{{phone}}"}.'}
          </p>

          <div className="mt-5 space-y-4">
            {isFree ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-sm text-zinc-500">
                  Custom watermark messages are available on <strong>Pro</strong> and{" "}
                  <strong>Enterprise</strong> tiers. Your messages will always include:{" "}
                  <span className="italic text-zinc-700">Sent via temanwa</span>
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWatermarkActive(!watermarkActive)}
                    className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                      watermarkActive ? "bg-[#25D366]" : "bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        watermarkActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-zinc-700">{watermarkActive ? "Active" : "Inactive"}</span>
                </div>
                <div>
                  <label htmlFor="watermarkText" className="block text-sm font-medium text-zinc-700">
                    Watermark Text
                  </label>
                  <input
                    id="watermarkText"
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                    placeholder="Dikirim via TEMANWA"
                  />
                </div>
                {watermarkText && (
                  <div className="rounded-lg border border-[#DCF8C6] bg-[#f0fdf4] px-4 py-3">
                    <p className="mb-1 text-xs font-medium text-[#075E54]">Preview:</p>
                    <p className="text-sm text-zinc-600">Your message here</p>
                    <p className="mt-2 border-t border-[#DCF8C6] pt-2 text-xs text-zinc-400">{"---"}</p>
                    <p className="text-xs text-zinc-500">{watermarkText}</p>
                  </div>
                )}
              </>
            )}
            <p className="text-xs text-zinc-400">
              {isFree
                ? "Watermark cannot be disabled on the Free tier."
                : "Watermark will be appended as a footer to all outgoing text messages when active."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || isFree}
            className="flex h-10 items-center rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1DAF5A] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && <span className="text-sm text-green-600">Settings saved.</span>}
        </div>
      </form>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-[#25D366]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">Upgrade ke Pro</h3>
              <p className="mt-2 text-sm text-zinc-500">Buka fitur eksklusif dengan berlangganan paket Pro:</p>
              <ul className="mt-4 space-y-2 text-left text-sm text-zinc-600">
                {[
                  "Broadcast massal hingga 200 pesan/hari",
                  "Hingga 5.000 pesan/bulan",
                  "Concurrency 2 (kirim lebih cepat)",
                  "Auto-reply dan chatbot rules prioritas",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Nanti Saja
              </button>
              <a
                href="/pricing"
                className="flex flex-1 items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1DAF5A]"
              >
                Lihat Harga
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
