"use client";

import { useEffect, useState } from "react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-400",
  sent: "bg-blue-500",
  delivered: "bg-[#25D366]",
  failed: "bg-red-500",
};

interface Message {
  id: string;
  to: string;
  body: string;
  status: string;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [retryingAll, setRetryingAll] = useState(false);

  function fetchMessages() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/messages?${params}`)
      .then((res) => res.json().catch(() => ({ messages: [], totalPages: 1 })))
      .then((data) => {
        setMessages(data.messages || []);
        setTotalPages(data.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchMessages(); }, [page, statusFilter]);

  async function handleRetry(id: string) {
    setRetrying((prev) => new Set(prev).add(id));
    await fetch("/api/messages/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setRetrying((prev) => { const next = new Set(prev); next.delete(id); return next; });
    fetchMessages();
  }

  async function handleRetryAllFailed() {
    setRetryingAll(true);
    const failedIds = messages.filter((m) => m.status === "failed" || m.status === "pending").map((m) => m.id);
    if (failedIds.length === 0) { setRetryingAll(false); return; }
    await fetch("/api/messages/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: failedIds }),
    });
    setRetryingAll(false);
    fetchMessages();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#075E54]">Messages</h1>
            <p className="mt-1 text-sm text-zinc-500">History of all sent WhatsApp messages.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRetryAllFailed}
              disabled={retryingAll}
              className="flex h-10 items-center gap-2 rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {retryingAll ? "Retrying..." : "Retry All Failed"}
            </button>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-700 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

      <div className="overflow-hidden rounded-xl border border-[#DCF8C6] bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">No messages yet.</div>
        ) : (
          <div className="divide-y divide-[#DCF8C6]">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-4 px-6 py-4">
                <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusColors[msg.status] || "bg-zinc-300"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-zinc-900">To: {msg.to}</span>
                    <span className="text-xs capitalize text-zinc-400">{msg.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{msg.body}</p>
                  <p className="mt-1 text-xs text-zinc-400">{new Date(msg.createdAt).toLocaleString()}</p>
                </div>
                {(msg.status === "failed" || msg.status === "pending") && (
                  <button
                    onClick={() => handleRetry(msg.id)}
                    disabled={retrying.has(msg.id)}
                    className="flex h-8 shrink-0 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {retrying.has(msg.id) ? "..." : "Retry"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}