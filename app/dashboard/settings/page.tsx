"use client";

import { FormEvent, useEffect, useState } from "react";

interface SubscriptionData {
  tier: string;
  dailySentCount: number;
  monthlySentCount: number;
  accountAge: string;
}

interface SettingsData {
  webhookUrl: string;
  webhookSecret: string;
  autoReplyText: string;
  autoReplyActive: boolean;
  watermarkText: string;
  watermarkActive: boolean;
  broadcastEnabled: boolean;
  concurrency: number;
  adminNumbers: string[];
  safetyMode: string;
  enterpriseCustomSettings: Record<string, unknown> | null;
}

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

function getSafetyLevel(pct: number): { label: string; color: string; bg: string } {
  if (pct < 50) return { label: "Aman", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (pct < 80) return { label: "Waspada", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  return { label: "Berisiko", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data.settings) setSettings(data.settings);
        if (data.subscription) setSubscription(data.subscription);
      });
  }, []);

  const tier = subscription?.tier || "free";
  const isFree = tier === "free";
  const dailyLimit = TIER_DAILY_LIMITS[tier] ?? 50;
  const monthlyLimit = TIER_MONTHLY_LIMITS[tier] ?? 500;
  const dailySent = subscription?.dailySentCount ?? 0;
  const monthlySent = subscription?.monthlySentCount ?? 0;
  const dailyPct = dailyLimit === Infinity ? 0 : Math.min(100, Math.round((dailySent / dailyLimit) * 100));
  const monthlyPct = monthlyLimit === Infinity ? 0 : Math.min(100, Math.round((monthlySent / monthlyLimit) * 100));
  const safetyLevel = getSafetyLevel(Math.max(dailyPct, monthlyPct));

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

  function updateField<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: settings.webhookUrl || null,
        webhookSecret: settings.webhookSecret || null,
        autoReplyText: settings.autoReplyText || null,
        autoReplyActive: settings.autoReplyActive,
        watermarkText: settings.watermarkText || null,
        watermarkActive: settings.watermarkActive,
        broadcastEnabled: settings.broadcastEnabled,
        concurrency: settings.concurrency,
        adminNumbers: settings.adminNumbers,
        safetyMode: settings.safetyMode,
        enterpriseCustomSettings: settings.enterpriseCustomSettings,
      }),
    });
    setSaving(false);
    setSaved(true);
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
          Configure your webhook, auto-reply, and account settings.
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
              Akun: {subscription?.accountAge === "newborn" ? "Baru (< 7 hari)" : subscription?.accountAge === "growing" ? "Bertumbuh (7-30 hari)" : "Mapan (30+ hari)"}
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
            <span className="text-zinc-500">{dailySent.toLocaleString("id-ID")} / {formatNumber(dailyLimit)}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#25D366] transition-all"
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">Bulanan</span>
            <span className="text-zinc-500">{monthlySent.toLocaleString("id-ID")} / {formatNumber(monthlyLimit)}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all ${monthlyPct > 80 ? "bg-red-500" : monthlyPct > 50 ? "bg-yellow-500" : "bg-[#25D366]"}`}
              style={{ width: `${monthlyPct}%` }}
            />
          </div>
        </div>

        {/* Safety Level */}
        <div className={`mt-4 rounded-lg border px-4 py-3 ${safetyLevel.bg}`}>
          <div className="flex items-center gap-2">
            <svg className={`h-4 w-4 ${safetyLevel.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0Z" />
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
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-sm font-semibold text-[#075E54]">Webhook</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Receive real-time notifications for incoming messages and delivery updates.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-zinc-700">
                Webhook URL
              </label>
              <input
                id="webhookUrl"
                type="url"
                value={settings?.webhookUrl || ""}
                onChange={(e) => updateField("webhookUrl", e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="https://your-server.com/webhook"
              />
            </div>
            <div>
              <label htmlFor="webhookSecret" className="block text-sm font-medium text-zinc-700">
                Webhook Secret
              </label>
              <input
                id="webhookSecret"
                type="text"
                value={settings?.webhookSecret || ""}
                onChange={(e) => updateField("webhookSecret", e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="Optional: secret for request verification"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-sm font-semibold text-[#075E54]">Auto Reply (1x/hari)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Automatically reply to the first message from each contact every day.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateField("autoReplyActive", !settings?.autoReplyActive)}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  settings?.autoReplyActive ? "bg-[#25D366]" : "bg-zinc-200"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings?.autoReplyActive ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
              <span className="text-sm text-zinc-700">{settings?.autoReplyActive ? "Active" : "Inactive"}</span>
            </div>
            <div>
              <label htmlFor="autoReplyText" className="block text-sm font-medium text-zinc-700">
                Auto Reply Message
              </label>
              <textarea
                id="autoReplyText"
                rows={3}
                value={settings?.autoReplyText || ""}
                onChange={(e) => updateField("autoReplyText", e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 resize-y"
                placeholder="Halo, terima kasih sudah menghubungi. Kami akan segera merespon."
              />
            </div>
            <p className="text-xs text-zinc-400">
              Pesan ini akan dikirim 1x/hari sebagai balasan pertama ke setiap kontak. Auto Reply berjalan sebelum chatbot keyword rules.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-sm font-semibold text-[#075E54]">Watermark</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Automatically add a footer to every message you send. Supports {"{{business_name}}"}, {"{{user_name}}"}, {"{{phone}}"}.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateField("watermarkActive", !settings?.watermarkActive)}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  settings?.watermarkActive ? "bg-[#25D366]" : "bg-zinc-200"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings?.watermarkActive ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
              <span className="text-sm text-zinc-700">{settings?.watermarkActive ? "Active" : "Inactive"}</span>
            </div>
            <div>
              <label htmlFor="watermarkText" className="block text-sm font-medium text-zinc-700">
                Watermark Text
              </label>
              <input
                id="watermarkText"
                type="text"
                value={settings?.watermarkText || ""}
                onChange={(e) => updateField("watermarkText", e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                placeholder="Dikirim via WAGateway"
              />
            </div>
            {settings?.watermarkText && (
              <div className="rounded-lg border border-[#DCF8C6] bg-[#f0fdf4] px-4 py-3">
                <p className="text-xs font-medium text-[#075E54] mb-1">Preview:</p>
                <p className="text-sm text-zinc-600">Your message here</p>
                <p className="mt-2 border-t border-[#DCF8C6] pt-2 text-xs text-zinc-400">{"---"}</p>
                <p className="text-xs text-zinc-500">{settings.watermarkText}</p>
              </div>
            )}
            <p className="text-xs text-zinc-400">
              Watermark will be appended as a footer to all outgoing text messages when active.
            </p>
          </div>
        </div>

        {/* Advanced Section */}
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <h2 className="text-sm font-semibold text-[#075E54]">Advanced</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Safety controls, broadcast settings, and concurrency limits.
          </p>

          <div className="mt-5 space-y-5">
            {/* Safety Mode */}
            <div>
              <label htmlFor="safetyMode" className="block text-sm font-medium text-zinc-700">
                Safety Mode
              </label>
              <p className="mt-0.5 text-xs text-zinc-400">
                Ketat mode reduces sending speed and adds random delays to avoid flagging.
              </p>
              <select
                id="safetyMode"
                value={settings?.safetyMode || "normal"}
                onChange={(e) => updateField("safetyMode", e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              >
                <option value="normal">Normal</option>
                <option value="ketat">Ketat (Lambat & Aman)</option>
              </select>
            </div>

            {/* Broadcast Toggle */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">Broadcast Mode</span>
                {isFree && (
                  <span className="text-xs text-zinc-400" title="Fitur ini hanya tersedia di paket Pro">
                    <svg className="inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0Z" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                {isFree
                  ? "Broadcast massal hanya tersedia untuk pengguna Pro. Upgrade untuk mengaktifkan."
                  : "Kirim pesan ke banyak kontak sekaligus."}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isFree}
                  onClick={() => {
                    if (isFree) {
                      setShowUpgradeModal(true);
                    } else {
                      updateField("broadcastEnabled", !settings?.broadcastEnabled);
                    }
                  }}
                  className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    isFree ? "cursor-not-allowed opacity-50" : ""
                  } ${
                    settings?.broadcastEnabled ? "bg-[#25D366]" : "bg-zinc-200"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    settings?.broadcastEnabled ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
                <span className="text-sm text-zinc-700">
                  {isFree ? (
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      Terkunci
                    </span>
                  ) : settings?.broadcastEnabled ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Concurrency */}
            <div>
              <label htmlFor="concurrency" className="block text-sm font-medium text-zinc-700">
                Concurrency
              </label>
              <p className="mt-0.5 text-xs text-zinc-400">
                Number of simultaneous message queues. Higher values send faster but increase risk.
              </p>
              <input
                id="concurrency"
                type="number"
                min={1}
                max={tier === "enterprise" ? 10 : tier === "pro" ? 2 : 1}
                value={settings?.concurrency ?? 1}
                onChange={(e) => updateField("concurrency", parseInt(e.target.value) || 1)}
                className="mt-1.5 block w-32 rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Maks: {tier === "free" ? "1" : tier === "pro" ? "2" : "10"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex h-10 items-center rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1DAF5A] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            disabled={testing || !settings?.webhookUrl}
            onClick={async () => {
              setTesting(true);
              setTestResult(null);
              const res = await fetch("/api/webhook-test", { method: "POST" });
              const data = await res.json().catch(() => ({}));
              setTesting(false);
              setTestResult({
                ok: res.ok,
                message: res.ok ? "Webhook test sent successfully!" : data.error || "Test failed",
              });
              setTimeout(() => setTestResult(null), 5000);
            }}
            className="flex h-10 items-center rounded-xl border border-[#25D366] px-6 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/5 disabled:opacity-60"
          >
            {testing ? "Testing..." : "Test Webhook"}
          </button>
          {saved && <span className="text-sm text-green-600">Settings saved.</span>}
          {testResult && (
            <span className={`text-sm ${testResult.ok ? "text-green-600" : "text-red-500"}`}>
              {testResult.message}
            </span>
          )}
        </div>
      </form>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">Upgrade ke Pro</h3>
              <p className="mt-2 text-sm text-zinc-500">
                Buka fitur eksklusif dengan berlangganan paket Pro:
              </p>
              <ul className="mt-4 space-y-2 text-left text-sm text-zinc-600">
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Broadcast massal hingga 200 pesan/hari
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Hingga 5.000 pesan/bulan
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Concurrency 2 (kirim lebih cepat)
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Auto-reply dan chatbot rules prioritas
                </li>
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
