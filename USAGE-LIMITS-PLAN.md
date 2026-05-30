# Usage Limits Overhaul — Rencana Implementasi

## 1. Masalah Teridentifikasi

### Bug: dailyPct Safety Indicator Selalu 0%

| Komponen | API Dipanggil | Field Dipakai | Hasil |
|----------|---------------|---------------|-------|
| **Sidebar** (`layout.tsx`) | `/api/auth/me` | `subscription.dailySentCount` | ❌ Field TIDAK ADA di Prisma/API → selalu 0 |
| **Settings Page** (`settings/page.tsx`) | `/api/settings` | `subscription.dailySentCount` | ❌ API return `usage.daily` tapi diabaikan → selalu 0 |
| **Dashboard Page** (`page.tsx`) | `/api/settings` | `usage.daily` | ✅ Benar — real count |
| **LimitWatcher** (`limit-watcher.tsx`) | `/api/settings` | `usage.daily` | ✅ Benar — real count |

**Akar masalah:** `Subscription.dailySentCount` tidak pernah ada di Prisma schema, tidak diselect di API, dan tidak dihitung oleh fungsi manapun.

---

### Enam Celah Enforcement (Backend)

| # | Lokasi | Severity | Deskripsi |
|---|--------|----------|-----------|
| **GAP 1** | `lib/whatsapp.ts:441-452` (chatbot handler) | 🔴 CRITICAL | Chatbot & auto-reply kirim pesan tanpa `getUsage()`, tanpa `getDailyLimit()`, tanpa `getMonthlyLimit()` |
| **GAP 2** | `cron/process-scheduled/route.ts:90` | 🟠 HIGH | Scheduled message cek monthly limit saja, tidak ada daily limit check |
| **GAP 3** | `cron/process-scheduled/route.ts:84` | 🟠 HIGH | `usage` di-fetch sekali di awal loop — race condition, stale data |
| **GAP 4** | `lib/whatsapp.ts:774-795` (`retryPendingMessages`) | 🟡 MEDIUM | Retry pending messages saat reconnect tanpa limit check |
| **GAP 5** | `broadcast/route.ts:78` | 🟡 MEDIUM | Broadcast bypass BullMQ queue → kehilangan throttle/concurrency |
| **GAP 6** | `message-queue.ts:81` (worker) | 🔵 LOW | Queue worker tidak re-check limits — bukan safety net |

---

### Bug Tambahan

| Bug | Lokasi | Deskripsi |
|-----|--------|-----------|
| Retry duplicate record | `messages/retry/route.ts:57-69` | Retry create record BARU + update record LAMA → double count |
| Sidebar tidak polling | `layout.tsx:40` | Fetch sekali saat mount, tidak pernah refresh |
| Hardcoded limits (4 file) | Semua frontend file | Limit values dikopi manual di 4 tempat — rentan tidak sinkron |
| Dead fields | `schema.prisma:147-148` | `WhatsAppSession.dailyCount/monthlyCount` tidak pernah di-write |
| Rate limiter in-memory | `rate-limit.ts` | `Map<string, Bucket>` hilang saat restart, tidak scale |

---

## 2. Arsitektur Final

```
┌─────────────────────────────────────────────────────────────┐
│                 REDIS (Hot Path)                             │
│  INCR usage:harian:{userId}:{WIB-date}   TTL 48jam          │
│  INCR usage:bulanan:{userId}:{WIB-month} TTL 62hari         │
└──────────────────────┬──────────────────────────────────────┘
                       │ sync tiap 1-5 menit (cron)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL (Source of Truth)                    │
│                                                              │
│  UsageRecord { userId, type, periodKey, count }              │
│  @@unique([userId, type, periodKey])                         │
│                                                              │
│  Digunakan untuk:                                            │
│  • Limit checking (read)                                     │
│  • Fallback jika Redis miss                                   │
│  • Audit trail / billing historis                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  usage-tracker.ts (CENTRAL GATEKEEPER)                       │
│                                                              │
│  Semua path kirim pesan WAJIB lewat checkAndTrack():         │
│  1. compute periodKey (WIB UTC+7)                            │
│  2. Redis GET current usage (fallback: DB)                   │
│  3. Bandingkan vs TIER_LIMITS                                │
│  4. Jika aman → INCR Redis + return ok                       │
│  5. Jika over → return 429                                   │
└─────────────────────────────────────────────────────────────┘
```

### Reset Period Key (WIB UTC+7)

```
Harian:  periodKey = "2026-05-31"  (WIB date)
         Reset: jam 00:01 WIB → key berubah otomatis, counter baru mulai 0

Bulanan: periodKey = "2026-05"     (WIB month)
         Reset: tanggal 1 → key berubah otomatis
```

**Tidak ada cron reset.** Reset terjadi secara implisit karena period key berubah.

---

## 3. Perubahan Per File — Status Implementasi

### Prisma ✅ Selesai
- [x] `schema.prisma` — Tambah model `UsageRecord`

### Library Baru ✅ Selesai
- [x] `lib/usage-tracker.ts` — Class `UsageTracker` (Redis + DB)

### Library Diubah
- [x] `lib/api-tier.ts` — Export `TIER_LIMITS`, tambah `getMonthlyLimit()`
- [x] `lib/usage.ts` — Ganti isi → panggil `usageTracker.getCurrentUsage()`
- [ ] `lib/message-queue.ts` — Tambah `checkAndTrack()` di worker (Fase 2)
- [ ] `lib/rate-limit.ts` — Fase 2: migrasi Map → Redis (Fase 4 — CLEANUP)

### Backend API Routes ✅ Selesai
- [x] `app/api/auth/me/route.ts` — Tambah `usage` di response
- [x] `app/api/messages/route.ts` — Ganti manual check → `checkAndTrack()`
- [x] `app/api/broadcast/route.ts` — Queue via `enqueueMessage()` + `checkAndTrack()`
- [x] `app/api/messages/retry/route.ts` — Fix duplicate record + `checkAndTrack()`
- [x] `app/api/cron/process-scheduled/route.ts` — Tambah daily limit + refresh usage
- [x] `app/api/cron/sync-usage/route.ts` — **Baru:** cron sync Redis → DB

### Backend WhatsApp
- [x] `lib/whatsapp.ts` (chatbot/auto-reply handler) — `checkAndTrack()` sblm send
- [ ] `lib/whatsapp.ts` (`retryPendingMessages`) — `checkAndTrack()` per msg (Fase 4)

### Frontend ✅ Selesai
- [x] `app/dashboard/layout.tsx` — Pakai `usage.daily` dari `/api/auth/me`, polling 60s
- [x] `app/dashboard/settings/page.tsx` — `subscription.dailySentCount` → `usage.daily`
- [x] `app/dashboard/page.tsx` — Import `TIER_DAILY_LIMITS` dari shared constants
- [x] `app/dashboard/limit-watcher.tsx` — Import `TIER_DAILY_LIMITS` dari shared constants
- [x] `app/dashboard/limit-constants.ts` — **Baru:** shared constants file

### Backfill (one-time) ❌ Belum
- [ ] `scripts/backfill-usage.ts` — Backfill historis dari `WhatsAppMessage` (Fase 4)

### Dead Fields ❌ Belum
- [ ] `WhatsAppSession.dailyCount/monthlyCount` — hapus di major version (Fase 4)

---

## 4. Data Flow — Sesudah

```
Sidebar                    Settings Page               Dashboard               LimitWatcher
   │                          │                          │                       │
   │ /api/settings            │ /api/settings             │ /api/settings         │ /api/settings
   ▼                          ▼                          ▼                       ▼
{usage: {daily, monthly}}  {usage: {daily, monthly}}  {usage: {daily, monthly}} {usage: {daily, monthly}}
   │                          │                          │                       │
   │ usage.daily              │ usage.daily               │ usage.daily           │ usage.daily
   │ ✅ REAL DATA            │ ✅ REAL DATA              │ ✅ REAL DATA          │ ✅ REAL DATA
   │ Poll tiap 60s           │ (no change)               │ ✅ sdh benar          │ ✅ sdh benar
```

---

## 5. Fase Implementasi — Status

| Fase | Isi | Status | Waktu |
|------|-----|--------|-------|
| **1 — KRITIS** | `UsageRecord` model + `usage-tracker.ts` + `api-tier.ts` + fix auth/me + fix sidebar + fix settings page + GAP 1 (chatbot) | ✅ Selesai | ~4 jam |
| **2 — HIGH** | GAP 2+3 (scheduled message) + retry fix + broadcast queue + messages route | ✅ Selesai | ~2 jam |
| **3 — MEDIUM** | Cron sync endpoint + frontend limits import + shared constants | ✅ Selesai | ~1 jam |
| **4 — CLEANUP** | Backfill script + `retryPendingMessages` limit check + queue worker safety net + dead fields removal + rate limiter Redis | ❌ Belum | ~2 jam |

---

## 6. Testing Checklist — Status

### Backend Limit Enforcement

| # | Test Case | Status |
|---|-----------|--------|
| 1.1 | `POST /api/messages` — 1 recipient sukses | ❌ |
| 1.2 | `POST /api/messages` — batch 3 recipient sukses | ❌ |
| 1.3 | Daily limit exceeded (free >50) → 429 | ❌ |
| 1.4 | Monthly limit exceeded (free >500) → 429 | ❌ |
| 1.5 | Rate limit exceeded (31 req/min) → 429 | ❌ |
| 1.6 | `POST /api/broadcast` sukses (pro/enterprise) | ❌ |
| 1.7 | Broadcast over limit → limit_exceeded | ❌ |
| 1.8 | Broadcast tanpa akses (free) → 403 | ❌ |
| 1.9 | `POST /api/messages/retry` — 1 pesan, no duplicate | ❌ |
| 1.10 | Retry batch — no duplicate records | ❌ |
| 1.11 | Retry over limit → limit_exceeded | ❌ |
| 1.12 | `POST /api/cron/process-scheduled` — daily+monthly check | ❌ |
| 1.13 | Scheduled over daily limit → recipients di-skip | ❌ |
| 1.14 | Chatbot auto-reply via incoming message | ❌ |
| 1.15 | Chatbot over limit → reply silent skip | ❌ |
| 1.16 | Auto-reply 1x/hari per kontak | ❌ |
| 1.17 | Reconnect + `retryPendingMessages` | ❌ |

### Redis & Database

| # | Test Case | Status |
|---|-----------|--------|
| 2.1 | Redis `INCR` setelah send | ❌ |
| 2.2 | Redis TTL daily (~48 jam) | ❌ |
| 2.3 | Redis TTL monthly (~62 hari) | ❌ |
| 2.4 | Redis miss → fallback ke `UsageRecord` | ❌ |
| 2.5 | Redis re-populate dari DB | ❌ |
| 3.1 | `UsageRecord` dibuat setelah send | ❌ |
| 3.2 | Count increment (3 send → count=3) | ❌ |
| 3.3 | Atomic upsert concurrent | ❌ |
| 3.4 | Period key WIB (23:00 UTC = 06:00 WIB+1) | ❌ |
| 4.1 | Cron sync endpoint auth → 401 tanpa secret | ❌ |
| 4.2 | Cron sync sukses → `{ok:true, synced:N}` | ❌ |
| 4.3 | Data konsisten setelah sync | ❌ |

### Frontend Display

| # | Test Case | Status |
|---|-----------|--------|
| 5.1 | Sidebar dailyPct update ≤60 detik | ❌ |
| 5.2 | Sidebar "Aman" + hijau (<50%) | ❌ |
| 5.3 | Sidebar "Waspada" + kuning (50-79%) | ❌ |
| 5.4 | Sidebar "Berisiko" + merah (≥80%) | ❌ |
| 5.5 | Settings page daily usage real (≠ 0) | ❌ |
| 5.6 | Settings page safety level real | ❌ |
| 5.7 | Dashboard overview usage bars real | ❌ |
| 5.8 | LimitWatcher toast >80% | ❌ |
| 5.9 | Toast hanya sekali (shownRef) | ❌ |

### WIB Timezone & Edge Cases

| # | Test Case | Status |
|---|-----------|--------|
| 6.1 | Daily reset implisit (23:59 → 00:02 WIB) | ❌ |
| 6.2 | Monthly reset implisit (31 → 1) | ❌ |
| 7.1 | Redis down → fallback DB | ❌ |
| 7.2 | Concurrent send 10x paralel → no over-limit | ❌ |
| 7.3 | User <7 hari → limit 20 (free) | ❌ |
| 7.4 | User 7-30 hari → limit 35 (free) | ❌ |
| 7.5 | User 30+ hari → limit 50 (free) | ❌ |
| 7.6 | Enterprise unlimited → no limit error | ❌ |
| 7.7 | Regression: GET /api/messages pagination | ❌ |
| 7.8 | Regression: GET /api/settings | ❌ |
| 7.9 | Regression: GET /api/auth/me | ❌ |
| 7.10 | Regression: scheduler CRUD | ❌ |
