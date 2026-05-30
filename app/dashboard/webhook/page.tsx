"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useDashboard } from "../dashboard-context";

export default function WebhookPage() {
  const { settings: ctxSettings, loading: ctxLoading, refresh: dashboardRefresh } = useDashboard();

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && !ctxLoading && ctxSettings) {
      initializedRef.current = true;
      setWebhookUrl(ctxSettings.webhookUrl || "");
      setWebhookSecret(ctxSettings.webhookSecret || "");
    }
  }, [ctxLoading, ctxSettings]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: webhookUrl || null,
        webhookSecret: webhookSecret || null,
      }),
    });
    setSaving(false);
    setSaved(true);
    dashboardRefresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Webhook</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Receive real-time notifications for incoming messages and delivery updates.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <div className="space-y-4">
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
