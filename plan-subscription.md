# Plan & Subscription — WAGateway

## Plan Tiers

### Free
| Aspek | Detail |
|---|---|
| Harga | Rp 0 (selamanya) |
| Pesan/bulan | 500 |
| Kontak | 200 |
| Template pesan | 10 |
| Koneksi perangkat | 1 |
| Bot auto-balas | ✅ |
| Broadcast massal | ✅ |
| Pesan terjadwal | ✅ |
| REST API | ✅ |
| Webhook | ❌ |
| Custom Watermark | ❌ |
| Support | Community |

### Pro
| Aspek | Detail |
|---|---|
| Harga | Rp 49.000/bulan |
| Pesan/bulan | 5.000 |
| Kontak | Tak terbatas |
| Template pesan | Tak terbatas |
| Koneksi perangkat | 2 |
| Bot auto-balas | ✅ |
| Broadcast massal | ✅ |
| Pesan terjadwal | ✅ |
| REST API | ✅ |
| Webhook | ✅ |
| Custom Watermark | ✅ |
| Support | Prioritas (email/chat) |

### Enterprise
| Aspek | Detail |
|---|---|
| Harga | Hubungi Kami |
| Pesan/bulan | Tak terbatas |
| Kontak | Tak terbatas |
| Template pesan | Tak terbatas |
| Koneksi perangkat | Multi-perangkat |
| Bot auto-balas | ✅ + dedicated engine |
| Broadcast massal | ✅ |
| Pesan terjadwal | ✅ |
| REST API | ✅ |
| Webhook | ✅ |
| SLA | 99,99% |
| Account Manager | ✅ |
| Integrasi kustom | ✅ |
| Support | Prioritas 24/7 |

---

## Database Schema

### Field tambahan di User

```prisma
enum Plan { FREE PRO ENTERPRISE }

model User {
  // ... existing fields
  plan          Plan      @default(FREE)
  planExpiresAt DateTime?
}
```

### Transaction model

```prisma
model Transaction {
  id              String    @id @default(uuid())
  userId          String
  orderId         String    @unique    // WA-XXXXXXXXX
  plan            Plan
  amount          Int                  // dalam Rupiah (49000)
  paymentType     String?              // "bank_transfer" | "qris"
  bank            String?              // "bca" | "mandiri" | "bni"
  vaNumber        String?
  qrCodeUrl       String?
  status          String    @default("pending")
  midtransTxId    String?
  paidAt          DateTime?
  expiredAt       DateTime?            // batas bayar (24 jam)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([orderId])
}
```

Payment status flow: `pending` → `settlement` (lunas) / `expire` / `deny` / `cancel`

---

## Plan Limits (code config)

`lib/plans.ts`:

```typescript
export const PLANS = {
  FREE: {
    label: "Free",
    price: 0,
    maxMessagesPerMonth: 500,
    maxContacts: 200,
    maxTemplates: 10,
    maxDevices: 1,
    features: { webhook: false, watermark: false, chatbot: true, broadcast: true, scheduled: true, api: true },
  },
  PRO: {
    label: "Pro",
    price: 49000,
    maxMessagesPerMonth: 5000,
    maxContacts: Infinity,
    maxTemplates: Infinity,
    maxDevices: 2,
    features: { webhook: true, watermark: true, chatbot: true, broadcast: true, scheduled: true, api: true },
  },
  ENTERPRISE: {
    label: "Enterprise",
    price: 0, // custom
    maxMessagesPerMonth: Infinity,
    maxContacts: Infinity,
    maxTemplates: Infinity,
    maxDevices: Infinity,
    features: { webhook: true, watermark: true, chatbot: true, broadcast: true, scheduled: true, api: true },
  },
} as const;

export type PlanTier = keyof typeof PLANS;
```

---

## Upgrade Flow

```
Landing page → klik "Mulai Pro"
  → /register?plan=pro
  → Register + auto-assign plan=FREE (sementara)

Dashboard → /dashboard/billing
  → Pilih plan (Pro)
  → Pilih metode: VA (BCA/Mandiri/BNI) atau QRIS
  → POST /api/subscription/upgrade { plan: "pro", paymentType: "bank_transfer", bank: "bca" }
      → Create Transaction (orderId: WA-{uuid}, status: pending)
      → Midtrans Core API /charge (VA or QRIS)
      → Return VA number / QR code URL
  → Tampilkan instruksi pembayaran di halaman
  → User scan QRIS / transfer ke VA
  → Midtrans kirim POST ke /api/midtrans/notification
      → Match orderId → update Transaction (status: settlement, paidAt)
      → Update User (plan: PRO, planExpiresAt: now + 30d)
  → Halaman billing auto-refresh, tampilkan "Pro aktif" + tanggal expired
```

---

## Expiry & Notification (tanpa auto-renewal)

### Midtrans Expiry
- Midtrans otomatis set expiry 24 jam untuk VA/QRIS
- Kalau lewat → status `expire` → Transaction diupdate, User tetap FREE

### Plan Expiry
- `planExpiresAt` = `now() + 30d` pas upgrade sukses
- **H-7**: cron kirim notifikasi ke user (in-app alert di dashboard)
- **H-1**: notifikasi lagi
- **Pas expired**: cron `PATCH /api/subscription/expire` → set plan=FREE, planExpiresAt=null
- Akses ke fitur Pro (webhook, multi-device) dinonaktifkan otomatis

### Notifikasi (bisa ditunda fase 2)
- In-app banner di dashboard
- Email notification (perlu setup SMTP/nodemailer)
- WhatsApp notification (ironis, tapi butuh user punya device connect)

---

## Midtrans Configuration

`lib/midtrans.ts`:

```typescript
const MIDTRANS_BASE = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

const AUTH = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64");

export async function chargeVA(orderId: string, amount: number, bank: string, customer: { email: string }) {
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

export async function chargeQRIS(orderId: string, amount: number, customer: { email: string }) {
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

export function verifyNotification(payload: any): boolean {
  const { order_id, status_code, gross_amount, signature_key } = payload;
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const computed = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest("hex");
  return computed === signature_key;
}
```

`.env` additions:
```
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_IS_PRODUCTION=false
```

---

## API Routes

| Route | Method | Fungsi |
|---|---|---|
| `/api/subscription/upgrade` | POST | Initiate Midtrans charge, create Transaction |
| `/api/subscription/status` | GET | Current plan, planExpiresAt, active? |
| `/api/subscription/transactions` | GET | Riwayat transaksi user |
| `/api/midtrans/notification` | POST | Webhook dari Midtrans |
| `/api/subscription/expire` | POST | Cron: expire plan yang lewat (dilindungi CRON_SECRET) |

---

## Halaman UI

### Landing page (`app/page.tsx`)
- "Mulai Pro" → `/register?plan=pro`
- "Daftar Gratis" → `/register` (plan=FREE)

### Register (`app/register/page.tsx`)
- Deteksi `?plan=pro` → tampilkan badge "Kamu mendaftar paket Pro"
- Setelah register, redirect ke `/dashboard/billing` (bukan `/dashboard`)

### Billing page (`app/dashboard/billing/page.tsx`)
- Jika FREE: tampilkan plan cards Free / Pro / Enterprise
- Jika Pro aktif: tampilkan status + countdown expired
- Pilih metode pembayaran: VA / QRIS
- Tampilkan VA number atau QR code
- Polling status transaksi tiap 5 detik

### Settings page (`app/dashboard/settings/page.tsx`)
- Tambah card "Current Plan" + link ke `/dashboard/billing`

---

## Plan Enforcement (limit checking)

`lib/check-limit.ts`:

```typescript
import { prisma } from "./prisma";
import { PLANS, PlanTier } from "./plans";
import { startOfMonth } from "date-fns";

export async function checkLimit(userId: string, type: "messages" | "contacts" | "templates" | "devices") {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  if (!user) return { ok: false, message: "User not found" };

  // Enterprise = unlimited
  if (user.plan === "ENTERPRISE") return { ok: true };

  // Plan expired?
  if (user.plan !== "FREE" && user.planExpiresAt && user.planExpiresAt < new Date()) {
    return { ok: false, message: "Plan has expired" };
  }

  const limits = PLANS[user.plan as PlanTier];
  if (!limits) return { ok: false, message: "Invalid plan" };

  let current: number;

  switch (type) {
    case "messages":
      current = await prisma.whatsAppMessage.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth(new Date()) },
          status: { in: ["sent", "delivered"] },
        },
      });
      break;
    case "contacts":
      current = await prisma.contact.count({ where: { userId } });
      break;
    case "templates":
      current = await prisma.messageTemplate.count({ where: { userId } });
      break;
    case "devices":
      current = await prisma.whatsAppSession.count({ where: { userId, status: "connected" } });
      break;
    default:
      return { ok: false, message: "Unknown limit type" };
  }

  const maxKey = `max${type.charAt(0).toUpperCase() + type.slice(1)}${type === "messages" ? "PerMonth" : ""}` as keyof typeof limits;
  const max = limits[maxKey] as number;

  if (current >= max) {
    return { ok: false, message: `${type} limit reached (${current}/${max})` };
  }
  return { ok: true };
}
```

---

## File Structure (files baru)

| File | Status |
|---|---|
| `lib/plans.ts` | Baru |
| `lib/midtrans.ts` | Baru |
| `lib/check-limit.ts` | Baru |
| `app/api/subscription/upgrade/route.ts` | Baru |
| `app/api/subscription/status/route.ts` | Baru |
| `app/api/subscription/transactions/route.ts` | Baru |
| `app/api/midtrans/notification/route.ts` | Baru |
| `app/api/subscription/expire/route.ts` | Baru |
| `app/dashboard/billing/page.tsx` | Baru |
| `components/PaymentVA.tsx` | Baru |
| `components/PaymentQRIS.tsx` | Baru |

### Files yang dimodifikasi

| File | Perubahan |
|---|---|
| `prisma/schema.prisma` | + enum Plan, + field plan & planExpiresAt di User, + model Transaction |
| `app/api/auth/register/route.ts` | Set plan=FREE saat create user |
| `app/register/page.tsx` | Deteksi `?plan=pro` |
| `app/page.tsx` | Update href pricing cards |
| `app/dashboard/layout.tsx` | + nav "Billing" |
| `app/dashboard/settings/page.tsx` | + card current plan + link billing |
| `.env` | + MIDTRANS_* |
| `.env.example` | + MIDTRANS_* |

---

## Prioritas Implementasi

### Phase 1 (inti)
1. `prisma/schema.prisma` — schema changes
2. `npx prisma migrate dev --name add-plan-and-transaction`
3. `lib/plans.ts`
4. `lib/midtrans.ts`
5. `POST /api/subscription/upgrade`
6. `POST /api/midtrans/notification`
7. `GET /api/subscription/status`
8. `app/dashboard/billing/page.tsx` (dengan PaymentVA & PaymentQRIS)
9. Modifikasi register API + landing page pricing

### Phase 2 (opsional, bisa ditunda)
10. Plan enforcement (`lib/check-limit.ts` + guard di API routes)
11. Expiry cron (`POST /api/subscription/expire`)
12. Notifikasi H-7/H-1 (in-app / email)
13. `app/register/page.tsx` — handling `?plan=pro`
14. `app/dashboard/settings/page.tsx` — current plan card
15. `GET /api/subscription/transactions`
