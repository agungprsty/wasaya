import crypto from "crypto";

const MIDTRANS_BASE =
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";

function getAuth(): string {
  return Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");
}

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
  permata_va_number?: string;
  bill_key?: string;
  actions?: { url: string; name: string; method: string }[];
}

function expiryPayload() {
  const now = new Date();
  const start = now.toISOString().replace(/\.\d{3}Z$/, " +0700");
  return { start_time: start, unit: "minute", duration: 10 };
}

export async function chargeVA(
  orderId: string,
  amount: number,
  bank: string,
  customer: { email: string },
): Promise<MidtransChargeResult> {
  let payload: Record<string, unknown>;

  if (bank === "mandiri") {
    payload = {
      payment_type: "echannel",
      transaction_details: { order_id: orderId, gross_amount: amount },
      echannel: { bill_info1: "Payment:", bill_info2: "Pro Plan" },
      customer_details: customer,
      expiry: expiryPayload(),
    };
  } else if (bank === "permata") {
    payload = {
      payment_type: "permata",
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: customer,
      expiry: expiryPayload(),
    };
  } else {
    payload = {
      payment_type: "bank_transfer",
      transaction_details: { order_id: orderId, gross_amount: amount },
      bank_transfer: { bank },
      customer_details: customer,
      expiry: expiryPayload(),
    };
  }

  const res = await fetch(`${MIDTRANS_BASE}/charge`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${getAuth()}` },
    body: JSON.stringify(payload),
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
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${getAuth()}` },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: customer,
      expiry: expiryPayload(),
    }),
  });
  return res.json();
}

export async function cancelTransaction(orderId: string): Promise<{ status_code: string; status_message: string }> {
  const res = await fetch(`${MIDTRANS_BASE}/${orderId}/cancel`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${getAuth()}` },
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
