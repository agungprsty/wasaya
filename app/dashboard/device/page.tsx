"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface WaDevice {
  id: string;
  deviceId: string;
  name: string;
  status: "disconnected" | "connecting" | "connected";
  phone: string | null;
}

export default function DevicePage() {
  const [devices, setDevices] = useState<WaDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [connectingStates, setConnectingStates] = useState<Record<string, boolean>>({});
  const [qrStates, setQrStates] = useState<Record<string, string | null>>({});
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastErrorShown = useRef<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/devices");
      const data = await res.json().catch(() => ({}));
      if (data.devices) {
        setDevices(data.devices);
      }
    } catch {}
    setLoading(false);
  }, []);

  const fetchStatus = useCallback(async (deviceId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/status?deviceId=${deviceId}`);
      const data = await res.json().catch(() => ({}));
      const s = data.session || {};
      if (s.status === "connected" || s.lastError) {
        setConnectingStates((prev) => ({ ...prev, [deviceId]: false }));
        setQrStates((prev) => ({ ...prev, [deviceId]: null }));
      }
      if (s.lastError && s.lastError !== lastErrorShown.current) {
        lastErrorShown.current = s.lastError;
        toast.error(s.lastError);
      }
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === deviceId
            ? { ...d, status: s.status, phone: s.phone ?? d.phone }
            : d,
        ),
      );
    } catch {}
  }, []);

  const qrSeen = useRef<Record<string, boolean>>({});

  const fetchQR = useCallback(async (deviceId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/qrcode?deviceId=${deviceId}`);
      const data = await res.json().catch(() => ({}));
      if (data.qr) {
        setQrStates((prev) => ({ ...prev, [deviceId]: data.qr }));
        if (!qrSeen.current[deviceId]) {
          qrSeen.current[deviceId] = true;
          setCountdowns((p) => ({ ...p, [deviceId]: 30 }));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/whatsapp/devices")
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data.devices) {
          setDevices(data.devices);
          for (const d of data.devices) {
            if (d.status === "connected") {
              setConnectingStates((prev) => ({ ...prev, [d.deviceId]: false }));
              setQrStates((prev) => ({ ...prev, [d.deviceId]: null }));
            }
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const activeConnectingDevices = devices.filter(
    (d) => d.status === "connecting" || connectingStates[d.deviceId],
  );

  useEffect(() => {
    if (activeConnectingDevices.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    const run = () => {
      for (const d of activeConnectingDevices) {
        fetchStatus(d.deviceId);
        fetchQR(d.deviceId);
      }
    };
    run();
    pollRef.current = setInterval(run, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnectingDevices.length]);

  useEffect(() => {
    const intervals: Record<string, ReturnType<typeof setInterval>> = {};
    for (const d of devices) {
      const key = d.deviceId;
      const isConnecting = connectingStates[key];
      const qr = qrStates[key];
      const needsCountdown = (isConnecting && !qr) || qr;
      if (!needsCountdown || intervals[key]) continue;
      const max = qr ? 30 : d.phone ? 30 : 20;
      intervals[key] = setInterval(() => {
        setCountdowns((prev) => {
          const next = (prev[key] ?? max) - 1;
          if (next <= 0) {
            clearInterval(intervals[key]);
            setConnectingStates((s) => ({ ...s, [key]: false }));
            setQrStates((s) => ({ ...s, [key]: null }));
            return { ...prev, [key]: 0 };
          }
          return { ...prev, [key]: next };
        });
      }, 1000);
    }
    return () => {
      for (const k of Object.keys(intervals)) clearInterval(intervals[k]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices.length, connectingStates, qrStates]);

  async function handleConnect(deviceId: string, hasPhone = false) {
    qrSeen.current[deviceId] = false;
    lastErrorShown.current = null;
    setConnectingStates((prev) => ({ ...prev, [deviceId]: true }));
    setQrStates((prev) => ({ ...prev, [deviceId]: null }));
    setCountdowns((prev) => ({ ...prev, [deviceId]: hasPhone ? 30 : 20 }));
    try {
      const res = await fetch(`/api/whatsapp/connect?deviceId=${deviceId}`, { method: "POST" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        toast.error(error || "Failed to connect");
        setConnectingStates((prev) => ({ ...prev, [deviceId]: false }));
        return;
      }
    } catch {
      toast.error("Network error while connecting");
      setConnectingStates((prev) => ({ ...prev, [deviceId]: false }));
      return;
    }
  }

  async function handleDisconnect(deviceId: string) {
    qrSeen.current[deviceId] = false;
    setConnectingStates((prev) => ({ ...prev, [deviceId]: false }));
    setQrStates((prev) => ({ ...prev, [deviceId]: null }));
    await fetch(`/api/whatsapp/disconnect?deviceId=${deviceId}`, { method: "POST" });
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === deviceId ? { ...d, status: "disconnected" } : d,
      ),
    );
  }

  async function handleAddDevice() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/whatsapp/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add device");
      setNewName("");
      setAddForm(false);
      await fetchDevices();
    } catch {}
    setAdding(false);
  }

  async function handleDeleteDevice(deviceId: string) {
    await fetch(`/api/whatsapp/devices?deviceId=${deviceId}`, { method: "DELETE" });
    setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    setConnectingStates((prev) => {
      const next = { ...prev };
      delete next[deviceId];
      return next;
    });
    setQrStates((prev) => {
      const next = { ...prev };
      delete next[deviceId];
      return next;
    });
    setCountdowns((prev) => {
      const next = { ...prev };
      delete next[deviceId];
      return next;
    });
  }

  function handleRenameBlur(deviceId: string) {
    const newNameVal = editingName[deviceId]?.trim();
    if (newNameVal) {
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === deviceId ? { ...d, name: newNameVal } : d)),
      );
    }
    setEditingName((prev) => {
      const next = { ...prev };
      delete next[deviceId];
      return next;
    });
  }

  function handleRenameKeyDown(deviceId: string, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setEditingName((prev) => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setAddForm(false);
      }
    }
    if (addForm) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addForm]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#075E54]">WhatsApp Devices</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your WhatsApp device connections.</p>
        </div>
        {devices.length >= 4 ? (
          <p className="text-xs text-zinc-400">Maximum 4 devices reached. Delete a device to add a new one.</p>
        ) : (
          <button
          onClick={() => setAddForm(true)}
          className="flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Device
        </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20">
          <Spinner />
          <span className="text-sm text-zinc-400">Loading devices...</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-xl border border-[#DCF8C6] bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#075E54]">No Devices</h2>
          <p className="mt-1 text-sm text-zinc-500">Add your first WhatsApp device to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {devices.map((device) => {
            const key = device.deviceId;
            const isConnecting = connectingStates[key];
            const qr = qrStates[key];
            const cd = countdowns[key] ?? 0;
            const isEditing = editingName[key] !== undefined;

            return (
              <div key={key} className="rounded-xl border border-[#DCF8C6] bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName[key]}
                        onChange={(e) =>
                          setEditingName((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        onBlur={() => handleRenameBlur(key)}
                        onKeyDown={(e) => handleRenameKeyDown(key, e)}
                        className="rounded-lg border border-[#DCF8C6] px-2 py-1 text-sm font-semibold text-[#075E54] outline-none focus:border-[#25D366]"
                        autoFocus
                      />
                    ) : (
                      <h3
                        className="cursor-pointer text-lg font-semibold text-[#075E54] hover:text-[#25D366]"
                        onClick={() =>
                          setEditingName((prev) => ({
                            ...prev,
                            [key]: device.name,
                          }))
                        }
                      >
                        {device.name}
                      </h3>
                    )}
                    {!isEditing && device.deviceId !== "main" && (
                      <button
                        onClick={() =>
                          setEditingName((prev) => ({
                            ...prev,
                            [key]: device.name,
                          }))
                        }
                        className="text-zinc-400 hover:text-[#075E54]"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={device.status} isConnecting={!!isConnecting} hasQR={!!qr} />
                    {device.status === "disconnected" && device.deviceId !== "main" && (
                      <button
                        onClick={() => handleDeleteDevice(key)}
                        className="text-zinc-400 hover:text-red-500"
                        title="Delete device"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {device.status === "disconnected" && !isConnecting ? (
                  <div className="space-y-4">
                    <div className="text-sm text-zinc-500">
                      <span className="font-medium text-zinc-700">Phone:</span>{" "}
                      {device.phone ? `+${device.phone}` : "-"}
                    </div>
                    <button
                      onClick={() => handleConnect(key, !!device.phone)}
                      className="rounded-xl bg-[#25D366] px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A]"
                    >
                      {device.phone ? "Reconnect" : "Connect"}
                    </button>
                  </div>
                ) : device.status === "connected" && !isConnecting ? (
                  <div className="space-y-4">
                    <div className="text-sm text-zinc-500">
                      <span className="font-medium text-zinc-700">Phone:</span>{" "}
                      {device.phone ? `+${device.phone}` : "-"}
                    </div>
                    <button
                      onClick={() => handleDisconnect(key)}
                      className="rounded-lg border border-red-200 px-6 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : qr ? (
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-zinc-500">
                      Open WhatsApp on your phone, go to Settings &rarr; Linked Devices &rarr; Link a Device.
                    </p>
                    <div className="mx-auto inline-block rounded-xl border border-[#DCF8C6] bg-white p-4">
                      <QrCodeSvg text={qr} />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
                      <div className={`h-1.5 w-16 rounded-full bg-zinc-200 ${cd <= 5 ? "animate-pulse" : ""}`}>
                        <div
                          className="h-full rounded-full bg-[#25D366] transition-all duration-1000"
                          style={{ width: `${(cd / 30) * 100}%` }}
                        />
                      </div>
                      <span className={cd <= 5 ? "font-semibold text-red-500" : ""}>{cd}s</span>
                    </div>
                    <button
                      onClick={() => handleDisconnect(key)}
                      className="text-sm text-zinc-400 hover:text-red-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <Spinner />
                    <p className="text-sm text-zinc-500">Launching browser and initializing WhatsApp session.</p>
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
                      <div className={`h-1.5 w-16 rounded-full bg-zinc-200 ${cd <= 5 ? "animate-pulse" : ""}`}>
                        <div
                          className="h-full rounded-full bg-[#25D366] transition-all duration-1000"
                          style={{ width: `${(cd / (device.phone ? 30 : 20)) * 100}%` }}
                        />
                      </div>
                      <span className={cd <= 5 ? "font-semibold text-red-500" : ""}>{cd}s</span>
                    </div>
                    <button
                      onClick={() => handleDisconnect(key)}
                      className="text-sm text-zinc-400 hover:text-red-500"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {addForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div ref={modalRef} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-[#075E54]">Add Device</h3>
            <input
              type="text"
              placeholder="Device name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddDevice();
              }}
              className="w-full rounded-xl border border-[#DCF8C6] px-4 py-3 text-sm outline-none transition-colors focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/15"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setAddForm(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDevice}
                disabled={adding || !newName.trim()}
                className="rounded-xl bg-[#25D366] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  isConnecting,
  hasQR,
}: {
  status: string;
  isConnecting: boolean;
  hasQR: boolean;
}) {
  if (isConnecting && hasQR) {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">
        Scan QR
      </span>
    );
  }
  if (status === "connected" && !isConnecting) {
    return (
      <span className="rounded-full bg-[#DCF8C6] px-3 py-0.5 text-xs font-medium text-[#075E54]">
        Connected
      </span>
    );
  }
  if (status === "connecting" || isConnecting) {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-0.5 text-xs font-medium text-yellow-700">
        Connecting...
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-medium text-zinc-500">
      Disconnected
    </span>
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
      QRCode.toCanvas(node, text, { width: 180, margin: 2 }, () => {});
    });
  }, [text]);
  return <canvas ref={ref} className="rounded-lg" />;
}
