"use client";

import { useEffect, useState } from "react";

interface ScheduledMsg {
  id: string;
  recipients: { to: string; name?: string }[];
  body: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  isRecurring: boolean;
  recurrence: string | null;
  interval: number | null;
  nextRunAt: string | null;
  repeatCount: number;
  maxRepeats: number | null;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  pending: { label: "Pending", dot: "bg-yellow-400", bg: "bg-yellow-50" },
  processing: { label: "Processing", dot: "bg-blue-500", bg: "bg-blue-50" },
  sent: { label: "Sent", dot: "bg-[#25D366]", bg: "bg-green-50" },
  failed: { label: "Failed", dot: "bg-red-500", bg: "bg-red-50" },
  cancelled: { label: "Cancelled", dot: "bg-zinc-400", bg: "bg-zinc-50" },
};

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

export default function ScheduledPage() {
  const [messages, setMessages] = useState<ScheduledMsg[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  function fetchMessages(p?: number) {
    setLoading(true);
    const pg = p ?? page;
    const params = new URLSearchParams({ page: String(pg), limit: "15" });
    if (filter !== "all") params.set("status", filter);

    fetch(`/api/scheduler?${params}`)
      .then((r) => r.json().catch(() => ({ messages: [], total: 0, totalPages: 1 })))
      .then((data) => {
        setMessages(data.messages || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(pg);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchMessages(); }, [page, filter]);

  // Auto-trigger cron + refresh
  useEffect(() => {
    const tick = () => {
      fetch("/api/cron/process-scheduled", { method: "POST" }).catch(() => {});
      fetchMessages();
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  async function cancel(id: string) {
    await fetch(`/api/scheduler?id=${id}`, { method: "DELETE" });
    fetchMessages();
  }

  async function stopRecurring(id: string) {
    await fetch(`/api/scheduler?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop_recurring" }),
    });
    fetchMessages();
  }

  const allStatuses = ["all", "pending", "processing", "sent", "failed", "cancelled"];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Scheduled Messages</h1>
          <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
            {total > 0
              ? `${total} message${total !== 1 ? "s" : ""} scheduled for delivery.`
              : "Manage your scheduled messages."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allStatuses.map((s) => {
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => { setFilter(s); setPage(1); }}
                className={`h-9 rounded-lg px-3 text-xs font-semibold transition-colors sm:h-10 sm:rounded-xl sm:text-sm ${
                  active
                    ? "bg-[#25D366] text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {s === "all" ? "All" : statusConfig[s]?.label || s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-[#DCF8C6] bg-white py-20 text-sm text-zinc-400">
          Loading...
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-[#DCF8C6] bg-white py-20 text-sm text-zinc-400">
          No scheduled messages yet.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {messages.map((msg) => {
              const sc = statusConfig[msg.status] || { label: msg.status, dot: "bg-zinc-300", bg: "bg-zinc-50" };
              const rcpts = msg.recipients as { to: string; name?: string }[];
              return (
                <div key={msg.id} className="rounded-xl border border-[#DCF8C6] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${sc.dot}`} />
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${sc.bg} text-zinc-700`}>
                        {sc.label}
                      </span>
                      {msg.isRecurring && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                          </svg>
                          Recurring
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">{formatDate(msg.scheduledAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-zinc-500 whitespace-pre-wrap">{msg.body}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                    <span>{rcpts.length} recipient{rcpts.length !== 1 ? "s" : ""}</span>
                    {msg.nextRunAt && msg.status === "pending" && (
                      <span>• Next: {new Date(msg.nextRunAt).toLocaleDateString("id-ID", {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}</span>
                    )}
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {msg.isRecurring && msg.status === "pending" && (
                      <button
                        onClick={() => stopRecurring(msg.id)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-orange-500 transition-colors hover:bg-orange-50"
                      >
                        Stop Recurring
                      </button>
                    )}
                    {msg.status === "pending" && !msg.isRecurring && (
                      <button
                        onClick={() => cancel(msg.id)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
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
                    Scheduled At
                  </th>
                  <th className="hidden max-w-[280px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 lg:table-cell">
                    Message
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Recipients
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 xl:table-cell">
                    Recurrence
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCF8C6]">
                {messages.map((msg) => {
                  const sc = statusConfig[msg.status] || { label: msg.status, dot: "bg-zinc-300", bg: "bg-zinc-50" };
                  const rcpts = msg.recipients as { to: string; name?: string }[];
                  return (
                    <tr key={msg.id} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${sc.dot}`} />
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${sc.bg} text-zinc-700`}>
                            {sc.label}
                          </span>
                          {msg.isRecurring && (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-400">
                        {formatDate(msg.scheduledAt)}
                      </td>
                      <td className="hidden max-w-[280px] truncate px-5 py-4 text-sm text-zinc-500 lg:table-cell">
                        {msg.body}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-500">
                        <span>{rcpts.length} recipient{rcpts.length !== 1 ? "s" : ""}</span>
                      </td>
                      <td className="hidden px-5 py-4 text-sm text-zinc-400 xl:table-cell">
                        {msg.isRecurring ? (
                          <span>
                            {msg.recurrence} • {msg.repeatCount}{msg.maxRepeats != null && ` / ${msg.maxRepeats}`}x
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {msg.isRecurring && msg.status === "pending" && (
                          <button
                            onClick={() => stopRecurring(msg.id)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-orange-500 transition-colors hover:bg-orange-50"
                          >
                            Stop Recurring
                          </button>
                        )}
                        {msg.status === "pending" && !msg.isRecurring && (
                          <button
                            onClick={() => cancel(msg.id)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                          >
                            Cancel
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
