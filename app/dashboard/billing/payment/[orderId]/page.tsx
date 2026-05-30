"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";

interface TxData {
  id: string;
  orderId: string;
  plan: string;
  amount: number;
  paymentType: string;
  bank: string;
  vaNumber: string;
  qrCodeUrl: string;
  status: string;
  createdAt: string;
  expiredAt: string;
}

const bankInstructions: Record<string, { title: string; steps: string[] }> = {
  bca: {
    title: "BCA Virtual Account",
    steps: [
      "Buka ATM BCA atau BCA Mobile",
      "Pilih Transfer > Transfer ke Rekening BCA / BCA Virtual Account",
      "Masukkan nomor Virtual Account:",
      "Konfirmasi nominal Rp 52.500 dan selesaikan transaksi",
      "Simpan bukti transfer Anda",
    ],
  },
  mandiri: {
    title: "Mandiri Bill Payment",
    steps: [
      "Buka ATM Mandiri atau Livin' by Mandiri",
      "Pilih Bayar > Multi Payment",
      "Masukkan kode perusahaan: 88608 (Midtrans)",
      "Masukkan nomor Virtual Account:",
      "Konfirmasi nominal Rp 52.500 dan selesaikan transaksi",
      "Simpan bukti transfer Anda",
    ],
  },
  bni: {
    title: "BNI Virtual Account",
    steps: [
      "Buka ATM BNI atau BNI Mobile",
      "Pilih Transfer > Virtual Account Billing",
      "Masukkan nomor Virtual Account:",
      "Konfirmasi nominal Rp 52.500 dan selesaikan transaksi",
      "Simpan bukti transfer Anda",
    ],
  },
  permata: {
    title: "Permata Virtual Account",
    steps: [
      "Buka ATM Permata atau PermataMobile",
      "Pilih Transfer > Transfer ke Rekening Bank Lain",
      "Masukkan nomor Virtual Account:",
      "Konfirmasi nominal Rp 52.500 dan selesaikan transaksi",
      "Simpan bukti transfer Anda",
    ],
  },
};

export default function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();

  const [tx, setTx] = useState<TxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentType, setPaymentType] = useState<"bank_transfer" | "qris">("bank_transfer");
  const [bank, setBank] = useState("bca");
  const [paying, setPaying] = useState(false);
  const [chargeResult, setChargeResult] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/subscription/transactions")
      .then((r) => r.json().catch(() => ({ data: [] })))
      .then((d) => {
        const found = (d.data || []).find((t: any) => t.orderId === orderId);
        if (found) {
          if (found.status === "order" && found.expiredAt && new Date(found.expiredAt) <= new Date()) {
            found.status = "expired";
          }
          setTx(found);
          if (found.status === "pending" && found.vaNumber) {
            setChargeResult(found);
          }
        } else {
          setError("Transaction not found");
        }
      })
      .catch(() => setError("Failed to load transaction"))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (!tx?.expiredAt) return;
    if (tx.status === "success" || tx.status === "cancelled" || tx.status === "expired") return;

    function tick() {
      const remaining = Math.floor((new Date(tx.expiredAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setCountdown(0);
        setTx((prev) => prev ? { ...prev, status: "expired" } : prev);
        return;
      }
      setCountdown(remaining);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tx?.expiredAt, tx?.status]);

  const handlePay = async (e: FormEvent) => {
    e.preventDefault();
    setPaying(true);
    setError("");

    try {
      const res = await fetch("/api/subscription/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentType, bank: paymentType === "bank_transfer" ? bank : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Payment failed");
      } else {
        setTx((prev) => prev ? { ...prev, status: "pending", paymentType, bank: paymentType === "bank_transfer" ? bank : "", vaNumber: data.vaNumber || "", qrCodeUrl: data.qrCodeUrl || "" } : prev);
        setChargeResult(data);
      }
    } catch {
      setError("Network error");
    } finally {
      setPaying(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const serviceFee = 3500;
  const planPrice = 49000;
  const total = planPrice + serviceFee;

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (error && !tx) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Payment</h1>
        <p className="mt-4 text-sm text-red-600">{error}</p>
        <button onClick={() => router.push("/dashboard/billing")} className="mt-4 text-sm font-medium text-[#075E54] underline transition-colors hover:text-[#054d44]">
          Back to Billing
        </button>
      </div>
    );
  }

  if (tx?.status === "cancelled") {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Payment</h1>
            <p className="mt-1 text-sm text-zinc-500">Order ID: {orderId}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/billing")}
            className="cursor-pointer rounded-xl bg-[#075E54] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#054d44]"
          >
            Back to Billing
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-red-800">Order Cancelled</p>
              <p className="text-sm text-red-600">This order has been cancelled and is no longer valid.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Order Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Plan</span>
              <span className="font-medium text-zinc-900">Pro</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Order ID</span>
              <span className="font-mono text-xs text-zinc-600">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Pro Plan</span>
              <span className="text-zinc-900">Rp {planPrice.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Service Fee</span>
              <span className="text-zinc-900">Rp {serviceFee.toLocaleString("id-ID")}</span>
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between font-semibold text-zinc-900">
              <span>Total</span>
              <span>Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tx?.status === "expired") {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Payment</h1>
            <p className="mt-1 text-sm text-zinc-500">Order ID: {orderId}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/billing")}
            className="cursor-pointer rounded-xl bg-[#075E54] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#054d44]"
          >
            Back to Billing
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-orange-100 bg-orange-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-orange-800">Payment Expired</p>
              <p className="text-sm text-orange-600">This order has expired. Please create a new order to try again.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Order Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Plan</span>
              <span className="font-medium text-zinc-900">Pro</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Order ID</span>
              <span className="font-mono text-xs text-zinc-600">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Pro Plan</span>
              <span className="text-zinc-900">Rp {planPrice.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Service Fee</span>
              <span className="text-zinc-900">Rp {serviceFee.toLocaleString("id-ID")}</span>
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between font-semibold text-zinc-900">
              <span>Total</span>
              <span>Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tx?.status === "success") {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Payment</h1>
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-800">Payment Successful</p>
              <p className="text-sm text-green-600">Your Pro plan is now active.</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/billing")} className="cursor-pointer rounded-xl bg-[#075E54] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#054d44]">
            Back to Billing
          </button>
          <button onClick={() => router.push(`/dashboard/billing/invoice/${orderId}`)} className="cursor-pointer rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50">
            View Invoice
          </button>
        </div>
      </div>
    );
  }

  if (chargeResult || (tx?.status === "pending" && tx?.vaNumber)) {
    const va = chargeResult?.vaNumber || tx?.vaNumber;
    const qr = chargeResult?.qrCodeUrl || tx?.qrCodeUrl;
    const bankName = chargeResult?.bank || tx?.bank;
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Payment Instructions</h1>
        <p className="mt-1 text-sm text-zinc-500">Complete your payment using the details below.</p>

        <div className="mt-6 rounded-xl border border-[#DCF8C6] bg-[#DCF8C6]/20 p-6">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
            <p className="text-sm font-medium text-zinc-700">Pending &mdash; waiting for your payment</p>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Order ID: {orderId}</p>
          {countdown !== null && countdown > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-orange-700">
                Expires in <span className="font-mono font-bold">{formatCountdown(countdown)}</span>
              </span>
            </div>
          )}
        </div>

        {va && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Virtual Account</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">{bankName?.toUpperCase()}</p>
            <p className="mt-2 text-2xl font-mono font-bold tracking-wider text-zinc-900">{va}</p>
            <button
              onClick={() => copyToClipboard(va)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              Copy VA Number
            </button>
          </div>
        )}

        {va && bankName && bankInstructions[bankName] && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Cara Pembayaran</p>
            <div className="mt-4">
              {bankInstructions[bankName].steps.map((step, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#DCF8C6] text-xs font-bold text-[#075E54]">
                    {i + 1}
                  </span>
                  <p className="text-zinc-700">
                    {step === "Masukkan nomor Virtual Account:" ? (
                      <>
                        {step} <span className="font-mono font-bold text-zinc-900">{va}</span>
                      </>
                    ) : (
                      step
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {qr && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Scan QRIS</p>
            <div className="mt-3 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QRIS" className="w-48 h-48" />
            </div>
            <div className="mt-4 space-y-3">
              {["Buka aplikasi pembayaran (GoPay, OVO, DANA, ShopeePay, dll)", "Pilih menu Bayar / Scan QR", "Scan kode QR di atas", "Konfirmasi nominal Rp 52.500 dan selesaikan", "Simpan bukti pembayaran Anda"].map((step, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#DCF8C6] text-xs font-bold text-[#075E54]">
                    {i + 1}
                  </span>
                  <p className="text-zinc-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/dashboard/billing")}
          className="mt-6 cursor-pointer rounded-xl bg-[#075E54] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#054d44]"
        >
          Back to Billing
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-xl font-semibold text-[#075E54] sm:text-2xl">Payment</h1>
      <p className="mt-1 text-sm text-zinc-500">Review your order and choose a payment method.</p>

      {countdown !== null && countdown > 0 && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm">
          <svg className="h-5 w-5 shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-orange-800">
            Complete payment within <span className="font-mono font-bold">{formatCountdown(countdown)}</span> or this order will expire.
          </span>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Order Summary</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Plan</span>
            <span className="font-medium text-zinc-900">Pro</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Order ID</span>
            <span className="font-mono text-xs text-zinc-600">{orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Pro Plan</span>
            <span className="text-zinc-900">Rp {planPrice.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Service Fee</span>
            <span className="text-zinc-900">Rp {serviceFee.toLocaleString("id-ID")}</span>
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between font-semibold text-zinc-900">
            <span>Total</span>
            <span>Rp {total.toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Payment Method</h2>
        <form onSubmit={handlePay} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500">Method</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as "bank_transfer" | "qris")}
              className="mt-1 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
            >
              <option value="bank_transfer">Bank Transfer (BCA / Mandiri / BNI / Permata)</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          {paymentType === "bank_transfer" && (
            <div>
              <label className="text-xs font-medium text-zinc-500">Bank</label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 transition-colors focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/15"
              >
                <option value="bca">BCA</option>
                <option value="mandiri">Mandiri</option>
                <option value="bni">BNI</option>
                <option value="permata">Permata</option>
              </select>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={paying}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paying ? "Processing..." : <span>Bayar <span className="font-bold">Rp {total.toLocaleString("id-ID")}</span></span>}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/billing")}
            className="flex h-11 w-full cursor-pointer items-center justify-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700"
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
}
