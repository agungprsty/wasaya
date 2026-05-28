"use client";

import { FormEvent, useEffect, useState } from "react";

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [autoReplyText, setAutoReplyText] = useState("");
  const [autoReplyActive, setAutoReplyActive] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkActive, setWatermarkActive] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json().catch(() => ({ settings: {} })))
      .then((data) => {
        const s = data.settings || {};
        setWebhookUrl(s.webhookUrl || "");
        setWebhookSecret(s.webhookSecret || "");
        setAutoReplyText(s.autoReplyText || "");
        setAutoReplyActive(s.autoReplyActive || false);
        setWatermarkText(s.watermarkText || "");
        setWatermarkActive(s.watermarkActive || false);
      });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: webhookUrl || null,
        webhookSecret: webhookSecret || null,
        autoReplyText: autoReplyText || null,
        autoReplyActive,
        watermarkText: watermarkText || null,
        watermarkActive,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Configure your webhook, auto-reply, and account settings.</p>
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
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
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
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
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
                onClick={() => setAutoReplyActive(!autoReplyActive)}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  autoReplyActive ? "bg-[#25D366]" : "bg-zinc-200"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  autoReplyActive ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
              <span className="text-sm text-zinc-700">{autoReplyActive ? "Active" : "Inactive"}</span>
            </div>
            <div>
              <label htmlFor="autoReplyText" className="block text-sm font-medium text-zinc-700">
                Auto Reply Message
              </label>
              <textarea
                id="autoReplyText"
                rows={3}
                value={autoReplyText}
                onChange={(e) => setAutoReplyText(e.target.value)}
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
                onClick={() => setWatermarkActive(!watermarkActive)}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  watermarkActive ? "bg-[#25D366]" : "bg-zinc-200"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  watermarkActive ? "translate-x-4" : "translate-x-0"
                }`} />
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
                placeholder="Dikirim via WAGateway"
              />
            </div>
            {watermarkText && (
              <div className="rounded-lg border border-[#DCF8C6] bg-[#f0fdf4] px-4 py-3">
                <p className="text-xs font-medium text-[#075E54] mb-1">Preview:</p>
                <p className="text-sm text-zinc-600">Your message here</p>
                <p className="mt-2 border-t border-[#DCF8C6] pt-2 text-xs text-zinc-400">{"---"}</p>
                <p className="text-xs text-zinc-500">{watermarkText}</p>
              </div>
            )}
            <p className="text-xs text-zinc-400">
              Watermark will be appended as a footer to all outgoing text messages when active.
            </p>
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
            disabled={testing || !webhookUrl}
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
    </div>
  );
}
