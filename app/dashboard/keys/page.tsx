"use client";

import { useEffect, useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  function fetchKeys() {
    setLoading(true);
    fetch("/api/keys")
      .then((res) => res.json().catch(() => ({ keys: [] })))
      .then((data) => setKeys(data.keys || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchKeys(); }, []);

  async function handleGenerate() {
    if (!name.trim()) return;
    setError("");
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (res.ok) {
      setNewKey(data.key?.key);
      setName("");
      fetchKeys();
    } else {
      setError(data.error || "Failed to create key");
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#075E54]">API Keys</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage API keys for programmatic access.</p>
      </div>

      {/* Generate new key */}
      <div className="mb-8 rounded-xl border border-[#DCF8C6] bg-white p-6">
        <h2 className="text-sm font-semibold text-[#075E54]">Create new key</h2>
        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production Key"
            className="block flex-1 rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            className="flex h-10 items-center rounded-lg bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1DAF5A]"
          >
            Generate
          </button>
        </div>
      </div>

      {/* Show newly created key */}
      {newKey && (
        <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="text-sm font-medium text-green-700">Key created! Copy it now — it won&apos;t be shown again.</p>
          <div className="mt-3 flex gap-2">
            <code className="flex-1 truncate rounded-lg bg-white px-4 py-2.5 text-sm font-mono text-zinc-800 border border-green-200">
              {newKey}
            </code>
            <button
              onClick={() => copyToClipboard(newKey)}
              className="rounded-lg bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Key list */}
      <div className="overflow-hidden rounded-xl border border-[#DCF8C6] bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">No API keys yet.</div>
        ) : (
          <div className="divide-y divide-[#DCF8C6]">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{k.name}</p>
                  <code className="mt-0.5 block text-xs text-zinc-400 font-mono">
                    {k.key.substring(0, 20)}...
                  </code>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="text-sm text-zinc-400 hover:text-red-500"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}