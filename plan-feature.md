# WAGateway — Rencana Fitur Baru

## Status Fitur Saat Ini

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Send Messages Repeatedly (periodik) | ❌ **Belum Ada** | Bukan broadcast. Kirim ulang per periode (jam/hari/minggu) |
| Auto Reply (1x/hari) | ❌ **Belum Ada** | Bukan keyword chatbot. Balas 1x/hari pesan pertama masuk dengan pesan tetap |
| Custom Watermark Messages | ❌ Belum Ada | — |
| Send to WhatsApp Group | ❌ Belum Ada | Model `Group` saat ini adalah contact group, bukan WA group |
| CSV Import Contact | ❌ Belum Ada | Export CSV sudah ada, import file belum |
| Location Messages | ❌ Belum Ada | `sendMessage()` hanya support text & media |
| Multi Devices | ❌ Belum Ada | `WhatsAppSession` punya `@unique userId`, hanya 1 device per user |

---

## Phase 1 — Core Expansion

### 1.1 Multi Devices

**Masalah:** `WhatsAppSession` punya `@unique` pada `userId`, jadi hanya 1 device per user. `WhatsAppManager` key hanya `userId`.

**Perubahan Prisma:**
- Tambah field `deviceId` di `WhatsAppSession`
- Hapus `@unique` dari `userId`
- Tambah `@@unique([userId, deviceId])`
- Tambah field `name` untuk label device (misal "Nomor Marketing", "Nomor CS")

```prisma
model WhatsAppSession {
  id         String   @id @default(uuid())
  userId     String
  deviceId   String   @default("main")
  name       String   @default("Main Device")
  status     String   @default("disconnected")
  phone      String?
  qrCode     String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, deviceId])
}
```

**Perubahan `lib/whatsapp.ts`:**
- Key `Map<string, Client>` diubah dari `userId` menjadi `userId_deviceId`
- Semua method (`startConnect`, `sendMessage`, `getStatus`, `disconnect`, `getQR`, `getContacts`) terima parameter `deviceId`
- `ensureInitialized()` reconnect semua device per user

**API Routes:**
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `GET` | `/api/whatsapp/devices` | List semua device user |
| `POST` | `/api/whatsapp/devices` | Tambah device baru |
| `POST` | `/api/whatsapp/connect?deviceId=xxx` | Connect specific device |
| `GET` | `/api/whatsapp/status?deviceId=xxx` | Status per device |
| `GET` | `/api/whatsapp/qrcode?deviceId=xxx` | QR per device |
| `POST` | `/api/whatsapp/disconnect?deviceId=xxx` | Disconnect per device |
| `DELETE` | `/api/whatsapp/devices?deviceId=xxx` | Hapus device |

**UI (`/dashboard/device`):**
- List semua device dengan status masing-masing
- Tombol "Add Device" → muncul QR baru
- Per-device: disconnect, delete, rename
- Status indicator per device

**Estimasi:** 6-8 jam

---

### 1.2 Send to WhatsApp Group

**Masalah:** Tidak ada cara mengirim pesan ke WhatsApp group. `sendMessage()` hanya format `...@c.us` (individual). Tidak ada UI untuk milih group WA.

**Perubahan `lib/whatsapp.ts`:**
- `sendMessage()` — sudah support chatId dengan `@`, jadi `...@g.us` akan otomatis terdeteksi
- Tambah method `getGroups(userId, deviceId?)` — fetch joined groups dari WA client

**API Routes:**
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `GET` | `/api/whatsapp/groups?deviceId=xxx` | Fetch WA groups yg diikuti |

**UI:**
- **Send Message**: tambah tab/picker "Send to Group" — dropdown pilih group, isi pesan, kirim
- **Broadcast**: bisa tambah group sebagai recipient (kirim ke semua member group, atau kirim ke group itu sendiri)

**Alur:**
1. Fetch groups dari WhatsApp via `client.getChats()` → filter yg `isGroup`
2. Tampilkan di UI dengan nama group + jumlah member
3. Saat kirim, format `groupId` jadi `{group_id}@g.us`

**Estimasi:** 3-4 jam

---

### 1.3 CSV Import for Contacts

**Masalah:** Import kontak hanya bisa via (1) form manual, (2) bulk JSON API, (3) dari kontak WhatsApp. Tidak ada upload file CSV.

**API Routes:**
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `POST` | `/api/contacts/import/csv` | Upload CSV, parse, bulk insert |

**Alur:**
1. User upload file `.csv`
2. Backend parse CSV — column detection otomatis (name, phone, nama, nomor, dll) atau mapping manual
3. Validasi nomor HP
4. Skip duplikat (berdasarkan phone)
5. Return summary: imported, skipped, failed

**UI (`/dashboard/contacts`):**
- Tombol "Import CSV" di samping tombol Import yang sudah ada
- Modal upload: drag & drop atau pilih file
- Preview table: tampilkan 5 baris pertama, kolom detected
- Mapping kolom: dropdown pilih kolom mana → name, phone (jika auto-detect gagal)
- Tombol "Import" → progress + result summary

**Technical:**
- Backend parsing tanpa lib tambahan (CSV sederhana, split `\n` + `,`)

**Estimasi:** 3-4 jam

---

### 1.4 Location Messages

**Masalah:** Tidak bisa kirim pesan lokasi. `sendMessage()` hanya support text + media.

**Perubahan `lib/whatsapp.ts`:**
- Import `Location` dari `whatsapp-web.js`
- `sendMessage()` — terima parameter opsional `location: { latitude, longitude, title? }`
- Jika location ada → kirim `client.sendMessage(chatId, new Location(latitude, longitude))`
- Jika location + body → kirim text dulu baru location

```typescript
import { Location } from "whatsapp-web.js";

// Dalam sendMessage():
if (location) {
  await client.sendMessage(chatId, new Location(location.latitude, location.longitude));
}
if (body) {
  await client.sendMessage(chatId, body);
}
```

**API Routes:**
- `POST /api/messages` — tambah field opsional `location: { latitude, longitude }`
- `POST /api/broadcast` — tambah field `location` di tiap message

**UI (`/dashboard/send`):**
- Toggle "Send Location" di samping upload media
- Input: latitude, longitude (text field)
- (Map picker menyusul di Phase 3)

**Estimasi:** 2-3 jam

---

### 1.5 Auto Reply (1x/hari, Pesan Tetap)

**Masalah:** Tidak ada mekanisme balas otomatis untuk pesan pertama setiap hari. Chatbot yang ada bersifat keyword-based, tidak cocok untuk use case "balas 1x/hari dengan pesan tetap".

**Cara kerja:**
- User set satu pesan tetap di Settings (misal: "Halo, terima kasih sudah menghubungi. Kami akan segera merespon.")
- Fitur aktif/nonaktif via toggle
- Saat ada pesan masuk, sistem cek: apakah sudah pernah reply ke kontak `from` hari ini?
  - Jika **belum**: kirim pesan auto-reply, catat timestamp
  - Jika **sudah**: lewati (tidak double-reply)

**Perubahan Prisma:**
- Tambah field di `Settings` model:
  ```prisma
  autoReplyText   String?  // pesan tetap
  autoReplyActive Boolean  @default(false)
  ```
- Tabel baru `AutoReplyLog` untuk tracking riwayat balasan per kontak:
  ```prisma
  model AutoReplyLog {
    id        String   @id @default(uuid())
    userId    String
    contact   String   // nomor pengirim (from)
    repliedAt DateTime @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId, contact])
  }
  ```

**Perubahan `lib/chatbot.ts`:**
- `processAutoReply(userId, from)` — fungsi baru, dipanggil dari event `message`
- Cek `autoReplyActive` dan `autoReplyText` dari Settings
- Cek `AutoReplyLog` apakah sudah ada reply hari ini (repliedAt >= startOfDay)
- Jika belum → kirim pesan → simpan log
- Jika sudah → skip

**Alur di `lib/whatsapp.ts` event `message`:**
```
1. Simpan pesan ke WhatsAppMessage (inbound)
2. processAutoReply(userId, from) → jika perlu, kirim balasan
3. processChatbot(userId, from, body) → jika tidak di-reply auto, cek keyword rule
4. deliverWebhook(userId, "message.received", ...)
```

**UI (`/dashboard/settings`):**
- Section "Auto Reply (1x/hari)"
- Toggle aktif/nonaktif
- Textarea untuk pesan tetap
- Info: "Pesan ini akan dikirim 1x/hari sebagai balasan pertama ke setiap kontak"

**Estimasi:** 2-3 jam

---

## Phase 2 — Advanced Features

### 2.1 Send Messages Repeatedly (Recurring Schedule)

**Masalah:** Pesan terjadwal (`ScheduledMessage`) yang ada hanya sekali kirim (one-time). Tidak bisa menjadwalkan pesan berulang setiap jam/hari/minggu.

**Cara kerja:**
- User buat jadwal periodik: pilih pesan, pilih kontak/group, pilih periode
- Sistem kirim pesan otomatis setiap periode
- Setelah kirim, sistem reschedule untuk periode berikutnya

**Perubahan Prisma:**
- Tambah field di `ScheduledMessage`:
  ```prisma
  model ScheduledMessage {
    // ... existing fields ...
    isRecurring  Boolean  @default(false)
    recurrence   String?  // "hourly" | "daily" | "weekly" | "monthly" | "custom"
    cronExpr     String?  // cron expression jika custom
    interval     Int?     // setiap X jam/hari/minggu (default 1)
    nextRunAt    DateTime? // next scheduled execution
    endDate      DateTime? // optional: berhenti di tanggal tertentu
    maxRepeats   Int?     // optional: max jumlah pengulangan
    repeatCount  Int      @default(0) // sudah berapa kali dikirim
  }
  ```

**Perubahan `app/api/cron/process-scheduled/route.ts`:**
- Setelah $sendMessage untuk recurring:
  - Hitung `nextRunAt` berdasarkan `recurrence` + `interval`
  - Update `repeatCount`, `nextRunAt`, `status` tetap "pending"
  - Jika `maxRepeats` tercapai → ubah status jadi "completed"
  - Jika `endDate` terlampaui → ubah status jadi "completed"

**UI (`/dashboard/scheduled` & `/dashboard/broadcast`):**
- Toggle "Repeat" di form schedule
- Pilihan: hourly, daily, weekly, monthly, custom cron
- Input: interval (setiap X...), max repeats / end date (opsional)
- Di daftar scheduled: badge "Recurring" + next run time
- Tombol "Stop Recurring" untuk menghentikan pengulangan

**Estimasi:** 5-7 jam

---

### 2.2 Custom Watermark Messages

**Masalah:** Tidak ada branding otomatis di setiap pesan yang dikirim.

**Cara kerja:**
- User set teks watermark di Settings (misal: "Dikirim via WAGateway" atau "{{business_name}}")
- Watermark otomatis ditambahkan sebagai footer di setiap pesan (text) atau overlay di media (gambar)
- Bisa diaktifkan/nonaktifkan per user

**Perubahan Prisma:**
- Tambah field di `Settings` model:
  ```prisma
  watermarkText   String?  // teks watermark, support {{var}}
  watermarkActive Boolean  @default(false)
  ```

**Perubahan `lib/whatsapp.ts`:**
- `sendMessage()` — sebelum kirim, cek settings user untuk watermark
- Interpolasi template variable ({{business_name}}, dll)
- Untuk text: append `\n\n---\n{watermark}` di body
- Untuk media: gunakan `sharp` atau canvas untuk overlay teks di gambar

**UI (`/dashboard/settings`):**
- Section "Watermark"
- Toggle aktif/nonaktif
- Input teks watermark
- Preview contoh hasil watermark

**Estimasi:** 4-5 jam

---

## Phase 3 — Polish

### 3.1 Location Map Picker

**Masalah:** Input latitude/longitude manual tidak user-friendly.

**UI:**
- Integrasi Leaflet (open-source, no API key) atau Mapbox
- Picker map: klik/tap lokasi → auto-fill latitude & longitude
- Reverse geocode (opsional): tampilkan alamat dari koordinat

**Perubahan:**
- `app/dashboard/send/page.tsx` — tambah map picker component
- `app/dashboard/broadcast/page.tsx` — tambah map picker

**Estimasi:** 3-4 jam

---

### 3.2 Watermark Template Variables

**Masalah:** Watermark teks statis kurang fleksibel.

**Fitur:**
- Support `{{business_name}}`, `{{user_name}}`, `{{phone}}` di watermark
- Interpolasi dari data user dan settings
- Preview real-time di halaman Settings

**Estimasi:** 1 jam

---

## Ringkasan Estimasi Total

| Phase | # | Fitur | Jam |
|-------|---|-------|-----|
| **1** | 1.1 | Multi Devices | 6-8 |
| **1** | 1.2 | Send to WhatsApp Group | 3-4 |
| **1** | 1.3 | CSV Import | 3-4 |
| **1** | 1.4 | Location Messages | 2-3 |
| **1** | 1.5 | Auto Reply (1x/hari) | 2-3 |
| **2** | 2.1 | Send Messages Repeatedly | 5-7 |
| **2** | 2.2 | Custom Watermark | 4-5 |
| **3** | 3.1 | Location Map Picker | 3-4 |
| **3** | 3.2 | Watermark Template | 1 |
| | | **Total** | **35-48 jam** |

## Catatan Teknis

### Prisma Migration Strategy
- Setiap perubahan schema harus diikuti `npx prisma migrate dev --name <nama_migration>`
- Karena `WhatsAppSession.userId` kehilangan `@unique`, pastikan tidak ada duplikat sebelum migrasi
- Semua migration harus `npx prisma generate` sebelum build

### WhatsApp Group vs Contact Group
- Jangan bingung: model `Group` yang ada adalah **contact group** (grup kontak internal). Fitur baru ini adalah **WhatsApp Group** (grup chat WA beneran).
- Untuk menghindari confusion, nama endpoint: `/api/whatsapp/groups` (bukan `/api/groups`)
- Di UI, beri label jelas: "WhatsApp Groups" vs "Contact Groups"

### Multi Device & Existing Messages
- `WhatsAppMessage` perlu tambahan `deviceId` agar pesan bisa dilacak per device
- Tambah field `deviceId` di `WhatsAppMessage` dengan default "main" (backward compatible)

### Auto Reply & Chatbot Coexistence
- Urutan di event `message`: Auto Reply (1x/hari) → Chatbot (keyword) → Webhook
- Auto Reply cek `AutoReplyLog` untuk hari ini per kontak
- Jika Auto Reply mengirim balasan, Chatbot tetap bisa memproses (tidak saling blokir)
- Jika Auto Reply tidak aktif, lanjut ke Chatbot seperti biasa

### Recurring Schedule Logic
- `nextRunAt` dihitung dari `scheduledAt` asli + (`interval` × unit)
- Contoh: `daily` dengan `interval=2` → kirim setiap 2 hari
- Cron expression untuk fleksibilitas maksimum (misal: setiap Senin & Kamis jam 9 pagi)
- Pastikan tidak ada overlap atau double-send dengan guard `status != "processing"`

### Keamanan
- Multi device: pastikan session isolation antar device
- File upload: validasi tipe file, size limit (max 5MB untuk CSV)
- Rate limit: import kontak dibatasi 1000 per batch untuk menghindari abuse
- Auto Reply: batasi maksimal 1 pesan per kontak per hari (guard di `AutoReplyLog`)
