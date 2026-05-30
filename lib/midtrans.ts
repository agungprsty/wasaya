import crypto from "crypto";

const MIDTRANS_BASE =
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";

const AUTH = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");

export interface MidtransChargeResult {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  va_numbers?: { bank: string; va_number: string }[];
  actions?: { url: string; name: string; method: string }[];
}

export async function chargeVA(
  orderId: string,
  amount: number,
  bank: string,
  customer: { email: string },
): Promise<MidtransChargeResult> {
  const res = await fetch(`${MIDTRANS_BASE}/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${AUTH}` },
    body: JSON.stringify({
      payment_type: "bank_transfer",
      transaction_details: { order_id: orderId, gross_amount: amount },
      bank_transfer: { bank },
      customer_details: customer,
    }),
  });
  return res.json();
}

export async function chargeQRIS(
  orderId: string,
  amount: number,
  customer: { email: string },
): Promise<MidtransChargeResult> {
  const res = await fetch(`${MIDTRANS_BASE}/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${AUTH}` },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: customer,
    }),
  });
  return res.json();
}

export function verifyNotification(payload: Record<string, unknown>): boolean {
  const { order_id, status_code, gross_amount, signature_key } = payload as {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
  };
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const computed = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest("hex");
  return computed === signature_key;
}
