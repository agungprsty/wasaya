# Rencana Strategis Mitigasi Pemblokiran (Banned) oleh Meta — Human Mimicry

> **Tujuan:** Menerapkan strategi "Human Mimicry" (Meniru Perilaku Manusia) di tingkat kode dan "Edukasi Batasan" di tingkat pengguna untuk menekan risiko pemblokiran akun WhatsApp unofficial oleh Meta/WABusiness.

---

## Ringkasan Temuan Saat Ini

| Aspek | Status | Dampak Risiko |
|-------|--------|---------------|
| `sendPresenceUpdate()` (typing/recording) | ❌ Tidak pernah dipanggil | Tinggi — bot tidak menunjukkan aktivitas seperti manusia |
| `sendReceipt()` / `readMessages()` (read mark) | ❌ Tidak pernah dipanggil | Tinggi — pesan dibaca instan tanpa jejak |
| Dynamic randomized delay | ❌ Semua delay hardcoded `1200ms` | Tinggi — pola interval tetap mudah dideteksi |
| Per-message delay di `sendMessage()` | ❌ Tidak ada | Tinggi — pesan dikirim instan tanpa jeda |
| Message queue / antrian | ❌ Tidak ada | Sangat Tinggi — tidak ada recovery, tidak ada kontrol laju |
| Typing simulation di chatbot | ❌ Chatbot reply instan | Tinggi — balasan dalam < 1 detik, tidak manusiawi |
| Pengaturan anti-ban di Settings model | ❌ Belum ada field | Sedang — user tidak bisa dikonfigurasi/dibatasi |
| Per-conversation rate limiting | ❌ Tidak ada | Sedang — spam ke 1 nomor bisa terjadi |
| Daily & monthly send limit per user | ❌ Tidak ada | Rendah — hanya dikekang API rate limit (30/min) |
| Monitoring adaptif (auto slow-down) | ❌ Tidak ada | Rendah — tidak ada respon otomatis terhadap sinyal bahaya |
| BullMQ + Redis (production queue) | ❌ Tidak ada | Sangat Tinggi — in-memory queue riskan hilang saat restart/crash |
| Outbound-Inbound Ratio tracking | ❌ Tidak ada | Sedang — akun dengan ratio 10:1 (kirim:terima) mudah dideteksi |
| Proxy per device | ❌ Tidak ada | Sedang — satu IP terbanned bisa lumpuhkan semua akun |
| Tiered pricing (Free/Pro/Enterprise) | ❌ Tidak ada | Kritis — abuse dari free user bisa cemari IP server |
| BullMQ priority queue (starvation protection) | ❌ Tidak ada | Sedang — antrean free user bisa blokir pesan Pro user |

---

## 💰 Struktur Pricing Final

### Free (Rp 0 / Selamanya)
**Target:** UMKM Mandiri & Pemula
- 500 pesan/bulan (maks 50 pesan/hari)
- 1 koneksi perangkat
- Bot Auto-Balas (Basic)
- Integrasi REST API (OTP/Notifikasi)
- Sistem Proteksi Otomatis Meta (Aktif)
- ❌ Broadcast Massal — dipindah ke Pro
- ❌ Fitur Terjadwal

### Pro (Rp 49.000 / Bulan)
**Target:** Bisnis Berkembang & Toko Online Aktif
- 5.000 pesan/bulan (maks 200 pesan/hari)
- 2 koneksi perangkat
- Semua fitur Free +
- ✅ Broadcast Massal (Smart Queue)
- ✅ Pesan Terjadwal
- ✅ Integrasi Webhook
- ✅ Panel Keamanan Akun
- ✅ 3 Preset Human Mimicry

### Enterprise (Hubungi Kami)
**Target:** Skala Besar, Korporat & Tim
- Pesan tak terbatas (dikekang Live Safety Monitor)
- Multi-perangkat (hingga 10)
- ✅ Dedicated Proxy Support (Isolasi IP)
- ✅ Bebas Batasan Harian
- ✅ Prioritas Antrean Utama (Real-time)
- ✅ Kustomisasi penuh Human Mimicry (ms-level)
- ✅ Webhook Alert Keamanan

---

## 🎯 Model Subscription (Prisma)

```prisma
model Subscription {
  id        String   @id @default(uuid())
  userId    String   @unique
  tier      String   @default("free")      // "free" | "pro" | "enterprise"
  status    String   @default("active")    // "active" | "expired" | "cancelled"
  startsAt  DateTime @default(now())
  endsAt    DateTime?
  features  Json?                          // feature overrides (future)

  // Monthly tracking
  monthlySentCount  Int      @default(0)
  lastMonthlyReset  DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 🏆 Tier-Based Feature Matrix

| Fitur | Free (Rp 0) | Pro (Rp 49.000) | Enterprise (Custom) |
|-------|------------|-----------------|---------------------|
| **Monthly Limit** | 500 pesan/bln | 5.000 pesan/bln | Unlimited (safety monitor) |
| **Daily Limit** | 50 pesan/hari | 200 pesan/hari | Unlimited (safety monitor) |
| **Broadcast Massal** | ❌ Tidak Tersedia | ✅ Smart Queue | ✅ High Speed |
| **Max Devices** | 1 | 2 | 10 |
| **Human Mimicry** | Wajib Aktif (locked) | 3 Preset configurable | Full custom (ms-level) |
| **Typing Simulation** | Otomatis (CPM dinamis) | Lambat/Normal/Cepat | Custom ms + CPM rate |
| **Per-Conversation Limit** | 5 pesan / 10 menit | 10 pesan / 5 menit | 20 pesan / 1 menit (configurable) |
| **Safety Dashboard** | Status indikator & rasio saja | Full analytics + grafik tren | Full analytics + webhook alert |
| **Admin Number Bypass** | ❌ | ✅ (3 nomor) | ✅ (unlimited) |
| **Proxy per Device** | ❌ Shared Server IP | ❌ Shared Server IP | ✅ Mendukung Proxy (user-provided) |
| **BullMQ Priority** | 3 (Low Priority) | 2 (Normal Priority) | 1 (High Priority / Real-time) |
| **Queue Concurrency** | 1 worker (sekuensial) | 2 worker (paralel) | 5-10 worker (high performance) |
| **Pesan Terjadwal** | ❌ | ✅ | ✅ |
| **Webhook** | ❌ | ✅ | ✅ |

---

## 📋 Rencana Strategis — 6 Fase

### Fase 1: Simulasi Membaca & Mengetik (Typing + Read Receipt)
**Tujuan:** Membuat bot terlihat seperti manusia yang membaca pesan, berpikir, lalu mengetik sebelum merespons.

**Dampak Anti-Ban:** 🟢 Rendah — tapi merupakan fondasi penting

#### 1A. Tandai Pesan Sebagai Dibaca (Read Receipt dengan Jeda)
- **Lokasi:** `lib/whatsapp.ts` — handler `messages.upsert`
- **Saat:** Setelah jeda 800-2500ms (simulasi lihat notifikasi HP), baru panggil read mark
- **Kode:**
  ```typescript
  // Jangan read instan! Beri jeda seolah lihat notifikasi dulu
  await sleep(800 + Math.random() * 1700); // 0.8-2.5 detik
  await sock.readMessages([msg.key]);
  ```

#### 1B. Kirim Status "Mengetik" Proporsional Panjang Teks
- **Lokasi:** `lib/whatsapp.ts` — handler `messages.upsert`, sebelum memproses auto-reply/chatbot
- **Saat:** Sebelum mengirim balasan (chatbot, auto-reply)
- **Alur:**
  1. `sock.sendPresenceUpdate("composing", jid)` — mulai mengetik
  2. Jeda dinamis berdasarkan **MS_PER_CHAR**:
     ```typescript
     // Kecepatan mengetik manusia cepat: ~400 karakter/menit (~150ms/karakter)
     const MS_PER_CHAR = 150;
     const calculatedDelay = replyBody.length * MS_PER_CHAR;
     const finalDelay = Math.min(
       settings.maxTypingDelay,
       Math.max(settings.minTypingDelay, calculatedDelay)
     );
     await sleep(finalDelay);
     ```
  3. `sock.sendPresenceUpdate("paused", jid)` — berhenti mengetik
  4. Jeda kecil 0.5-2 detik (seolah periksa kembali pesan)
  5. Kirim pesan

#### 1C. Presence Sebelum Kirim Pesan (Single Send)
- **Lokasi:** `lib/whatsapp.ts` — method `sendMessage()`
- **Saat:** Hanya untuk pengiriman ke 1 nomor (bukan broadcast)
- **Alur:**
  1. `sock.sendPresenceUpdate("composing", jid)`
  2. Jeda dinamis berdasarkan panjang body (MS_PER_CHAR)
  3. `sock.sendPresenceUpdate("paused", jid)`
  4. Kirim

> **Peringatan:** Jangan kirim presence ke grup (`jid.includes("@g.us")`) atau untuk broadcast/scheduled massal — akan memicu red flag karena terlalu banyak "mengetik" secara bersamaan.

#### 1D. Perubahan Schema Prisma — Settings
Tambahkan ke model `Settings`:
```prisma
humanMimicryActive  Boolean @default(true)
minTypingDelay      Int     @default(2000)  // ms
maxTypingDelay      Int     @default(8000)  // ms
```

#### 1E. File yang Diubah
| File | Perubahan |
|------|-----------|
| `lib/whatsapp.ts` | Tambah `sock.readMessages()` dengan jeda 0.8-2.5s; tambah `sendPresenceUpdate` sebelum sendMessage; tambah MS_PER_CHAR delay |
| `lib/chatbot.ts` | Integrasi typing simulation + MS_PER_CHAR sebelum `whatsappManager.sendMessage()` |
| `prisma/schema.prisma` | Tambah field `humanMimicryActive`, `minTypingDelay`, `maxTypingDelay` ke Settings; tambah model `Subscription` |
| `app/api/settings/route.ts` | Tambah field baru ke API |

---

### Fase 2: Dynamic Randomized Delay Engine (MS_PER_CHAR + Jitter)
**Tujuan:** Mengganti semua delay hardcoded (`1200ms`) dengan delay dinamis berbasis MS_PER_CHAR + jitter acak.

**Dampak Anti-Ban:** 🟢🟡 Sedang — membuat pola pengiriman lebih alami

#### 2A. File Baru: `lib/delay-engine.ts`
```typescript
type DelayProfile = "chatbot" | "direct-send" | "broadcast" | "retry";

function getDelayConfig(profile: DelayProfile, settings?: Settings): DelayConfig;
function humanDelay(profile: DelayProfile, textLength?: number, settings?: Settings): Promise<void>;
function randomBetween(min: number, max: number): number;
```

#### 2B. Kalkulasi MS_PER_CHAR
```typescript
/**
 * MS_PER_CHAR: milidetik per karakter
 * - 150ms/karakter = ~400 karakter/menit (kecepatan mengetik cepat manusia)
 * - 300ms/karakter = ~200 karakter/menit (kecepatan rata-rata manusia)
 * - 200ms/karakter = ~300 karakter/menit (default Free — lebih lambat/aman)
 */
export function calculateTypingDelay(
  textLength: number,
  minDelay: number,
  maxDelay: number,
  msPerChar = 150  // configurable untuk Enterprise
): number {
  const calculated = textLength * msPerChar;
  return Math.max(minDelay, Math.min(maxDelay, calculated));
}
```

#### 2C. MS_PER_CHAR Values per Tier
| Tier | MS_PER_CHAR | Setara CPM | Typing Feel |
|------|-------------|-----------|-------------|
| Free | 200ms (locked) | 300 CPM | Santai — lebih aman |
| Pro | 150ms (preset) | 400 CPM | Cepat — natural |
| Enterprise | 100-300ms (custom) | 200-600 CPM | Bebas atur |

#### 2D. Profil Delay

| Profile | Free | Pro | Enterprise |
|---------|------|-----|------------|
| `chatbot` | MS_PER_CHAR (3-10s) locked | MS_PER_CHAR (2-8s) preset | MS_PER_CHAR (custom ms) |
| `direct-send` | MS_PER_CHAR (2-6s) locked | MS_PER_CHAR (1-5s) preset | MS_PER_CHAR (custom ms) |
| `broadcast` | 5-10 detik (jika diakses) | 3-8 detik | 2-5 detik |
| `retry` | 3-6 detik | 2-5 detik | 1-3 detik |

Jitter: ±(20-40%) tergantung profil.

#### 2E. File yang Diubah
| File | Perubahan |
|------|-----------|
| `lib/delay-engine.ts` | **BARU** — fungsi delay + profil + MS_PER_CHAR calculator |
| `lib/whatsapp.ts` | Panggil `humanDelay()` dengan textLength & msPerChar dari settings tier |
| `app/api/cron/process-scheduled/route.ts` | Ganti `await new Promise((r) => setTimeout(r, 1200))` dengan `humanDelay("broadcast")` |

---

### Fase 3: BullMQ + Redis — Priority Queue & Anti-Abuse Pipeline
**Tujuan:** Mencegah pengiriman massal instan, pastikan tidak ada pesan hilang, dan lindungi pengguna berbayar dari queue starvation.

**Dampak Anti-Ban:** 🔴 Sangat Tinggi — backbone reliability + anti-abuse

#### 3A. Instalasi
```bash
npm install bullmq ioredis
```

#### 3B. Redis Configuration

**File baru:** `docker-compose.yml` (jika belum ada, buat di root project)
```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: wawawa-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --appendfsync everysec
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  redis_data:
```

**File baru:** `lib/redis.ts`
```typescript
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
```

**.env.example:**
```
REDIS_URL=redis://localhost:6379
```

#### 3C. File Baru: `lib/message-queue.ts`

**Skema queue — Single Queue dengan Priority per Tier:**
```
Queue: "wa-send"
├── Job: { userId, tier, jid, body, media, deviceId, location }
│
├── Priority (BullMQ):
│   1 = Enterprise  (diproses duluan)
│   2 = Pro         (diproses setelah Enterprise)
│   3 = Free        (diproses paling akhir)
│
├── Tier-Based Concurrency:
│   Free:       1 job at a time  (sekuensial lambat)
│   Pro:        2 jobs at a time
│   Enterprise: 5-10 jobs at a time
│
├── Job options:
│   ├── attempts: 3
│   ├── backoff: { type: "exponential", delay: 5000 }
│   └── removeOnComplete: true
```

**Validasi Broadcast (Free → 403):**
```typescript
// app/api/messages/route.ts — sebelum enqueue
async function validateSend(userId: string, tier: string, recipients: number) {
  if (tier === "free" && recipients > 1) {
    return NextResponse.json(
      {
        error: "Fitur broadcast massal hanya tersedia di paket Pro.",
        upgrade_url: "/pricing",
      },
      { status: 403 }
    );
  }
  // ...
}
```

**Queue + Worker Implementation:**
```typescript
import { Queue, Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { whatsappManager } from "@/lib/whatsapp";

interface SendJobData {
  userId: string;
  tier: "free" | "pro" | "enterprise";
  jid: string;
  body: string;
  media?: { base64: string; mimetype: string; filename?: string } | null;
  deviceId: string;
  location?: { latitude: number; longitude: number; title?: string } | null;
}

const TIER_PRIORITY: Record<string, number> = {
  enterprise: 1,
  pro: 2,
  free: 3,
};

const TIER_CONCURRENCY: Record<string, number> = {
  enterprise: 10,
  pro: 2,
  free: 1,
};

export const sendQueue = new Queue<SendJobData>("wa-send", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function enqueueMessage(
  data: SendJobData,
  options?: { dedupId?: string }
): Promise<Job<SendJobData>> {
  return sendQueue.add(`send:${data.jid}`, data, {
    priority: TIER_PRIORITY[data.tier] || 3,
    deduplication: options?.dedupId
      ? { id: options.dedupId, ttl: 60000 }
      : undefined,
  });
}

// Worker dengan tier-aware processing
const worker = new Worker<SendJobData>(
  "wa-send",
  async (job) => {
    const { userId, tier, jid, body, media, deviceId, location } = job.data;

    const allowed = await checkThrottle(userId, jid, tier);
    if (!allowed) {
      const requeueDelay = tier === "free" ? 30_000 : 10_000;
      await enqueueMessage(job.data);
      throw new Error(`Throttled. Re-queued with ${requeueDelay}ms delay.`);
    }

    await whatsappManager.sendMessage(userId, jid, body, media, deviceId, location);
  },
  {
    connection: redis,
    concurrency: Math.max(...Object.values(TIER_CONCURRENCY)), // max = 10
    limiter: {
      max: 5,
      duration: 1000,
    },
  }
);

// Per-tier rate limiter inline
const tierLimiter = {
  free: { max: 1, duration: 2000 },
  pro: { max: 2, duration: 1000 },
  enterprise: { max: 10, duration: 1000 },
};
```

#### 3E. Per-Conversation Throttle (Tier-Aware + Admin Bypass)
```typescript
const TIER_LIMITS = {
  free: { maxPerWindow: 5, windowMinutes: 10 },
  pro: { maxPerWindow: 10, windowMinutes: 5 },
  enterprise: { maxPerWindow: 20, windowMinutes: 1 },
};

async function checkThrottle(userId: string, jid: string, tier: string): Promise<boolean> {
  // Bypass admin numbers (hanya Pro & Enterprise)
  if (tier !== "free") {
    const settings = await prisma.settings.findUnique({ where: { userId } });
    const adminNumbers = (settings?.adminNumbers as string[]) || [];
    const normalizedJid = jid.split("@")[0];
    if (adminNumbers.includes(normalizedJid)) return true;
  }

  const limit = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
  const key = `throttle:${userId}:${jid}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, limit.windowMinutes * 60);
  return count <= limit.maxPerWindow;
}
```

#### 3F. Queue Starvation Prevention
| Mekanisme | Cara Kerja |
|-----------|-----------|
| BullMQ Priority | Enterprise (1) > Pro (2) > Free (3) |
| Per-Tier Rate Limiter | Free: 1 job/2s; Pro: 2 job/s; Enterprise: 10 job/s |
| Per-Conversation Limit | Free: 5/10menit; Pro: 10/5menit; Enterprise: 20/1menit |
| Admin Bypass | Hanya Pro+ untuk testing |
| Broadcast Lock | Free dapat 403 jika coba kirim > 1 penerima |

#### 3G. File yang Diubah
| File | Perubahan |
|------|-----------|
| `lib/redis.ts` | **BARU** — Redis client instance |
| `lib/message-queue.ts` | **BARU** — BullMQ Queue + Worker + tier-aware throttle + priority |
| `lib/whatsapp.ts` | `sendMessage()` enqueue via BullMQ; `retryPendingMessages()` juga lewat queue |
| `app/api/messages/route.ts` | Validasi daily/monthly limit + tier + tolak broadcast untuk Free |
| `app/api/cron/process-scheduled/route.ts` | Enqueue per recipient dengan tier user |
| `prisma/schema.prisma` | Tambah model `Subscription` (dengan monthlySentCount); field `adminNumbers` (String[]) ke Settings |
| `package.json` | Tambah `bullmq`, `ioredis` |
| `.env.example` | Tambah `REDIS_URL` |

---

### Fase 4: Edukasi & Batasan di Tingkat Pengguna (UI)
**Tujuan:** Membatasi pengguna dari perilaku berisiko tinggi melalui UI bertingkat sesuai tier.

**Dampak Anti-Ban:** 🟢 Sedang — mencegah user menyabot diri sendiri

#### 4A. Panel per Tier

**Free:**
- ✅ Indikator status keamanan (Aman / Waspada / Berisiko) — read only
- ✅ "Pesan Terkirim: 42 / 500 bulan ini | 12 / 50 hari ini"
- ✅ Outbound-Inbound Ratio (read only)
- ❌ **Menu Broadcast digembok** 🔒 — klik muncul modal:
  > "Ingin mengirim info promo ke ratusan pelanggan sekaligus dengan aman? Upgrade ke Paket Pro untuk membuka fitur Smart Broadcast Massal."
- ❌ Tidak bisa ubah pengaturan safety
- ❌ Tidak ada slider kecepatan

**Pro:**
- ✅ Safety Dashboard penuh: grafik 7 hari, tren, rasio
- ✅ 3 Preset Keamanan: Aman / Normal / Agresif
- ✅ Admin Number Bypass (max 3 nomor)
- ✅ Broadcast aktif tanpa gembok
- ✅ Peringatan real-time + toast

**Enterprise:**
- ✅ Semua fitur Pro
- ✅ Kustom penuh: min/max delay (ms), MS_PER_CHAR, range typing
- ✅ Admin Bypass unlimited
- ✅ Webhook alert "Berisiko" → POST ke URL kustom
- ✅ Proxy configuration per device

#### 4B. Validasi API Server-side

```typescript
// lib/api-tier.ts — limit checker
export async function checkLimits(userId: string): Promise<LimitResult> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const tier = sub?.tier || "free";

  const limits: Record<string, TierLimits> = {
    free: {
      dailyLimit: 50,
      monthlyLimit: 500,
      concurrency: 1,
      adminSlots: 0,
      broadcast: false,
    },
    pro: {
      dailyLimit: 200,
      monthlyLimit: 5_000,
      concurrency: 2,
      adminSlots: 3,
      broadcast: true,
    },
    enterprise: {
      dailyLimit: Infinity,
      monthlyLimit: Infinity,
      concurrency: 10,
      adminSlots: Infinity,
      broadcast: true,
    },
  };

  return limits[tier] || limits.free;
}

export async function checkMonthlyLimit(userId: string, tier: string): Promise<boolean> {
  if (tier === "enterprise") return true;
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const limit = tier === "pro" ? 5_000 : 500;
  return (sub?.monthlySentCount ?? 0) < limit;
}
```

**Response untuk Free yang melanggar:**
```json
{
  "error": "Batas bulanan tercapai (500/500). Lanjut bulan depan atau upgrade ke Pro untuk 5.000 pesan/bulan.",
  "upgrade_url": "/pricing"
}
```

#### 4C. Peringatan Real-time
- Free: toast saat > 80% daily atau monthly limit
- Pro: toast + modal warning broadcast > 100 recipients
- Enterprise: webhook POST saat approaching limit

#### 4D. Grafik Pemantauan (Pro+)
- `GET /api/analytics/daily-sends` — 7 hari terakhir
- `GET /api/analytics/monthly-usage` — tren bulanan
- `GET /api/analytics/outbound-inbound-ratio` — rasio harian
- `GET /api/analytics/failed-rate` — % gagal kirim

#### 4E. File yang Diubah
| File | Perubahan |
|------|-----------|
| `lib/api-tier.ts` | **BARU** — helper cek tier, daily limit, monthly limit, aging |
| Dashboard settings page | Panel Anti-Ban berbeda per tier; menu Broadcast digembok (Free) |
| `app/api/settings/route.ts` | Validasi tier + field baru (adminNumbers) |
| `app/api/messages/route.ts` | Cek daily + monthly limit + tolak broadcast (Free) |
| `app/api/analytics/route.ts` | **BARU** — endpoint statistik (Pro+) |
| Dashboard layout/sidebar | Safety indicator + upgrade prompt (Free) |

---

### Fase 5: Rotasi Pola & Variasi Perilaku Lanjutan
**Tujuan:** Membuat fingerprint bot berubah terus sehingga tidak mudah dikenali oleh AI behavioral analysis Meta.

**Dampak Anti-Ban:** 🟠🔴 Sangat Tinggi

#### 5A. Random Message Structure (Chatbot Only) — Semua Tier
- 70% quoted reply, 30% fresh message
- Jangan untuk broadcast

```typescript
if (Math.random() < 0.7 && incomingMsg.key) {
  await sock.sendMessage(jid, { text: reply, quoted: incomingMsg.key });
} else {
  await sock.sendMessage(jid, { text: reply });
}
```

#### 5B. Variasi "Online" Presence — Semua Tier
- 1 dari 3 pesan kirim `presence: "available"`
- Online 30s-5m (acak)

```typescript
if (Math.random() < 0.33) {
  await sock.sendPresenceUpdate("available");
}
```

#### 5C. ~~Session Refresh Periodik~~ ❌ **DIHAPUS**
> WhatsApp original mempertahankan Long-lived TCP Socket. Hard reconnect periodik bisa memicu sinyal session hijacking.

#### 5D. File yang Diubah
| File | Perubahan |
|------|-----------|
| `lib/whatsapp.ts` | Tambah quoted random, presence variation |
| `lib/chatbot.ts` | Bawa `incomingMsgKey` untuk quoted reply |

---

### Fase 6: Monitoring Adaptif, Proxy, & Akun Aging
**Tujuan:** Deteksi sinyal awal banned, auto slow-down, isolasi akun dengan proxy.

**Dampak Anti-Ban:** 🔴 Kritis

#### 6A. File Baru: `lib/safety-monitor.ts`
```typescript
interface SafetyStatus {
  userId: string;
  deviceId: string;
  tier: "free" | "pro" | "enterprise";
  level: "normal" | "caution" | "danger" | "quarantine";
  violations: number;
  lastViolationAt: number;
  outboundRatio: number;
}

class SafetyMonitor {
  private errorHistory: Map<string, { time: number; code: number }[]> = new Map();
  private userStatus: Map<string, SafetyStatus> = new Map();
  private redis: Redis;
}
```

#### 6B. Trigger Auto Slow-down

| Skenario | Ambang | Free | Pro | Enterprise |
|----------|--------|------|-----|------------|
| Error > normal | > 3 error/5m | 🔒 Otomatis | 🔒 Otomatis | ⚙️ Custom |
| Error 408 (Timeout) | > 2/10m | 🔒 Slow 3x | 🔒 Slow 3x | ⚙️ Custom |
| Error 429 (Rate limited WA) | 1 | 🔒 Backoff 5m | 🔒 Backoff 5m | ⚙️ Custom |
| Disconnect tiba-tiba | > 2/jam | 🔒 Mode darurat | 🔒 Mode darurat | ⚙️ Custom |
| `loggedOut` | 1 | 🔒 Stop semua | 🔒 Stop semua | 🔒 Stop semua |
| Outbound ratio > threshold | Harian | 10:1 freeze | 15:1 warning | 20:1 warning |

#### 6C. Akun Aging — Wajib Free & Pro
- **0-7 hari (Newborn):** Free=20/hr, Pro=50/hr
- **7-30 hari (Growing):** Free=35/hr, Pro=100/hr
- **30+ hari (Established):** Free=50/hr, Pro=200/hr
- Enterprise: bypass dengan konfirmasi risiko

```typescript
function getDailyLimit(tier: string, createdAt: Date): number {
  if (tier === "enterprise") return Infinity;
  const ageDays = (Date.now() - createdAt.getTime()) / 86400000;
  const base: Record<string, number[]> = {
    free: [20, 35, 50],
    pro: [50, 100, 200],
  };
  const limits = base[tier] || base.free;
  if (ageDays < 7) return limits[0];
  if (ageDays < 30) return limits[1];
  return limits[2];
}
```

#### 6D. Proxy per Device — Enterprise
```prisma
proxyUrl String?  // "socks5://user:pass@host:1080" — user sediakan sendiri
```

```typescript
// lib/whatsapp.ts — _doConnect()
if (session?.proxyUrl) {
  socketOptions.agent = new SocksProxyAgent(session.proxyUrl);
}
```

#### 6E. Mode Darurat (Quarantine)
- `isQuarantined: true` → BullMQ pause queue user
- Free: auto-release 24 jam
- Pro: auto-release 12 jam + manual release
- Enterprise: manual release + webhook alert

#### 6F. Reset Counter (Cron — setiap 00:00)
```typescript
// app/api/cron/reset-daily-counts/route.ts
await prisma.whatsAppSession.updateMany({
  data: { dailySentCount: 0, lastDailyReset: new Date() },
});

// app/api/cron/reset-monthly-counts/route.ts — setiap 01:00 tgl 1
await prisma.subscription.updateMany({
  data: { monthlySentCount: 0, lastMonthlyReset: new Date() },
});
```

#### 6G. File yang Diubah
| File | Perubahan |
|------|-----------|
| `lib/safety-monitor.ts` | **BARU** — monitoring + auto slow-down + tier-aware |
| `lib/whatsapp.ts` | Panggil safety monitor; dukung proxyUrl (Enterprise) |
| `lib/message-queue.ts` | Integrasi safety monitor (pause/resume queue per user) |
| `lib/api-tier.ts` | Integrasi daily + monthly limit dengan akun aging |
| `prisma/schema.prisma` | Tambah `proxyUrl`, `monthlySentCount`, `lastMonthlyReset`, field safety |
| `app/api/settings/route.ts` | Status quarantine + proxy settings (Enterprise) |
| `app/api/cron/reset-monthly-counts/route.ts` | **BARU** — reset monthly counter tiap awal bulan |
| `app/api/cron/reset-daily-counts/route.ts` | **BARU** — reset daily counter tiap tengah malam |
| Dashboard | Notifikasi quarantine + proxy config (Enterprise) |

---

## 📊 Prioritas & Timeline

| Prioritas | Fase | Estimasi | Dampak Anti-Ban | Proteksi Infrastruktur |
|-----------|------|----------|-----------------|----------------------|
| 🔴 **P1** | Fase 1 (Typing + Read) | 2-3 hari | 🟢 Fondasi | ❌ |
| 🔴 **P1** | Fase 2 (Delay Engine) | 1-2 hari | 🟢🟡 Sedang | ❌ |
| 🔴 **P1** | Fase 3 (BullMQ + Redis + Priority) | 5-6 hari | 🟡🟠 Tinggi | ✅✅✅ Kritis |
| 🟡 **P2** | Fase 4 (UI Edukasi per Tier) | 4-5 hari | 🟢 Tidak langsung | ✅✅ Proteksi free user |
| 🟢 **P3** | Fase 5 (Rotasi Pola) | 2-3 hari | 🟠🔴 Sangat Tinggi | ❌ |
| 🟢 **P3** | Fase 6 (Monitoring + Proxy + Aging) | 5-6 hari | 🔴 Kritis | ✅✅✅ Isolasi IP |

**Total estimasi: 19-25 hari kerja**

---

## ⚠️ Matriks Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Free user spam via broadcast | Dihilangkan | — | Broadcast dilarang di Free (403 Forbidden) |
| Free user abuse 500 pesan/bulan | Rendah | Rendah | Monthly limit + akun aging; 1 concurrency |
| Queue starvation | Sedang | Tinggi | BullMQ priority: Enterprise > Pro > Free |
| Redis crash | Rendah | Tinggi | Persistent + retry connection |
| Akun baru < 7 hari kena banned | Tinggi | Sedang | Aging: limit rendah + delay ekstra |
| Enterprise tanpa proxy kena banned | Sedang | Tinggi | Proxy wajib; validasi di settings |
| Satu IP kena banned | Rendah | Tinggi | Proxy per device isolasi IP |
| Monthly limit Free tercapai | Sedang | Rendah | Free: "Lanjut bulan depan" atau upgrade |
| Outbound ratio > threshold | Sedang | Sedang | Dashboard + auto slow-down |

---

## 🔧 Ringkasan Perubahan Schema Prisma

```prisma
// === BARU: Subscription model ===
model Subscription {
  id        String   @id @default(uuid())
  userId    String   @unique
  tier      String   @default("free")      // "free" | "pro" | "enterprise"
  status    String   @default("active")    // "active" | "expired" | "cancelled"
  startsAt  DateTime @default(now())
  endsAt    DateTime?
  features  Json?                          // feature overrides

  monthlySentCount  Int      @default(0)
  lastMonthlyReset  DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Settings — tambahan
model Settings {
  // ... existing fields ...

  // Fase 1 — Human Mimicry
  humanMimicryActive  Boolean @default(true)
  minTypingDelay      Int     @default(2000)
  maxTypingDelay      Int     @default(8000)

  // Fase 3 — Throttle + Admin Bypass (Pro+)
  perConversationLimit   Int      @default(10)
  perConversationWindow  Int      @default(5)
  adminNumbers           String[]

  // Fase 4 — Safety mode
  safetyMode              String @default("normal") // "strict" | "normal" | "relaxed" | "custom"
  enterpriseCustomSettings Json?                     // override msPerChar, dll
}

// WhatsAppSession — tambahan
model WhatsAppSession {
  // ... existing fields ...

  dailySentCount    Int      @default(0)
  lastDailyReset    DateTime?

  proxyUrl          String?   // Enterprise: "socks5://user:pass@host:1080"

  safetyViolations  Int      @default(0)
  lastViolationAt   DateTime?
  isQuarantined     Boolean  @default(false)
  accountAgeTier    String   @default("newborn")
  joinedAt          DateTime?
}
```

---

## 📁 Complete File Impact Matrix

| File | Status | Fase | Perubahan |
|------|--------|------|-----------|
| `lib/whatsapp.ts` | ✏️ Diubah | 1, 2, 3, 5, 6 | MS_PER_CHAR typing, read delay, enqueue BullMQ, quoted random, presence, safety, proxy |
| `lib/chatbot.ts` | ✏️ Diubah | 1, 5 | MS_PER_CHAR typing, quoted reply |
| `lib/delay-engine.ts` | **BARU** | 2 | MS_PER_CHAR calculator + delay profil + jitter |
| `lib/redis.ts` | **BARU** | 3 | Redis client instance |
| `lib/message-queue.ts` | **BARU** | 3, 6 | BullMQ queue + worker + tier priority + throttle + safety |
| `lib/safety-monitor.ts` | **BARU** | 6 | Monitoring adaptif + auto slow-down + ratio tracker |
| `lib/api-tier.ts` | **BARU** | 4, 6 | Helper tier, daily/monthly limit, aging |
| `lib/rate-limit.ts` | ✏️ Diubah | 3 | Redis per-conversation throttle (tier-aware) |
| `app/api/settings/route.ts` | ✏️ Diubah | 1, 3, 4 | Field baru + tier validation + admin/proxy |
| `app/api/messages/route.ts` | ✏️ Diubah | 3 | Enqueue + daily/monthly limit + tolak broadcast (Free) |
| `app/api/cron/process-scheduled/route.ts` | ✏️ Diubah | 2, 3 | Dynamic delay + enqueue via BullMQ |
| `app/api/cron/reset-daily-counts/route.ts` | **BARU** | 6 | Reset daily tiap 00:00 |
| `app/api/cron/reset-monthly-counts/route.ts` | **BARU** | 6 | Reset monthly tiap 01:00 tgl 1 |
| `app/api/analytics/route.ts` | **BARU** | 4 | Statistik harian + bulanan (Pro+) |
| `prisma/schema.prisma` | ✏️ Diubah | 1, 3, 4, 6 | Model Subscription + field Settings & WhatsAppSession |
| `package.json` | ✏️ Diubah | 3 | Tambah `bullmq`, `ioredis` |
| `.env.example` | ✏️ Diubah | 3 | Tambah `REDIS_URL` |
| Dashboard settings page | ✏️ Diubah | 4 | Panel per tier; Broadcast digembok (Free) |
| Dashboard layout/sidebar | ✏️ Diubah | 4 | Safety indicator + upgrade prompt |
| Dashboard analytics card | ✏️ Diubah | 4 | Grafik sends + ratio + tren (Pro+) |

---

## 📐 Catatan Teknis

### Baileys API Reference
```typescript
sock.sendPresenceUpdate(type, jid?)           // "composing" | "recording" | "paused" | "available"
sock.readMessages([key])                      // beri jeda 0.8-2.5s SEBELUM panggil
sock.sendReceipt(jid, participant, [ids], type)
sock.sendMessage(jid, { text, quoted })
```

### BullMQ Architecture
```
[Request] → cek tier → validasi limit (daily+monthly)
    ↓
broadcast? → Free: 403 | Pro+: lanjut
    ↓
enqueue → Redis "wa-send" → Worker (priority 1/2/3)
    ↓
throttle check → tier rate limiter → WaSocket.sendMessage
```

### Redis Key Design
```
throttle:{userId}:{jid}            → counter (TTL per tier)
daily:{userId}:{date}              → counter (TTL: 24h)
monthly:{userId}:{YYYY-MM}         → counter (TTL: 31d)
outbound-ratio:{userId}:{date}     → { sent, received }
safety:quarantine:{userId}         → flag (TTL: 24h)
bullmq:wa-send:*                   → managed by BullMQ
```

### MS_PER_CHAR — Penamaan
```typescript
// MS_PER_CHAR = milidetik per karakter (BUKAN CPM!)
// CPM = Characters Per Minute = 60.000 / MS_PER_CHAR
// 150ms/karakter = 400 CPM (cepat/touch typist)
// 200ms/karakter = 300 CPM (Free — lebih lambat, lebih aman)

const MS_PER_CHAR = 150;
const calculatedDelay = textLength * MS_PER_CHAR; // 200 × 150 = 30.000ms
const finalDelay = Math.min(maxDelay, Math.max(minDelay, calculatedDelay));
```

---

## Cara Memulai

```bash
# 1. Redis via Docker Compose
docker compose up -d redis

# 2. Install dependencies
npm install bullmq ioredis

# 3. File baru
touch lib/redis.ts lib/delay-engine.ts lib/message-queue.ts lib/safety-monitor.ts lib/api-tier.ts

# 4. Prisma
npx prisma migrate dev --name add-anti-ban-and-subscription
npx prisma generate

# 5. Seed default free subscription untuk user existing
# 6. npm run dev
```

### Urutan Implementasi
```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6
├── lib/api-tier.ts + Subscription sejak awal
├── Fase 3: priority queue + broadcast block (Free)
└── Fase 4: UI berbeda per tier + gembok broadcast
```

### Checklist Deploy
- [ ] `docker compose up -d redis` — Redis running dengan AOF persistence
- [ ] `REDIS_URL` terisi di `.env`
- [ ] Migrasi Prisma (Subscription + field baru)
- [ ] Semua user existing punya record Subscription (seed)
- [ ] BullMQ worker jalan (top-level import Next.js)
- [ ] Free: daily=50, monthly=500, broadcast=403, concurrency=1
- [ ] Pro: daily=200, monthly=5000, broadcast=aktif, concurrency=2
- [ ] Enterprise: unlimited + proxy + custom msPerChar
- [ ] Menu Broadcast Free: 🔒 gembok + modal upgrade
- [ ] Cron reset daily (00:00) + monthly (01:00 tgl 1)
