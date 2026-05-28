# Rencana Migrasi: `whatsapp-web.js` → `@whiskeysockets/baileys`

## Latar Belakang

Error `Attempted to use detached Frame` setelah berjalan 6+ jam disebabkan oleh **inherent limitation** Puppeteer/Chromium yang dipakai `whatsapp-web.js`. Solusi jangka panjang adalah migrasi ke **Baileys** — library WebSocket-native yang tidak memerlukan browser sama sekali.

---

## Perbandingan Arsitektur

| Aspek | whatsapp-web.js | Baileys |
|-------|----------------|---------|
| Engine | Puppeteer + Chromium (~150MB RAM) | WebSocket murni (~10-20MB RAM) |
| "Detached Frame" | Ya (inherent) | **Tidak mungkin** |
| Boot time | ~5-10 detik (launch Chrome) | ~1 detik (WS connect) |
| Maintainer activity | Sepi (issue menumpuk) | Aktif (9.6k stars, 996 commits) |
| node_modules | +~300MB (Chromium) | Ringan |
| Session recovery | Restart Chrome + QR | Auto via WebSocket |

---

## API Mapping: wwebjs → Baileys

### Inisialisasi & Koneksi

```typescript
// wwebjs
const client = new Client({
  authStrategy: new LocalAuth({ clientId: key, dataPath: "./wa_sessions" }),
  puppeteer: { headless: true, args: ["--no-sandbox"] },
});
await client.initialize();

// Baileys
import makeWASocket from "@whiskeysockets/baileys";
const { state, saveCreds } = await usePrismaAuthState(userId, deviceId);
const sock = makeWASocket({ auth: state });
// Socket adalah disposable — reconnect via connection.update event
```

### Events

| wwebjs | Baileys |
|--------|---------|
| `client.on("qr", cb)` | `sock.ev.on("connection.update", ...)` — cek `update.qr` |
| `client.on("ready", cb)` | `connection.update` → `connection === "open"` |
| `client.on("disconnected", cb)` | `connection.update` → `connection === "close"` |
| `client.on("message", cb)` | `sock.ev.on("messages.upsert", ...)` |
| `client.on("message_ack", cb)` | `sock.ev.on("messages.update", ...)` — cek `update.status` |

### Send Message

| wwebjs | Baileys |
|--------|---------|
| `client.sendMessage(id, body)` | `sock.sendMessage(jid, { text: body })` |
| `new MessageMedia(mime, base64)` | `{ image: Buffer.from(base64, "base64") }` (langsung Buffer/Stream/Url) |
| `new Location(lat, lng)` | `{ location: { degreesLatitude, degreesLongitude } }` |

### Contacts & Groups

| wwebjs | Baileys |
|--------|---------|
| `client.getContacts()` | Perlu implementasi via store (`contacts.upsert` event) atau `onWhatsApp()` |
| `client.getChats().filter(isGroup)` | `sock.groupFetchAllParticipating()` |
| `number@c.us` | `number@s.whatsapp.net` |

---

## File-by-File Changes

### 🔴 Modified

| # | File | Change |
|---|------|--------|
| 1 | `lib/whatsapp.ts` | **Rewrite total** — BaileysManager class |
| 2 | `lib/baileys-auth.ts` | **NEW** — Custom Prisma-based AuthenticationState |
| 3 | `lib/logger.ts` | **NEW** — Pino logger instance (level: `"silent"`) |
| 4 | `lib/chatbot.ts` | Adapt `sendMessage()` call signature |
| 5 | `app/api/whatsapp/status/route.ts` | Adapt response fields |
| 6 | `app/api/whatsapp/connect/route.ts` | QR/pairing flow baru |
| 7 | `app/api/whatsapp/disconnect/route.ts` | Minor — `sock.end()` |
| 8 | `app/api/whatsapp/qrcode/route.ts` | Ambil QR dari cache manager |
| 9 | `app/api/whatsapp/devices/route.ts` | Minor — response fields |
| 10 | `app/api/whatsapp/contacts/route.ts` | Return dari `contactsCache` (repository pattern) |
| 11 | `app/api/whatsapp/groups/route.ts` | Adapt `groupMetadata()` return |
| 12 | `app/api/messages/route.ts` | Minor — interface sama |
| 13 | `app/api/broadcast/route.ts` | Minor |
| 14 | `app/api/cron/process-scheduled/route.ts` | Minor |
| 15 | `prisma/schema.prisma` | **Add model** `BaileysAuthCred` |

### 🟢 Unchanged (no modification needed)

Semua dashboard files (`app/dashboard/*`) — mereka pakai `fetch()` ke API routes.
Files: `app/api/messages/export/route.ts`, `app/api/messages/retry/route.ts`, `lib/webhook.ts`, `lib/template-utils.ts`, `lib/phone-utils.ts`, `lib/rate-limit.ts`, `lib/prisma.ts`.

---

## Phase-by-Phase Migration

### Phase 0: Preparation (hari 1)

**0a. Install dependencies**
```bash
npm uninstall whatsapp-web.js puppeteer
npm install @whiskeysockets/baileys pino
# Optional: untuk link preview, thumbnail generation
npm install link-preview-js jimp
```

**0b. Update `.gitignore`**
```
/wa_sessions
/.wwebjs_cache
# wa_sessions dihapus — Baileys tidak pakai LocalAuth
```

**0d. Data migration script — JID format (`@c.us` → `@s.whatsapp.net`)**

Buat migration SQL untuk konversi semua JID di database:

```sql
-- Migration: convert stored JIDs from wwebjs format to Baileys format
UPDATE "WhatsAppMessage"
SET "to" = REPLACE("to", '@c.us', '@s.whatsapp.net')
WHERE "to" LIKE '%@c.us';

UPDATE "WhatsAppMessage"
SET "from" = REPLACE("from", '@c.us', '@s.whatsapp.net')
WHERE "from" LIKE '%@c.us';
```

Serta buat fungsi helper **wajib** di `lib/whatsapp.ts` yang dipanggil di SEMUA method yang butuh JID:

```typescript
// Helper: konversi nomor/ID ke format JID Baileys
// Menerima berbagai format input (dengan/tanpa @, @c.us, @s.whatsapp.net, @g.us)
function toJID(to: string): string {
  if (to.includes("@")) {
    // Sudah format JID — pastikan pakai @s.whatsapp.net, bukan @c.us
    return to.replace(/@c\.us$/, "@s.whatsapp.net");
  }
  // Nomor telpon mentah — tambah format JID
  const clean = to.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}
```

**0c. Prisma model baru**

```prisma
model BaileysAuthCred {
  id        String   @id @default(uuid())
  userId    String
  deviceId  String
  category  String   // creds | session | pre-key | sender-key | app-state-sync-key
  keyId     String?
  data      Json

  @@unique([userId, deviceId, category, keyId])
  @@index([userId, deviceId])
  @@map("baileys_auth_cred")
}
```

```bash
npx prisma migrate dev --name add_baileys_auth
```

---

### Phase 1: Auth State — `lib/baileys-auth.ts` (hari 2)

Implementasi custom `AuthenticationState` & `SignalKeyStore` berbasis Prisma.

**Interface target:**
```typescript
export async function usePrismaAuthState(
  userId: string,
  deviceId: string,
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}>;
```

Detail implementasi:
- `creds` disimpan di row dengan `category: "creds"`
- Signal keys (`session`, `pre-key`, `sender-key`, dll) disimpan per-ID di row terpisah
- Bungkus dengan `makeCacheableSignalKeyStore()` untuk performa
- `saveCreds()` di-trigger oleh event `creds.update`

---

### Phase 2: Core Manager Rewrite — `lib/whatsapp.ts` (hari 3-5)

**2a. Pino Logger — redam noise Baileys**

Baileys menggunakan Pino sebagai logger internal dan secara default sangat verbose (info/debug). Traffic WebSocket buffer akan membanjiri log server.

Solusi: inject instance logger dengan level `"silent"` atau `"error"`:

```typescript
import pino from "pino";

const sock = makeWASocket({
  auth: state,
  logger: pino({ level: "silent" }), // atau "error" untuk tetap lihat error saja
  printQRInTerminal: false,          // QR tidak di-print terminal, tampilkan via API
});
```

Buat logger singleton di file terpisah agar konsisten:

```typescript
// lib/logger.ts
import pino from "pino";
export const waLogger = pino({
  level: process.env.NODE_ENV === "development" ? "warn" : "silent",
});
```

**Arsitektur baru:**
```
BaileysManager (singleton, keyed by userId_deviceId)
├── sockets: Map<string, WASocket>
├── connecting: Map<string, Promise<void>>
├── qrCache: Map<string, string | null>
├── authStates: Map<string, AuthenticationState>
├── contactsCache: Map<string, { name: string; number: string; jid: string }>
├── knownSessions: Map<string, { userId, deviceId }>
│
├── startConnect(userId, deviceId)
├── disconnect(userId, deviceId)
├── getStatus(userId, deviceId)
├── getQR(userId, deviceId)
├── sendMessage(userId, to, body, media, deviceId)
├── sendMedia(userId, to, media, caption, deviceId)
├── sendLocation(userId, to, lat, lng, deviceId)
├── getContacts(userId, deviceId)   ← return dari contactsCache
├── getGroups(userId, deviceId)
├── healthCheck()
└── _setupContactsStore(sock, key)  ← populate cache via events
```

**2b. Contacts Repository Pattern — populate cache via event**

Baileys tidak punya `getContacts()` built-in. Implementasi in-memory cache yang di-populate via event `contacts.upsert` dan `contacts.update`:

```typescript
private _setupContactsStore(sock: WASocket, key: string) {
  sock.ev.on("contacts.upsert", (contacts) => {
    for (const c of contacts) {
      const jid = c.id;
      if (!jid) continue;
      const existing = this.contactsCache.get(key) || new Map();
      existing.set(jid, {
        name: c.name || c.notify || "",
        number: jid.split("@")[0],
        jid,
      });
      this.contactsCache.set(key, existing);
    }
  });

  sock.ev.on("contacts.update", (updates) => {
    const existing = this.contactsCache.get(key);
    if (!existing) return;
    for (const u of updates) {
      const jid = u.id;
      const contact = existing.get(jid);
      if (contact) {
        if (u.name) contact.name = u.name;
        if (u.notify) contact.name = u.notify;
      }
    }
  });
}

async getContacts(userId: string, deviceId = "main") {
  const key = makeKey(userId, deviceId);
  const cached = this.contactsCache.get(key);
  if (cached && cached.size > 0) {
    return Array.from(cached.values());
  }
  // Fallback: jika cache kosong (baru connect), trigger sync
  return [];
}
```

Catatan: Cache ini bersifat in-memory dan terisi setelah event `contacts.upsert` diproses (otomatis beberapa detik setelah `connection === "open"`). Untuk persistensi lintas restart, opsi Redis bisa ditambahkan sebagai iterasi berikutnya.

**2c. Helper `toJID()` — konversi format nomor ke JID Baileys**

Letakkan di `lib/whatsapp.ts` dan gunakan di SEMUA method yang menerima parameter `to`:

```typescript
function toJID(to: string): string {
  if (to.includes("@")) {
    return to.replace(/@c\.us$/, "@s.whatsapp.net");
  }
  const clean = to.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}
```

Fungsi ini:
- Menerima `@c.us` (format lama wwebjs) → otomatis konversi ke `@s.whatsapp.net`
- Menerima nomor mentah (`6281...`) → tambah format JID
- Menerima `@g.us` (group ID) → tidak berubah
- Menerima `@s.whatsapp.net` (format baru) → tetap

**Reconnect pattern (Baileys):**
```typescript
sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    this.qrCache.set(key, qr);
    // simpan QR ke DB...
  }

  if (connection === "open") {
    this.sockets.set(key, sock);
    // update DB status ke "connected"
    await this.retryPendingMessages(userId, deviceId, sock);
  }

  if (connection === "close") {
    this.sockets.delete(key);
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
    if (statusCode !== DisconnectReason.loggedOut) {
      // exponential backoff reconnect
      setTimeout(() => this.startConnect(userId, deviceId), delay);
    } else {
      // logged out — jangan reconnect, kasih notifikasi
    }
  }
});
```

**Send message:**
```typescript
// Helper toJID() dipanggil di semua method yang butuh JID
const jid = toJID(to);

// Text
await sock.sendMessage(jid, { text: body });
```

**Listen incoming messages:**
```typescript
sock.ev.on("messages.upsert", async ({ messages, type }) => {
  if (type !== "notify") return;
  for (const msg of messages) {
    if (msg.key?.fromMe) continue;

    const body = msg.message?.conversation
      ?? msg.message?.extendedTextMessage?.text
      ?? "";

    // Simpan ke DB, proses chatbot, kirim webhook...
  }
});
```

**Listen ACK:**
```typescript
sock.ev.on("messages.update", async (updates) => {
  for (const { key, update } of updates) {
    if (update.status !== undefined) {
      // map: 1=sent, 2=delivered, 3=read
      // update DB WhatsAppMessage...
    }
  }
});
```

---

### Phase 3: Update API Routes (hari 6)

Semua file di `app/api/whatsapp/*` — mostly adapt response types:

| Route | Key Change |
|-------|------------|
| `connect/route.ts` | QR pairing flow via `connection.update` |
| `status/route.ts` | Ambil `phone` dari `creds.me?.id` |
| `contacts/route.ts` | Return dari `contactsCache` (repository pattern) — lihat 2b |
| `groups/route.ts` | `groupFetchAllParticipating()` → `groupMetadata()` |

---

### Phase 4: Update Chatbot (hari 6, paralel)

`lib/chatbot.ts` — adaptasi `sendMessage()` signature. Logika chatbot rule matching **tidak berubah**.

---

### Phase 5: Testing & Fix (hari 7-8)

Skenario test:
1. **QR pairing** — scan QR, verify connected
2. **Session restore** — restart server, verify auto-connect without QR
3. **Send text** — to individual & group
4. **Send media** — image, video, document
5. **Send location**
6. **Receive message** — verify chatbot & webhook trigger
7. **Reconnection** — kill WebSocket, verify auto-reconnect
8. **Scheduled messages** — cron triggers properly
9. **Multi-device** — test multiple devices per user
10. **Long-running** — biarkan 24 jam, cek memory usage

---

### Phase 6: Cleanup (hari 9)

- Hapus `puppeteer` dari `package.json` + lock file
- Hapus `node_modules/.cache/puppeteer` / Chromium (~300MB)
- Hapus folder `wa_sessions/`
- Update `AGENTS.md` — stack: Baileys (bukan wwebjs)
- Update skill docs di `.opencode/skills/whatsapp-integration/SKILL.md`

---

## Risk Areas & Mitigasi

| Risk | Dampak | Mitigasi |
|------|--------|----------|
| **Baileys v7 breaking changes** | API mismatch | Lock ke `@whiskeysockets/baileys@^6.7.0` dulu |
| **Auth state migration** | User harus QR ulang | **Inevitable**. Tidak ada kompatibilitas antar library. Semua user scan QR sekali. Strategi Blue-Green deployment (lihat pertanyaan #5). |
| **JID format berubah** | `@c.us` → `@s.whatsapp.net` | SQL migration di Phase 0 + helper `toJID()` di semua method. Data existing di-REPLACE. |
| **Contacts API** | Baileys tidak punya `getContacts()` built-in | Repository pattern via `contacts.upsert` event → populate `contactsCache` Map (lihat 2b). Fallback: `onWhatsApp()` jika cache kosong. |
| **Log Baileys overflow** | Log server penuh traffic WS buffer | Inject Pino logger dengan level `"silent"` atau `"error"` (lihat 2a). |
| **`messages.update` format ACK** | Nilai status berbeda | Mapping: 1=sent, 2=delivered, 3=read |
| **Logout tak terduga** | WhatsApp bisa logout device | Handle `DisconnectReason.loggedOut` → jangan auto-reconnect, notifikasi user |

---

## Timeline Estimasi

```
Hari 1  → Phase 0: Setup dependencies + Prisma migration
Hari 2  → Phase 1: Custom auth state (Prisma-based SignalKeyStore)
Hari 3-5 → Phase 2: Rewrite lib/whatsapp.ts (core manager)
Hari 6  → Phase 3+4: Update API routes + chatbot
Hari 7-8 → Phase 5: Testing & bug fixing
Hari 9  → Phase 6: Cleanup + deploy
        ──────────────────────
Total: ~8-9 hari kerja (1.5 minggu)
```

---

## Pertanyaan yang Perlu Diputuskan

1. **Versi Baileys** — Lock ke v6.7.x (stable, recommended) atau v7.0.x (latest, ada breaking changes)? Sangat disarankan untuk melakukan lock ke v6.7.x (stable) terlebih dahulu. Upgrade ke v7 dapat dimasukkan ke dalam backlog untuk sprint berikutnya setelah sistem stabil.

2. **Contacts implementation** — Dua opsi:
   - **Opsi A (simpel):** `onWhatsApp()` untuk cek per nomor — lambat tapi tanpa store.
   - **Opsi B (store):** Implementasi in-memory store via event `contacts.upsert` — lebih cepat, kaya fitur.
   - Recommended: Opsi B untuk production, Opsi A untuk MVP.
  
  Terapkan Opsi A (simpel dengan onWhatsApp()) untuk mencapai target MVP (Minimum Viable Product) terlebih dahulu. Langkah ini menghemat waktu pengembangan. Setelah fase pengujian (Fase 5) berhasil dilewati dan arsitektur inti terbukti stabil, arsitektur dapat diiterasi perlahan ke Opsi B (store) untuk optimalisasi performa.

1. **Pairing code support** — Baileys mendukung pairing code (input nomor HP → dapat kode 8 digit, tanpa scan QR). Mau diaktifkan sebagai opsi? Ya, sangat direkomendasikan untuk diaktifkan.

2. **Jadwal eksekusi** — Mau mulai kapan? Ada deadline tertentu? Hari ini

3. **Rollback strategy** — Jika terjadi masalah, `whatsapp-web.js` masih bisa dipasang ulang. Tapi session auth tidak kompatibel — user harus QR ulang. Siap dengan downtime ~30 menit jika rollback? Downtime 30 menit dapat diterima, tetapi masalah utama ada pada keharusan pengguna untuk scan QR ulang akibat ketidakcocokan sesi auth. Untuk memitigasi gesekan dengan user, gunakan pendekatan Blue-Green Deployment. Biarkan service whatsapp-web.js lama (Blue) tetap hidup dan melayani pengguna eksisting, sementara service Baileys (Green) di-deploy secara paralel. Pindahkan sebagian kecil pengguna (beta testing) untuk memindai QR di sistem baru. Jika terjadi kegagalan fatal, pengguna hanya perlu diarahkan kembali ke service lama tanpa mengganggu mayoritas pengguna lainnya.
