"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WaStatus = "disconnected" | "connecting" | "connected";

export default function DevicePage() {
  const [status, setStatus] = useState<WaStatus>("disconnected");
  const [phone, setPhone] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json().catch(() => ({}));
      const s = data.session || {};
      setStatus(s.status || "disconnected");
      setPhone(s.phone || null);
      if (s.status === "connected") {
        setQr(null);
        setConnecting(false);
      }
    } catch {}
  }, []);

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/qrcode");
      const data = await res.json().catch(() => ({}));
      if (data.qr) setQr(data.qr);
    } catch {}
  }, []);

  // Initial status fetch
  useEffect(() => {
    fetchStatus().finally(() => setLoading(false));
  }, [fetchStatus]);

  // Poll status & QR while connecting
  useEffect(() => {
    if (!connecting) return;
    pollRef.current = setInterval(() => {
      fetchStatus();
      fetchQR();
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [connecting, fetchStatus, fetchQR]);

  async function handleConnect() {
    setConnecting(true);
    setQr(null);
    await fetch("/api/whatsapp/connect", { method: "POST" });
  }

  async function handleDisconnect() {
    setConnecting(false);
    setQr(null);
    await fetch("/api/whatsapp/disconnect", { method: "POST" });
    fetchStatus();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">WhatsApp Device</h1>
        <p className="mt-1 text-sm text-zinc-500">Connect your WhatsApp number to send and receive messages.</p>
      </div>

      <div className="rounded-xl border border-[#DCF8C6] bg-white p-8 text-center">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <Spinner />
            <span className="text-sm text-zinc-400">Loading...</span>
          </div>
        ) : status === "connected" ? (
          <div className="space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DCF8C6]">
              <svg className="h-8 w-8 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#075E54]">Connected</h2>
            {phone && <p className="text-sm text-zinc-500">+{phone}</p>}
            <button
              onClick={handleDisconnect}
              className="rounded-lg border border-red-200 px-6 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        ) : connecting && qr ? (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[#075E54]">Scan QR Code</h2>
            <p className="text-sm text-zinc-500">Open WhatsApp on your phone, go to Settings &rarr; Linked Devices &rarr; Link a Device.</p>
            <div className="mx-auto inline-block rounded-xl border border-[#DCF8C6] bg-white p-4">
              <QrCodeSvg text={qr} />
            </div>
            <p className="text-xs text-zinc-400">Waiting for scan...</p>
            <button onClick={handleDisconnect} className="text-sm text-zinc-400 hover:text-red-500">
              Cancel
            </button>
          </div>
        ) : connecting ? (
          <div className="space-y-5 py-8">
            <Spinner />
            <h2 className="text-lg font-semibold text-[#075E54]">Connecting...</h2>
            <p className="text-sm text-zinc-500">Launching browser and initializing WhatsApp session. This may take a moment.</p>
            <button onClick={handleDisconnect} className="text-sm text-zinc-400 hover:text-red-500">
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#075E54]">Not Connected</h2>
            <p className="text-sm text-zinc-500">Connect your WhatsApp to start sending messages.</p>
            <button
              onClick={handleConnect}
              className="rounded-xl bg-[#25D366] px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A]"
            >
              Connect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="mx-auto h-8 w-8 animate-spin text-[#25D366]" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function QrCodeSvg({ text }: { text: string }) {
  const ref = useCallback((node: HTMLCanvasElement | null) => {
    if (!node) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(node, text, { width: 220, margin: 2 }, () => {});
    });
  }, [text]);

  return <canvas ref={ref} className="rounded-lg" />;
}