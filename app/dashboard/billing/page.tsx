"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface TransactionData {
  id: string;
  orderId: string;
  plan: string;
  amount: number;
  paymentType: string;
  status: string;
  createdAt: string;
}

const statusBadge: Record<string, { label: string; dot: string; bg: string }> = {
  order: { label: "Order", dot: "bg-blue-400", bg: "bg-blue-50" },
  pending: { label: "Pending", dot: "bg-yellow-400", bg: "bg-yellow-50" },
  success: { label: "Success", dot: "bg-[#25D366]", bg: "bg-green-50" },
  failed: { label: "Failed", dot: "bg-red-500", bg: "bg-red-50" },
  cancelled: { label: "Cancelled", dot: "bg-gray-400", bg: "bg-gray-50" },
  expired: { label: "Expired", dot: "bg-orange-400", bg: "bg-orange-50" },
};

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<string>("FREE");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [showModal, setShowModal] = useState(searchParams.get("upgrade") === "pro");
  const [ordering, setOrdering] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        setPlan(d.plan || "FREE");
        setPlanExpiresAt(d.planExpiresAt || null);
      })
      .catch(() => {});

    fetch("/api/subscription/transactions")
      .then((r) => r.json().catch(() => ({ data: [] })))
      .then((d) => {
        const list = d.data || [];
        setTransactions(list);
        const active = list.find((t: any) => t.status === "order" || t.status === "pending");
        if (active) setPendingOrderId(active.orderId);
      })
      .catch(() => {});
  }, []);

  const isProActive = plan === "PRO" && planExpiresAt && new Date(planExpiresAt) > new Date();
  const isExpired = plan === "PRO" && planExpiresAt && new Date(planExpiresAt) <= new Date();

  const handleCancel = async (orderId: string) => {
    setCancelling(orderId);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        setTransactions((prev) => prev.map((t) => t.orderId === orderId ? { ...t, status: "cancelled" } : t));
      }
    } catch {}
    setCancelling(null);
  };

  const handleCreateOrder = async () => {
    setOrdering(true);
    setError("");

    try {
      const res = await fetch("/api/subscription/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "PRO" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.existingOrderId) {
          router.push(`/dashboard/billing/payment/${data.existingOrderId}`);
          return;
        }
        setError(data.error || "Failed to create order");
      } else {
        router.push(`/dashboard/billing/payment/${data.orderId}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Billing & Subscription</h1>
      <p className="mt-1 text-sm text-zinc-500">Manage your plan and payment history.</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Current Plan</p>
          <p className="text-lg font-bold mt-1 text-zinc-900">{plan === "PRO" ? "Pro" : plan === "ENTERPRISE" ? "Enterprise" : "Free"}</p>
          {plan === "PRO" && planExpiresAt && (
            <p className={`text-sm mt-0.5 ${isExpired ? "text-red-600" : "text-[#25D366]"}`}>
              {isExpired ? "Expired" : "Active until"} {new Date(planExpiresAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
        {!isProActive && !pendingOrderId && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-[#075E54] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#054d44]"
          >
            {isExpired ? "Renew Pro" : "Upgrade to Pro"}
          </button>
        )}
      </div>

      {pendingOrderId && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm">
          <svg className="h-5 w-5 shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-orange-800">
            You have an unpaid order.{" "}
            <button onClick={() => router.push(`/dashboard/billing/payment/${pendingOrderId}`)} className="font-medium underline transition-colors hover:text-orange-900">
              Pay now
            </button>{" "}
            or cancel it from the transaction list below.
          </span>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">No transactions yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] md:min-w-0">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="px-3 py-3 text-left">Order ID</th>
                  <th className="px-3 py-3 text-left hidden sm:table-cell">Date</th>
                  <th className="px-3 py-3 text-right hidden sm:table-cell">Amount</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const badge = statusBadge[tx.status] || { label: tx.status, dot: "bg-gray-400", bg: "bg-gray-50" };
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => router.push(`/dashboard/billing/payment/${tx.orderId}`)}
                      className="cursor-pointer border-b border-gray-50 text-sm transition-colors hover:bg-zinc-50 last:border-0"
                    >
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${badge.dot}`} />
                          <div>
                            <p className="font-medium text-zinc-800">{tx.orderId}</p>
                            <p className="text-xs text-zinc-400 sm:hidden">{new Date(tx.createdAt).toLocaleDateString("id-ID")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-zinc-500 hidden sm:table-cell">{new Date(tx.createdAt).toLocaleDateString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-medium text-zinc-900 hidden sm:table-cell">Rp {tx.amount.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${badge.bg} text-zinc-700`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {(tx.status === "order" || tx.status === "pending") && (
                          <div className="flex items-center justify-end gap-2">
                            {tx.status === "order" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/billing/payment/${tx.orderId}`) }}
                                className="cursor-pointer rounded-lg border border-[#075E54] px-2.5 py-1 text-xs font-medium text-[#075E54] transition-colors hover:bg-[#075E54] hover:text-white"
                              >
                                Pay now
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancel(tx.orderId) }}
                              disabled={cancelling === tx.orderId}
                              className="cursor-pointer rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                            >
                              {cancelling === tx.orderId ? "..." : "Cancel"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!ordering) setShowModal(false) }}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-zinc-900">Upgrade to Pro</h2>
            <p className="mt-1 text-sm text-zinc-500">5,000 messages / month &bull; 4 devices &bull; No watermark &bull; Priority support</p>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Pro Plan</span>
                <span className="font-medium text-zinc-900">Rp 49.000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Service Fee</span>
                <span className="font-medium text-zinc-900">Rp 3.500</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-sm font-semibold text-zinc-900">
                <span>Total</span>
                <span>Rp 52.500</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleCreateOrder}
              disabled={ordering}
              className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#075E54] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#054d44] disabled:opacity-60"
            >
              {ordering ? "Creating order..." : "Buat Pesanan"}
            </button>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-2 flex h-11 w-full items-center justify-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
