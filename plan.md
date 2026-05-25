# WAGateway — Feature Gap Analysis & Roadmap

## Metodologi

Riset dilakukan dengan eksplorasi menyeluruh terhadap seluruh codebase:
- **9 model Prisma** — semua tabel, relasi, field
- **16 endpoint API** — setiap route, handler, parameter, response
- **9 halaman dashboard** — semua UI, API calls, state management
- **5 file utility** — auth, api-auth, prisma, whatsapp, template-utils
- **`package.json`** — dependencies terinstall vs yang benar-benar dipakai
- **0 test files** — tidak ada infrastruktur testing

---

## Ringkasan Arsitektur Saat Ini

### Stack
- **Frontend:** Next.js 16.2.6 (App Router, Turbopack, Tailwind CSS v4)
- **Backend:** Next.js API Routes (serverless)
- **Database:** PostgreSQL 16 + Prisma ORM
- **Auth:** JWT (httpOnly cookies) + API Keys (Bearer token)
- **WhatsApp:** whatsapp-web.js (Puppeteer, headless Chrome)
- **Deploy:** Docker (multi-stage, oven/bun)

### Fitur yang sudah berfungsi penuh
- ✅ Registrasi/Login/Logout + JWT session
- ✅ API Key management (generate, list, revoke) + validasi di semua endpoint
- ✅ Kirim pesan single (dengan media base64)
- ✅ Broadcast multi-recipient (rate-limited 1.2s/message)
- ✅ Manajemen kontak (CRUD minus update)
- ✅ Message templates (dengan variable interpolation `{{name}}`)
- ✅ Scheduler (schedule, list, cancel)
- ✅ Cron processing (memproses scheduled messages)
- ✅ WhatsApp device connection (QR code, connect, disconnect, status)
- ✅ Dokumen publik API docs (`/docs`)

### Fitur yang sudah setengah jadi
- ⚠️ **Webhooks** — Settings webhook tersimpan, tabel `WebhookEvent` ada, tapi 0 baris kode yang benar-benar mengirim event ke URL user
- ⚠️ **S3 Media Upload** — `@aws-sdk/client-s3` terinstall di `package.json` tapi tidak pernah diimport; media dikirim base64 tanpa persistensi

---

## Prioritas Fitur

### 🚨 P0 — Critical (celah fungsional inti)

---

#### 1. Webhook Delivery

**Masalah:** Gateway tanpa webhook = tidak berguna untuk integrasi. Incoming message hanya disimpan ke DB, tidak pernah diteruskan ke aplikasi klien.

**Kondisi saat ini:**
- `Settings` model punya `webhookUrl` dan `webhookSecret`
- `WebhookEvent` model punya `eventType`, `payload`, `processed`
- Settings UI sudah bisa menyimpan webhook URL + secret
- Incoming message handler di `whatsapp.ts` hanya create `WhatsAppMessage` — tidak trigger webhook

**Yang harus dibuat:**

| # | Task | File |
|---|------|------|
| 1.1 | Fungsi `deliverWebhook(userId, eventType, payload)` — membaca settings, HMAC sign, POST ke webhook, retry logic (3x exponential backoff) | `lib/webhook.ts` (new) |
| 1.2 | Panggil `deliverWebhook()` dari event `message` (incoming) di `WhatsAppManager` | `lib/whatsapp.ts` |
| 1.3 | Panggil `deliverWebhook()` untuk status update (sent, delivered, failed) | `lib/whatsapp.ts` |
| 1.4 | Tambah endpoint `POST /api/webhook-test` untuk test delivery | `app/api/webhook-test/route.ts` (new) |
| 1.5 | Update UI Settings — tombol "Test Webhook" | `app/dashboard/settings/page.tsx` |

**Estimasi:** 3-4 jam

---

#### 2. Retry Failed Messages

**Masalah:** Pesan yang gagal dikirim tetap gagal selamanya. Tidak ada mekanisme retry dari UI.

**Yang harus dibuat:**

| # | Task | File |
|---|------|------|
| 3.1 | `POST /api/messages/retry` — menerima array message IDs, mengirim ulang via WhatsAppManager | `app/api/messages/retry/route.ts` (new) |
| 3.2 | Tombol "Retry" per message di halaman Messages | `app/dashboard/messages/page.tsx` |
| 3.3 | Opsi "Retry All Failed" (bulk) | `app/dashboard/messages/page.tsx` |

**Estimasi:** 2-3 jam

---

### 📊 P1 — High Value

---

#### 4. HTTP Rate Limiting

**Masalah:** Tidak ada proteksi abuse. Satu user bisa spam `POST /api/messages` tanpa batas.

**Pendekatan:** Token bucket per-user (in-memory atau Redis jika sudah tersedia).

**Yang harus dibuat:**

| # | Task | File |
|---|------|------|
| 4.1 | Middleware/helper `rateLimit(userId, key, maxRequests, windowMs)` | `lib/rate-limit.ts` (new) |
| 4.2 | Terapkan di `POST /api/messages` — misal 30 request / menit | `app/api/messages/route.ts` |
| 4.3 | Terapkan di `POST /api/broadcast` | `app/api/broadcast/route.ts` |
| 4.4 | Terapkan di `POST /api/contacts/bulk` | `app/api/contacts/bulk/route.ts` |
| 4.5 | Return `429 Too Many Requests` dengan `Retry-After` header | `lib/rate-limit.ts` |

**Estimasi:** 2-3 jam

---

#### 5. Dashboard Analytics

**Masalah:** Overview hanya angka mentah. Tidak ada grafik tren atau insight.

**Yang harus dibuat:**

| # | Task | File |
|---|------|------|
| 5.1 | `GET /api/analytics` — aggregasi per-hari: total sent, delivered, failed, received | `app/api/analytics/route.ts` (new) |
| 5.2 | Grafik garis 7/30 hari (menggunakan library chartringan — SVG manual atau recharts) | `app/dashboard/page.tsx` |
| 5.3 | Stat card: success rate %, busiest hour, top recipient | `app/dashboard/page.tsx` |

**Estimasi:** 4-6 jam

---

#### 6. Export Data (CSV)

**Masalah:** Tidak ada cara untuk download data kontak atau messages dalam format portable.

**Yang harus dibuat:**

| # | Task | File |
|---|------|------|
| 6.1 | `GET /api/contacts/export` — return CSV file dengan header name, phone, createdAt | `app/api/contacts/export/route.ts` (new) |
| 6.2 | `GET /api/messages/export` — return CSV dengan to, body, status, timestamp | `app/api/messages/export/route.ts` (new) |
| 6.3 | Tombol "Export CSV" di halaman Contacts & Messages | `app/dashboard/contacts/page.tsx`, `app/dashboard/messages/page.tsx` |

**Estimasi:** 2-3 jam

---

### 🛠 P2 — Quality of Life

---

#### 7. Contact Groups / Segments

**Masalah:** Broadcast manual pilih satu-satu kontak. Tidak ada grouping.

| # | Task | File |
|---|------|------|
| 7.1 | Model `Group` (id, userId, name) + many-to-many `ContactGroup` | `prisma/schema.prisma` |
| 7.2 | CRUD `GET/POST/PUT/DELETE /api/groups` | `app/api/groups/route.ts` (new) |
| 7.3 | UI: daftar group, assign contact ke group | `app/dashboard/groups/page.tsx` (new) |
| 7.4 | Broadcast: filter/select by group | `app/dashboard/broadcast/page.tsx` |

**Estimasi:** 6-8 jam

---

#### 8. Edit / Update Template

**Masalah:** Template cuma bisa create & delete, tidak bisa edit.

| # | Task | File |
|---|------|------|
| 8.1 | `PUT /api/templates` — update name & body | `app/api/templates/route.ts` |
| 8.2 | Edit button + inline edit di halaman Templates | `app/dashboard/templates/page.tsx` |

**Estimasi:** 1 jam

---

#### 9. Validasi Nomor HP

**Masalah:** Tidak ada validasi format nomor sebelum kirim. Nomor salah → error tidak jelas.

| # | Task | File |
|---|------|------|
| 9.1 | Fungsi `validatePhone(number)` — minimal length, angka-only, + prefix | `lib/phone-utils.ts` (new) |
| 9.2 | Validasi di `POST /api/messages` dan `POST /api/broadcast` | `app/api/messages/route.ts`, `app/api/broadcast/route.ts` |
| 9.3 | UI hint format nomor di form input | `app/dashboard/send/page.tsx` |

**Estimasi:** 1 jam

---

### ☁️ P3 — Infrastruktur

---

#### 10. S3 Media Upload

**Masalah:** `@aws-sdk/client-s3` terinstall tapi tidak terpakai. Media base64 dikirim langsung — tidak ada file permanent storage.

| # | Task | File |
|---|------|------|
| 10.1 | Inisialisasi S3 client dari env vars | `lib/s3.ts` (new) |
| 10.2 | `POST /api/upload` — terima file, upload ke S3, return URL | `app/api/upload/route.ts` (new) |
| 10.3 | Update send flow: upload dulu → dapat URL → kirim dengan `mediaUrl` | `app/dashboard/send/page.tsx` |

**Estimasi:** 3-4 jam

---

## Ringkasan Estimasi Total

| Priority | Fitur | Jam |
|----------|-------|-----|
| P0 | Webhook Delivery | 3-4 |
| P0 | Edit Contact | 1-2 |
| P0 | Retry Failed Messages | 2-3 |
| P1 | Rate Limiting | 2-3 |
| P1 | Dashboard Analytics | 4-6 |
| P1 | Export CSV | 2-3 |
| P2 | Contact Groups | 6-8 |
| P2 | Edit Template | 1 |
| P2 | Phone Validation | 1 |
| P3 | S3 Media Upload | 3-4 |
| | **Total** | **25-35 jam** |

---

---

# 🤖 Chatbot — Analisis & Rencana Implementasi

## Latar Belakang

User WAGateway (bisnis/pemilik produk) ingin nomor WhatsApp mereka bisa **otomatis membalas** pesan masuk dari pelanggan — seperti "jam operasional", "menu produk", "cek status pesanan", dll.

Ini membedakan WAGateway dari WhatsApp Gateway biasa yang hanya kirim-terima pesan, menjadi **platform customer engagement**.

---

## Kesiapan Infrastruktur Saat Ini

### Yang sudah ada (bisa dipakai langsung)
| Komponen | Status |
|----------|--------|
| Incoming message listener (`message` event di `whatsapp.ts`) | ✅ Sudah menangkap semua pesan masuk |
| Message Template dengan variable interpolation | ✅ Template + `extractVariables()`/`interpolate()` ada |
| Settings per-user | ✅ Bisa simpan konfigurasi chatbot per user |
| WhatsApp session management | ✅ Multi-user, persistent session |

### Yang harus ada sebelum chatbot
| Prasyarat | Keterangan |
|-----------|------------|
| **Webhook Delivery (P0.1)** | Chatbot perlu "menyadap" incoming message SEBELUM dikirim ke webhook. Tanpa webhook delivery, arsitektur belum lengkap. |

---

## Pendekatan

### Dibangun bertahap dalam 3 phase:

---

### Phase 1: Rule Engine (Keyword-based)

**Cocok untuk:** FAQ, jam operasional, menu sederhana, auto-reply "makasih sudah menghubungi".

**Cara kerja:**
1. User mendefinisikan **rules** di dashboard: `keyword → response template`
2. Incoming message dicocokkan dengan keyword (case-insensitive, partial match)
3. Jika cocok → balas dengan response template yang sudah diinterpolasi
4. Jika tidak cocok → forward ke webhook / diam

**Model Prisma:**

```prisma
model ChatbotRule {
  id        String   @id @default(uuid())
  userId    String
  name      String
  keywords  String[] // ["harga", "price", "cost"]
  response  String   // template body, e.g. "Harga produk X adalah Rp {{price}}"
  isActive  Boolean  @default(true)
  priority  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Yang harus dibuat:**

| # | Task | File |
|---|------|------|
| 1.1 | Model + migration `ChatbotRule` | `prisma/schema.prisma` |
| 1.2 | CRUD `GET/POST/PUT/DELETE /api/chatbot/rules` | `app/api/chatbot/rules/route.ts` (new) |
| 1.3 | Engine `processChatbot(userId, message, from)` — cocokkan keyword, balas otomatis | `lib/chatbot.ts` (new) |
| 1.4 | Panggil `processChatbot()` di event `message` sebelum webhook | `lib/whatsapp.ts` |
| 1.5 | Dashboard page: kelola rules + toggle aktif/nonaktif | `app/dashboard/chatbot/page.tsx` (new) |
| 1.6 | Tambah link sidebar "Chatbot" di layout | `app/dashboard/layout.tsx` |

**Estimasi:** 5-7 jam

---

### Phase 2: Product Catalog Integration

**Cocok untuk:** Bisnis dengan produk/jasa — user bisa tanya "ada sepatu ukuran 42?".

**Cara kerja:**
1. User unggah katalog produk (via API atau dashboard)
2. Rule Engine phase 1 bisa di-upgrade untuk pakai data produk
3. Template bisa referensi field produk: `{{product.name}}`, `{{product.price}}`
4. Keyword "produk" / "catalog" → list produk. Keyword "harga X" → detail produk.

**Model Prisma tambahan:**

```prisma
model Product {
  id          String   @id @default(uuid())
  userId      String
  name        String
  description String?
  price       Int?     // in rupiah/sen
  stock       Int?
  category    String?
  imageUrl    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Yang harus dibuat:**

| # | Task | File |
|---|------|------|
| 2.1 | Model + migration `Product` + category index | `prisma/schema.prisma` |
| 2.2 | CRUD + search `GET/POST/PUT/DELETE /api/products` | `app/api/products/route.ts` (new) |
| 2.3 | Upload product image via S3 (manfaatkan P3.10) | `app/api/products/upload/route.ts` (new) |
| 2.4 | Dashboard: manajemen katalog produk | `app/dashboard/products/page.tsx` (new) |
| 2.5 | Chatbot engine: keyword → search product → reply with product info | `lib/chatbot.ts` |

**Estimasi:** 6-8 jam

---

### Phase 3: AI/LLM Fallback (Opsional)

**Cocok untuk:** Pertanyaan kompleks/bebas yang tidak tertangkap rule engine.

**Cara kerja:**
1. Jika `processChatbot()` tidak menemukan rule yang cocok → kirim ke LLM
2. LLM diberi konteks: nama bisnis, katalog produk, riwayat chat
3. Response LLM dikirim balik ke user
4. User dikenai biaya per token (atau BYO OpenAI key)

**Yang harus dibuat:**

| # | Task | File |
|---|------|------|
| 3.1 | LLM client — abstraction untuk OpenAI / Google AI | `lib/llm.ts` (new) |
| 3.2 | Prompt builder — context dari produk + rules | `lib/chatbot.ts` |
| 3.3 | Settings: toggle AI + API key input | `app/dashboard/chatbot/page.tsx` |
| 3.4 | Usage tracking (jumlah token per sesi) | `lib/chatbot.ts` |

**Estimasi:** 4-6 jam

---

## Arsitektur Alur Pesan (Setelah Chatbot)

```
Incoming WhatsApp message
  → whatsapp.ts event 'message'
    → Simpan ke WhatsAppMessage table (inbound)
    → processChatbot(userId, from, body)
      │
      ├─ Rule matched?
      │   → Balas otomatis (pakai template)
      │   → Log ke ChatLog table
      │   → STOP (tidak lanjut ke webhook)
      │
      ├─ LLM enabled & rule not matched?
      │   → Generate response via AI
      │   → Balas
      │   → Log
      │   → STOP
      │
      └─ No chatbot match?
          → deliverWebhook(userId, "message.received", payload)
```

---

## Estimasi Total Chatbot

| Phase | Fitur | Jam | Dikerjakan Setelah |
|-------|-------|-----|--------------------|
| 1 | Rule Engine | 5-7 | P0 selesai |
| 2 | Product Catalog | 6-8 | Phase 1 + S3 (P3.10) |
| 3 | AI/LLM Fallback | 4-6 | Phase 2 |
| | **Total Chatbot** | **15-21 jam** | |

---

## Pertimbangan

### 👍 Kenapa ini layak dibangun
- **Differensiator kompetitif** — kebanyakan WA Gateway hanya kirim pesan, chatbot + katalog produk = platform engagement
- **Infrastruktur existing** — incoming message sudah ditangkap, template engine sudah ada
- **Revenue model** — bisa dijual sebagai add-on / tier berbayar terpisah
- **Bertahap** — Phase 1 bisa release cepat tanpa AI, value sudah terasa

### ⚠️ Risiko
- **Phase 1 (rule engine) harus solid** — false positive (salah cocok keyword) bisa bikin user kesal
- **Prioritas rule** perlu jelas — rule lebih spesifik harus menang atas rule lebih umum
- **Loop detection** — pastikan bot tidak membalas bot lain atau loop dengan dirinya sendiri
- **AI latency & cost** — Phase 3 perlu mekanisme timeout dan budget control

---

## Updated Ringkasan Estimasi Total (Semua Fitur)

| Priority | Fitur | Jam |
|----------|-------|-----|
| P0 | Webhook Delivery | 3-4 |
| P0 | Edit Contact | 1-2 |
| P0 | Retry Failed Messages | 2-3 |
| P1 | Rate Limiting | 2-3 |
| P1 | Dashboard Analytics | 4-6 |
| P1 | Export CSV | 2-3 |
| P2 | Contact Groups | 6-8 |
| P2 | Edit Template | 1 |
| P2 | Phone Validation | 1 |
| P3 | S3 Media Upload | 3-4 |
| P2 | 🤖 Chatbot Phase 1 — Rule Engine | 5-7 |
| P2 | 🤖 Chatbot Phase 2 — Product Catalog | 6-8 |
| P3 | 🤖 Chatbot Phase 3 — AI Fallback | 4-6 |
| | **Total (semua fase)** | **41-57 jam** |
