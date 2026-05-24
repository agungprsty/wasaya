"use client";

import { useEffect, useState } from "react";

interface ScheduledMsg {
  id: string;
  recipients: { to: string; name?: string }[];
  body: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  sent: "border-green-200 bg-green-50 text-green-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-500",
};

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

  function getStatusBadge(status: string) {
    const style = statusStyles[status] || "border-zinc-200 bg-zinc-50 text-zinc-500";
    return `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`;
  }

  const countByStatus = {
    pending: messages.filter((m) => m.status === "pending").length,
    sent: messages.filter((m) => m.status === "sent").length,
    failed: messages.filter((m) => m.status === "failed").length,
    cancelled: messages.filter((m) => m.status === "cancelled").length,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#075E54]">Scheduled Messages</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total > 0
              ? `${total} message${total !== 1 ? "s" : ""} — ${countByStatus.pending} pending, ${countByStatus.sent} sent, ${countByStatus.failed} failed, ${countByStatus.cancelled} cancelled`
              : "Manage your scheduled messages."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["all", "pending", "sent", "failed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-[#25D366] text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#DCF8C6] bg-white">
        {loading ? (
          <div className="p-12 text-center text-sm text-zinc-400">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-10 w-10 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm text-zinc-400">
              {filter !== "all" ? `No ${filter} messages.` : "No scheduled messages yet."}
            </p>
            <p className="mt-1 text-xs text-zinc-300">
              Go to <a href="/dashboard/send" className="text-[#25D366] hover:underline">Send Message</a> or{" "}
              <a href="/dashboard/broadcast" className="text-[#25D366] hover:underline">Broadcast</a> and use the Schedule toggle.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#DCF8C6]">
            {messages.map((msg) => {
              const rcpts = msg.recipients as { to: string; name?: string }[];
              return (
                <div key={msg.id} className="px-6 py-4 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={getStatusBadge(msg.status)}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            msg.status === "pending" ? "bg-yellow-400" :
                            msg.status === "processing" ? "bg-blue-400" :
                            msg.status === "sent" ? "bg-green-400" :
                            msg.status === "failed" ? "bg-red-400" : "bg-zinc-400"
                          }`} />
                          {msg.status}
                        </span>
                        <span className="text-xs text-zinc-400">
                          <svg className="-mt-0.5 mr-0.5 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(msg.scheduledAt).toLocaleDateString("id-ID", {
                            weekday: "short", year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {msg.status === "pending" && new Date(msg.scheduledAt) <= new Date() && (
                          <span className="text-[10px] font-medium text-red-500">Overdue</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-zinc-700 line-clamp-2 whitespace-pre-wrap">{msg.body}</p>
                      <div className="mt-1.5">
                        <span className="text-xs text-zinc-400">
                          {rcpts.length} recipient{rcpts.length !== 1 ? "s" : ""}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {rcpts.slice(0, 5).map((r, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-md bg-[#DCF8C6]/40 px-2 py-0.5 text-[10px] text-[#075E54]">
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#DCF8C6] text-[8px] font-semibold">
                                {(r.name || r.to).charAt(0).toUpperCase()}
                              </span>
                              {r.name || r.to}
                            </span>
                          ))}
                          {rcpts.length > 5 && (
                            <span className="text-[10px] text-zinc-400">+{rcpts.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-start gap-2 pt-1">
                      {msg.status === "pending" && (
                        <button
                          onClick={() => cancel(msg.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
