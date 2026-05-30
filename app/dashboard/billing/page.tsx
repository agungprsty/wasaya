"use client";

import { useState, useEffect, FormEvent } from "react";

interface TransactionData {
  id: string;
  orderId: string;
  plan: string;
  amount: number;
  paymentType: string;
  status: string;
  createdAt: string;
}

interface ChargeResultData {
  orderId: string;
  paymentType: string;
  vaNumber?: string;
  qrCodeUrl?: string;
  bank?: string;
  amount: number;
  expiredAt: string;
}

export default function BillingPage() {
  const [plan, setPlan] = useState<string>("FREE");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"bank_transfer" | "qris">("bank_transfer");
  const [bank, setBank] = useState("bca");
  const [charging, setCharging] = useState(false);
  const [chargeResult, setChargeResult] = useState<ChargeResultData | null>(null);
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
      .then((d) => setTransactions(d.data || []))
      .catch(() => {});
  }, []);

  const isProActive = plan === "PRO" && planExpiresAt && new Date(planExpiresAt) > new Date();
  const isExpired = plan === "PRO" && planExpiresAt && new Date(planExpiresAt) <= new Date();

  const handleUpgrade = async (e: FormEvent) => {
    e.preventDefault();
    setCharging(true);
    setError("");
    setChargeResult(null);

    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "PRO", paymentType, bank: paymentType === "bank_transfer" ? bank : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to initiate payment");
      } else {
        setChargeResult(data);
      }
    } catch {
      setError("Network error");
    } finally {
      setCharging(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Billing & Subscription</h1>

      <div className="p-8 rounded-xl border border-[#DCF8C6] bg-white flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Current Plan</p>
          <p className="text-lg font-bold mt-1">{plan === "PRO" ? "Pro" : plan === "ENTERPRISE" ? "Enterprise" : "Free"}</p>
          {plan === "PRO" && planExpiresAt && (
            <p className={`text-sm mt-1 ${isExpired ? "text-red-600" : "text-green-600"}`}>
              {isExpired ? "Expired" : "Active until"} {new Date(planExpiresAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
        {!isProActive && (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-[#075E54] text-white rounded-lg hover:opacity-90 transition text-sm font-medium"
          >
            {isExpired ? "Renew Pro" : "Upgrade to Pro"}
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!charging) setShowModal(false) }}>
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Upgrade to Pro</h2>
            <p className="text-sm text-gray-600 mb-6">Rp 49.000 / month — 5,000 messages, 4 devices, no watermark.</p>

            {chargeResult ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <p className="text-sm font-medium text-green-800">Payment initiated!</p>
                  <p className="text-xs text-green-600 mt-1">Order: {chargeResult.orderId}</p>
                </div>

                {chargeResult.vaNumber && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Virtual Account</p>
                    <p className="text-sm font-bold">{chargeResult.bank?.toUpperCase()}</p>
                    <p className="text-lg font-mono font-bold mt-1">{chargeResult.vaNumber}</p>
                    <button
                      onClick={() => copyToClipboard(chargeResult.vaNumber!)}
                      className="text-xs text-[#075E54] underline mt-1"
                    >
                      Copy VA Number
                    </button>
                  </div>
                )}

                {chargeResult.qrCodeUrl && (
                  <div className="p-4 border rounded-lg bg-gray-50 flex flex-col items-center">
                    <p className="text-xs text-gray-500 mb-2">Scan QRIS</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={chargeResult.qrCodeUrl} alt="QRIS" className="w-48 h-48" />
                  </div>
                )}

                <p className="text-xs text-gray-400">Expires: {new Date(chargeResult.expiredAt).toLocaleString("id-ID")}</p>

                <button
                  onClick={() => { setShowModal(false); setChargeResult(null) }}
                  className="w-full py-2 border border-gray-300 rounded-lg text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpgrade} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Payment Method</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as "bank_transfer" | "qris")}
                    className="w-full px-4 py-3 border border-[#DCF8C6] rounded-xl text-sm focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/15 outline-none"
                  >
                    <option value="bank_transfer">Bank Transfer (BCA / Mandiri / BNI / Permata)</option>
                    <option value="qris">QRIS</option>
                  </select>
                </div>

                {paymentType === "bank_transfer" && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Bank</label>
                    <select
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full px-4 py-3 border border-[#DCF8C6] rounded-xl text-sm focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/15 outline-none"
                    >
                      <option value="bca">BCA</option>
                      <option value="mandiri">Mandiri</option>
                      <option value="bni">BNI</option>
                      <option value="permata">Permata</option>
                    </select>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={charging}
                  className="w-full py-3 bg-[#075E54] text-white rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {charging ? "Processing..." : `Pay Rp ${(49000).toLocaleString("id-ID")}`}
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-2 text-sm text-gray-500"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="p-8 rounded-xl border border-gray-200 bg-white">
        <h2 className="font-bold mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                <div>
                  <p className="font-medium">{tx.orderId}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString("id-ID")}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rp {tx.amount.toLocaleString("id-ID")}</p>
                  <p className={`text-xs ${tx.status === "success" ? "text-green-600" : tx.status === "pending" ? "text-yellow-600" : "text-red-600"}`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
