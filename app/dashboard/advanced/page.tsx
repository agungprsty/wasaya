"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useDashboard } from "../dashboard-context";

export default function AdvancedPage() {
  const {
    settings: ctxSettings,
    subscription: ctxSub,
    loading: ctxLoading,
    proxyUrl: ctxProxyUrl,
    refresh: dashboardRefresh,
  } = useDashboard();

  const [broadcastEnabled, setBroadcastEnabled] = useState(false);
  const [concurrency, setConcurrency] = useState(1);
  const [adminNumbers, setAdminNumbers] = useState<string[]>([]);
  const [safetyMode, setSafetyMode] = useState("normal");
  const [msPerChar, setMsPerChar] = useState(100);
  const [readDelayMs, setReadDelayMs] = useState(1500);
  const [typingEnabled, setTypingEnabled] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initializedRef = useRef(false);

  const tier = ctxSub?.tier || "free";
  const isFree = tier === "free";
  const isEnterprise = tier === "enterprise";

  useEffect(() => {
    if (!initializedRef.current && !ctxLoading && ctxSettings) {
      initializedRef.current = true;
      setBroadcastEnabled(ctxSettings.broadcastEnabled);
      setConcurrency(ctxSettings.concurrency ?? 1);
      setAdminNumbers(ctxSettings.adminNumbers ?? []);
      setSafetyMode(ctxSettings.safetyMode || "normal");
      setMsPerChar(ctxSettings.msPerChar ?? 100);
      setReadDelayMs(ctxSettings.readDelayMs ?? 1500);
      setTypingEnabled(ctxSettings.typingEnabled ?? false);
      setProxyUrl(typeof ctxProxyUrl === "string" ? ctxProxyUrl : "");
    }
  }, [ctxLoading, ctxSettings, ctxProxyUrl]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broadcastEnabled,
        concurrency,
        adminNumbers,
        safetyMode,
        msPerChar,
        readDelayMs,
        typingEnabled,
        proxyUrl: proxyUrl || null,
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
        <h1 className="text-2xl font-semibold text-[#075E54]">Advanced</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Safety controls, broadcast settings, and human mimicry.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-6">
          <div className="space-y-5">
            {/* Safety Mode */}
            <div>
              <label htmlFor="safetyMode" className="block text-sm font-medium text-zinc-700">
                Safety Mode
              </label>
              <p className="mt-0.5 text-xs text-zinc-400">
                <strong>Strict</strong> mode reduces sending speed and introduces random delays to reduce the risk of flagging.
              </p>
              <select
                id="safetyMode"
                value={safetyMode}
                onChange={(e) => setSafetyMode(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              >
                <option value="normal">Normal</option>
                <option value="ketat">Strict (Slow & Safe)</option>
              </select>
            </div>

            {/* Admin Numbers */}
            {!isFree && (
              <div>
                <label htmlFor="adminNumbers" className="block text-sm font-medium text-zinc-700">
                  Admin Numbers
                </label>
                <p className="mt-0.5 text-xs text-zinc-400">
                  These numbers are exempt from per-minute conversation throttling. Separate by comma.
                  {tier === "pro" && " Max 3 numbers."}
                </p>
                <input
                  id="adminNumbers"
                  type="text"
                  value={adminNumbers.join(", ")}
                  onChange={(e) => {
                    const nums = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                    const max = tier === "pro" ? 3 : Infinity;
                    setAdminNumbers(nums.slice(0, max));
                  }}
                  placeholder={tier === "pro" ? "628123456789, 628987654321" : "628123456789, 628987654321"}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
                />
              </div>
            )}

            {/* Broadcast Toggle */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">Broadcast Mode</span>
                {isFree && (
                  <span className="text-xs text-zinc-400" title="Available on Pro tier and above">
                    <svg
                      className="inline-block h-4 w-4"
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
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                  {isFree
                    ? "Mass broadcast is available on Pro tier and above. Upgrade to enable."
                    : "Send messages to multiple contacts simultaneously."}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isFree}
                  onClick={() => setBroadcastEnabled(!broadcastEnabled)}
                  className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    isFree ? "cursor-not-allowed opacity-50" : ""
                  } ${broadcastEnabled ? "bg-[#25D366]" : "bg-zinc-200"}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      broadcastEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-zinc-700">
                  {isFree ? (
                    <span className="flex items-center gap-1">
                      <svg
                        className="h-3.5 w-3.5 text-zinc-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                        />
                      </svg>
                      Locked
                    </span>
                  ) : broadcastEnabled ? "Active" : "Inactive"}
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
                max={isEnterprise ? 10 : tier === "pro" ? 2 : 1}
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
                className="mt-1.5 block w-32 rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Max: {isFree ? "1" : tier === "pro" ? "2" : "10"}
              </p>
            </div>

            {/* Proxy URL — Enterprise Only */}
            {isEnterprise && (
              <div>
                <label htmlFor="proxyUrl" className="block text-sm font-medium text-zinc-700">
                  Proxy URL
                </label>
                <p className="mt-0.5 text-xs text-zinc-400">
                  SOCKS5 proxy to isolate the device IP address. Example:{" "}
                  <code className="text-xs">socks5://user:pass@host:1080</code>
                </p>
                <input
                  id="proxyUrl"
                  type="text"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="socks5://user:pass@host:1080"
                  className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 font-mono"
                />
              </div>
            )}

            {/* Human Mimicry — Enterprise Only */}
            {isEnterprise && (
              <div className="border-t border-[#DCF8C6] pt-5">
                <h3 className="text-sm font-semibold text-[#075E54]">Human Mimicry</h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Control delivery speed and delays to mimic human behavior.
                </p>

                <div className="mt-4">
                  <label htmlFor="msPerChar" className="block text-sm font-medium text-zinc-700">
                    Typing Speed: {msPerChar} ms/char
                  </label>
                  <input
                    id="msPerChar"
                    type="range"
                    min={30}
                    max={500}
                    step={10}
                    value={msPerChar}
                    onChange={(e) => setMsPerChar(parseInt(e.target.value))}
                    className="mt-2 w-full accent-[#25D366]"
                  />
                  <div className="mt-1 flex justify-between text-xs text-zinc-400">
                    <span>30 ms (fast)</span>
                    <span>500 ms (slow)</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="readDelayMs" className="block text-sm font-medium text-zinc-700">
                    Reading Delay: {readDelayMs} ms
                  </label>
                  <input
                    id="readDelayMs"
                    type="range"
                    min={300}
                    max={10000}
                    step={100}
                    value={readDelayMs}
                    onChange={(e) => setReadDelayMs(parseInt(e.target.value))}
                    className="mt-2 w-full accent-[#25D366]"
                  />
                  <div className="mt-1 flex justify-between text-xs text-zinc-400">
                    <span>300 ms</span>
                    <span>10.000 ms</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTypingEnabled(!typingEnabled)}
                    className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                      typingEnabled ? "bg-[#25D366]" : "bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        typingEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-zinc-700">
                    {typingEnabled ? "Typing simulation active" : "Typing simulation inactive"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  When enabled, messages are sent with a typing delay (msPerChar × message length) plus
                  a reading delay (readDelayMs) for each incoming session.
                </p>
              </div>
            )}
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
