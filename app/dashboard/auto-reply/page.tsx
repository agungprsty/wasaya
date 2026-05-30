"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useDashboard } from "../dashboard-context";

export default function AutoReplyPage() {
  const { settings: ctxSettings, loading: ctxLoading, refresh: dashboardRefresh } = useDashboard();

  const [autoReplyActive, setAutoReplyActive] = useState(false);
  const [autoReplyText, setAutoReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && !ctxLoading && ctxSettings) {
      initializedRef.current = true;
      setAutoReplyActive(ctxSettings.autoReplyActive);
      setAutoReplyText(ctxSettings.autoReplyText || "");
    }
  }, [ctxLoading, ctxSettings]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoReplyText: autoReplyText || null,
        autoReplyActive,
      }),
    });
    setSaving(false);
    setSaved(true);
    dashboardRefresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">Auto Reply</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Automatically reply to the first message from each contact every day.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAutoReplyActive(!autoReplyActive)}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  autoReplyActive ? "bg-[#25D366]" : "bg-zinc-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    autoReplyActive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
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
                placeholder="Hello, thank you for reaching out. We will get back to you shortly."
              />
            </div>
            <p className="text-xs text-zinc-400">
              This message is sent once per day as the first reply to each contact. Auto-reply
              runs before chatbot keyword-based rules.
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
          {saved && <span className="text-sm text-green-600">Settings saved.</span>}
        </div>
      </form>
    </div>
  );
}
