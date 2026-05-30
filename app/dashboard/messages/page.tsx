"use client";

import { useEffect, useState } from "react";

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  pending: { label: "Pending", dot: "bg-yellow-400", bg: "bg-yellow-50" },
  sent: { label: "Sent", dot: "bg-blue-500", bg: "bg-blue-50" },
  received: { label: "Received", dot: "bg-[#25D366]", bg: "bg-green-50" },
  delivered: { label: "Delivered", dot: "bg-emerald-500", bg: "bg-emerald-50" },
  read: { label: "Read", dot: "bg-purple-500", bg: "bg-purple-50" },
  failed: { label: "Failed", dot: "bg-red-500", bg: "bg-red-50" },
};

interface Message {
  id: string;
  to: string;
  from: string;
  body: string;
  status: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function cleanJid(jid: string): string {
  return jid.split("@")[0];
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Messages</h1>
          <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
            History of all sent WhatsApp messages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/messages/export"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 sm:h-10 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 16.5V3" />
            </svg>
            Export
          </a>
          <button
            onClick={handleRetryAllFailed}
            disabled={retryingAll}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-red-300 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 sm:h-10 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
          >
            {retryingAll ? "Retrying..." : "Retry Failed"}
          </button>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-700 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/15 sm:h-10 sm:rounded-xl sm:px-4 sm:text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-[#DCF8C6] bg-white py-20 text-sm text-zinc-400">
          Loading...
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-[#DCF8C6] bg-white py-20 text-sm text-zinc-400">
          No messages yet.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {messages.map((msg) => {
              const sc = statusConfig[msg.status] || { label: msg.status, dot: "bg-zinc-300", bg: "bg-zinc-50" };
              const failed = msg.status === "failed" || msg.status === "pending";
              return (
                <div key={msg.id} className="rounded-xl border border-[#DCF8C6] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${sc.dot}`} />
                      <span className="text-xs font-medium capitalize text-zinc-600">{sc.label}</span>
                    </div>
                    <span className="text-xs text-zinc-400">{formatDate(msg.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    <span className="text-zinc-400">From:</span> {cleanJid(msg.from)}
                  </p>
                  <p className="text-xs font-medium text-zinc-800">
                    <span className="text-zinc-400">To:</span> {msg.status === "received" ? "me" : cleanJid(msg.to)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{msg.body}</p>
                  {failed && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleRetry(msg.id)}
                        disabled={retrying.has(msg.id)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {retrying.has(msg.id) ? "..." : "Retry"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: proper table */}
          <div className="hidden overflow-hidden rounded-xl border border-[#DCF8C6] bg-white sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#DCF8C6] bg-zinc-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    From
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    To
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 md:table-cell">
                    Message
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Sent At
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCF8C6]">
                {messages.map((msg) => {
                  const sc = statusConfig[msg.status] || { label: msg.status, dot: "bg-zinc-300", bg: "bg-zinc-50" };
                  const failed = msg.status === "failed" || msg.status === "pending";
                  return (
                    <tr key={msg.id} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${sc.dot}`} />
                          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${sc.bg} text-zinc-700`}>
                            {sc.label}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[160px] truncate px-5 py-4 text-sm text-zinc-500">
                        {cleanJid(msg.from)}
                      </td>
                      <td className="max-w-[160px] truncate px-5 py-4 text-sm font-medium text-zinc-800">
                        {msg.status === "received" ? "Me" : cleanJid(msg.to)}
                      </td>
                      <td className="hidden max-w-[280px] truncate px-5 py-4 text-sm text-zinc-500 md:table-cell">
                        {msg.body}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-400">
                        {formatDate(msg.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {failed && (
                          <button
                            onClick={() => handleRetry(msg.id)}
                            disabled={retrying.has(msg.id)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {retrying.has(msg.id) ? "..." : "Retry"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40 sm:px-4 sm:text-sm"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500 sm:text-sm">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40 sm:px-4 sm:text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
