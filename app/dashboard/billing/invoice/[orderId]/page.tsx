"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";

interface InvoiceData {
  orderId: string;
  plan: string;
  amount: number;
  paymentType: string;
  bank: string;
  status: string;
  vaNumber: string;
  paidAt: string;
  createdAt: string;
}

interface UserData {
  name: string;
  email: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();

  const [tx, setTx] = useState<InvoiceData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/subscription/transactions")
        .then((r) => r.json().catch(() => ({ data: [] })))
        .then((d) => {
          const found = (d.data || []).find((t: any) => t.orderId === orderId);
          if (!found) throw new Error("Transaction not found");
          if (found.status !== "success") throw new Error("Transaction is not yet paid");
          return found;
        }),
      fetch("/api/auth/me")
        .then((r) => r.json().catch(() => ({})))
        .then((d) => d.user || null),
    ])
      .then(([found, userData]) => {
        setTx(found);
        setUser(userData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  const serviceFee = 3500;
  const planPrice = 49000;
  const total = planPrice + serviceFee;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Invoice</h1>
        <p className="mt-4 text-sm text-red-600">{error}</p>
        <button
          onClick={() => router.push("/dashboard/billing")}
          className="mt-4 text-sm font-medium text-[#075E54] underline transition-colors hover:text-[#054d44]"
        >
          Back to Billing
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Invoice</h1>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#075E54] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#054d44] print:hidden"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          Download PDF
        </button>
      </div>

      <div
        id="invoice-content"
        className="rounded-xl border border-gray-200 bg-white p-8 sm:p-12"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#075E54]">TEMANWA</h2>
            <p className="mt-1 text-xs text-zinc-400">WhatsApp Gateway Service</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-zinc-900">INVOICE</p>
            <p className="mt-1 text-xs text-zinc-500">{tx.orderId}</p>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Bill To</p>
            <p className="mt-1 font-medium text-zinc-900">{user?.name || "-"}</p>
            <p className="text-zinc-500">{user?.email || "-"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Invoice Date</p>
            <p className="mt-1 text-zinc-900">{formatDate(tx.paidAt || tx.createdAt)}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Payment Method</p>
            <p className="mt-1 text-zinc-900">
              {tx.paymentType === "bank_transfer"
                ? `Bank Transfer (${(tx.bank || "").toUpperCase()})`
                : "QRIS"}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
              <th className="pb-3">Description</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-4">
                <p className="font-medium text-zinc-900">Pro Plan</p>
                <p className="text-xs text-zinc-400">
                  5,000 messages/month &middot; 4 devices &middot; Unlimited contacts
                </p>
              </td>
              <td className="py-4 text-right font-medium text-zinc-900">
                Rp {planPrice.toLocaleString("id-ID")}
              </td>
            </tr>
            <tr>
              <td className="py-4">
                <p className="text-zinc-500">Service Fee</p>
              </td>
              <td className="py-4 text-right text-zinc-500">
                Rp {serviceFee.toLocaleString("id-ID")}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
          <div className="w-56 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="text-zinc-900">Rp {planPrice.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Service Fee</span>
              <span className="text-zinc-900">Rp {serviceFee.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-zinc-900">
              <span>Total</span>
              <span>Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-[#DCF8C6]/30 p-4 text-center text-xs text-zinc-500">
          <p className="font-medium text-[#075E54]">Thank you for choosing TEMANWA</p>
          <p className="mt-0.5">
            For any questions, contact support at support@temanwa.com
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-center print:hidden">
        <button
          onClick={() => router.push("/dashboard/billing")}
          className="text-sm font-medium text-[#075E54] underline transition-colors hover:text-[#054d44]"
        >
          Back to Billing
        </button>
      </div>
    </div>
  );
}
