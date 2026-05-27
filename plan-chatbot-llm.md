# Rencana: Fitur Chatbot LLM Gratis — WAGateway

> Chatbot pintar yang paham produk bisnis tanpa input manual, belajar otomatis dari
> percakapan WhatsApp sehari-hari, menggunakan Google Gemini API gratis.

---

## 1. Ringkasan

Saat ini chatbot hanya keyword-based (substring matching → template reply).
Target: tambah LLM agar respons natural, kontekstual, dan paham produk bisnis
— tanpa beban input data untuk pemilik UMKM.

**Pendekatan**: Automatic Knowledge Mining + RAG Ringan di atas PostgreSQL.

---

## 2. Provider LLM

**Google Gemini API** (free tier)

| Item | Detail |
|---|---|
| Model | `gemini-2.0-flash` |
| Rate limit | 60 req/menit, 1500 req/hari |
| Biaya | **Rp0** (free tier, tanpa kartu kredit) |
| Infra tambahan | Tidak ada — akses via `fetch()` |
| SDK tambahan | Tidak ada |

---

## 3. Arsitektur

```
Pesan WA masuk
    │
    ▼
┌──────────────────────┐
│  Keyword Rules       │── cocok → balas template (seperti sekarang)
│  (lib/chatbot.ts)    │
└──────┬───────────────┘
       │ tidak cocok
       ▼
┌──────────────────────┐
│  LLMConfig.enabled?  │── tidak → kirim webhook (seperti sekarang)
└──────┬───────────────┘
       │ ya
       ▼
┌──────────────────────────────────────────────┐
│  RAG Ringan — kumpulkan konteks dari DB      │
│                                              │
│  1. BusinessProfile (produk, harga, jam, FAQ)│
│  2. Riwayat chat dengan kontak ini (10 msg)  │
│  3. Product dari tabel Product (jika ada)    │
└──────────┬───────────────────────────────────┘
           ▼
┌──────────────────────┐
│  Gemini API          │
│  systemPrompt        │
│  + businessProfile   │
│  + chatHistory       │
│  + userMessage       │
│  → generate response │
└──────┬───────────────┘
       ▼
┌─────────────────────────────────────┐
│  Simpan ke Conversation history     │
│  Kirim balasan ke WhatsApp          │
│  Background: extract knowledge baru │
└─────────────────────────────────────┘
```

---

## 4. Database — Model Prisma Baru

### 4.1 LLMConfig

Menyimpan konfigurasi LLM per user.

```prisma
model LLMConfig {
  id            String   @id @default(uuid())
  userId        String   @unique
  enabled       Boolean  @default(false)
  provider      String   @default("gemini")
  modelName     String   @default("gemini-2.0-flash")
  systemPrompt  String   @default("Anda adalah asisten customer service yang ramah dan membantu. Jawab pertanyaan pelanggan berdasarkan produk dan informasi bisnis yang tersedia. Jika tidak tahu, katakan tidak tahu.")
  temperature   Float    @default(0.7)
  maxTokens     Int      @default(500)
  geminiApiKey  String?
  contextLength Int      @default(10)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 4.2 BusinessProfile

Hasil ekstraksi otomatis dari chat history. Di-populate oleh background job.

```prisma
model BusinessProfile {
  id        String   @id @default(uuid())
  userId    String   @unique
  data      Json     @default("{}")
  // {
  //   businessName: "Warung Pak Budi",
  //   products: [
  //     { name: "Nasi Goreng", price: 25000, category: "Makanan" },
  //     { name: "Sate Ayam", price: 30000, category: "Makanan" },
  //     { name: "Es Teh", price: 5000, category: "Minuman" }
  //   ],
  //   services: [],
  //   hours: "10:00 - 22:00",
  //   area: ["Cimahi", "Bandung"],
  //   policies: ["Pengiriman minimal 2 porsi"],
  //   faq: [
  //     { question: "ada nasi goreng?", answer: "Ada Rp25.000" }
  //   ]
  // }
  lastScannedAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 4.3 Conversation

Riwayat percakapan per kontak untuk konteks multi-turn.

```prisma
model Conversation {
  id            String   @id @default(uuid())
  userId        String
  contactNumber String
  history       Json     @default("[]")
  // [ { role: "user", content: "..." },
  //   { role: "model", content: "..." }, ... ]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, contactNumber])
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 4.4 Relasi di model User

```prisma
llmConfig      LLMConfig?
businessProfile BusinessProfile?
conversations  Conversation[]
```

---

## 5. File Baru

### 5.1 `lib/llm/types.ts`

Tipe bersama untuk sistem LLM.

```typescript
interface Message {
  role: "user" | "model";
  content: string;
}

interface LLMConfig {
  provider: string;
  modelName: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  geminiApiKey: string;
  contextLength: number;
}

interface BusinessProfileData {
  businessName?: string;
  products?: Array<{ name: string; price?: number; category?: string; description?: string }>;
  services?: string[];
  hours?: string;
  area?: string[];
  policies?: string[];
  faq?: Array<{ question: string; answer: string }>;
}

interface LLMProvider {
  generateResponse(config: LLMConfig, systemPrompt: string, messages: Message[]): Promise<string>;
}
```

### 5.2 `lib/llm/providers/gemini.ts`

Implementasi provider Gemini via REST API `fetch()`.

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}

Body:
{
  "system_instruction": { "parts": [{ "text": systemPrompt }] },
  "contents": messages.map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  })),
  "generationConfig": {
    temperature: config.temperature,
    maxOutputTokens: config.maxTokens
  }
}
```

- Handle rate limit (429) dengan exponential backoff
- Handle error response
- Kembalikan text response

### 5.3 `lib/llm/providers/index.ts`

Factory sederhana:

```typescript
function getLLMProvider(provider: string): LLMProvider {
  switch (provider) {
    case "gemini": return geminiProvider;
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 5.4 `lib/llm/knowledge.ts`

Knowledge mining engine.

**Fungsi**:

| Fungsi | Deskripsi |
|---|---|
| `extractBusinessProfile(userId)` | Ambil N pesan terakhir → kirim ke Gemini → parse structured JSON → simpan ke BusinessProfile |
| `updateBusinessProfile(userId)` | Ambil pesan baru sejak `lastScannedAt` → extract knowledge tambahan → merge ke profile eksisting |
| `buildSystemPrompt(profile)` | Render BusinessProfile ke teks untuk disisipkan ke system prompt |
| `getConversationHistory(userId, contactNumber, limit)` | Ambil N pesan terakhir dari tabel Conversation |
| `appendConversation(userId, contactNumber, userMsg, botMsg)` | Simpan pesan baru ke riwayat |

**Prompt ekstraksi knowledge** (dikirim ke Gemini):

```
Analisis percakapan WhatsApp berikut dan extract informasi bisnis
dalam format JSON:

{ "products": [{ "name", "price", "category", "description" }],
  "services": [...],
  "hours": "...",
  "area": [...],
  "policies": [...],
  "faq": [{ "question", "answer" }] }

Hanya extract informasi yang eksplisit disebutkan. Jangan mengada-ada.
Jika tidak ada data untuk suatu field, omit field tersebut.

Percakapan:
---8<---
{messages}
---8<---

JSON:
```

### 5.5 `lib/llm-chatbot.ts`

Fungsi utama orkestrasi.

```typescript
async function processLLMChatbot(
  userId: string,
  from: string,
  body: string
): Promise<string | null> {
  // 1. Cek LLMConfig
  const config = await getLLMConfig(userId);
  if (!config?.enabled || !config.geminiApiKey) return null;

  // 2. Ambil BusinessProfile
  const profile = await getBusinessProfile(userId);

  // 3. Ambil riwayat chat
  const history = await getConversationHistory(userId, from, config.contextLength);

  // 4. Bangun system prompt
  const systemPrompt = buildSystemPrompt(config, profile);

  // 5. Panggil Gemini
  const provider = getLLMProvider(config.provider);
  const response = await provider.generateResponse(
    config,
    systemPrompt,
    [...history, { role: "user", content: body }]
  );

  // 6. Simpan ke riwayat
  await appendConversation(userId, from, body, response);

  return response;
}
```

---

## 6. File Diubah

### 6.1 `prisma/schema.prisma`

- Tambah model `LLMConfig`, `BusinessProfile`, `Conversation`
- Tambah relasi di model `User`

### 6.2 `lib/whatsapp.ts` (handler `message` event)

Perubahan di baris 148-152 (blok setelah `processChatbot`):

```
// Existing:
const reply = await processChatbot(userId, from, body).catch(() => null);
if (reply) { sendMessage; return; }

// Baru: tambah fallback ke LLM
const reply = await processChatbot(userId, from, body).catch(() => null);
if (reply) { sendMessage; return; }

// ———— NEW ————
const llmReply = await processLLMChatbot(userId, from, body).catch(() => null);
if (llmReply) { sendMessage; return; }
// ——————————————
```

### 6.3 `app/api/chatbot/llm/route.ts`

API route baru:

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/api/chatbot/llm` | Ambil LLMConfig + BusinessProfile |
| `PUT` | `/api/chatbot/llm` | Update LLMConfig |
| `POST` | `/api/chatbot/llm/extract` | Trigger knowledge extraction manual |
| `DELETE` | `/api/chatbot/llm` | Nonaktifkan/reset |

### 6.4 `app/dashboard/chatbot/page.tsx`

Tambah tab "AI Chatbot" dengan form:

| Field | Tipe | Default |
|---|---|---|
| Aktifkan AI | Toggle | Off |
| Gemini API Key | Password input | — |
| Nama Bisnis | Text | — |
| System Prompt | Textarea | Default |
| Model | Select | gemini-2.0-flash |
| Temperature | Range 0-1 | 0.7 |
| Max Tokens | Number | 500 |
| Ekstrak Pengetahuan | Button | "Scan Chat History" |

**Tampilan untuk non-teknis**:
- Setelah aktivasi, tampilkan status: "AI sedang mempelajari bisnis Anda..."
- Progress bar extraction
- Setelah selesai: "AI sudah mengenali X produk, Y jam operasional"
- Tombol "Pelajari ulang dari chat terbaru"

---

## 7. Alur Knowledge Mining (Zero Input)

### Cold Start (saat LLM pertama diaktifkan)

```
1. User mengaktifkan AI & masukkan API key
2. System ambil 500 pesan terakhir dari WhatsAppMessage
3. Kirim ke Gemini dengan prompt extraction
4. Parse JSON → simpan ke BusinessProfile
5. Tampilkan ke user: "Ditemukan 12 produk, jam buka 10:00-22:00"
```

### Per Pesan (real-time)

```
1. Pesan masuk
2. Keyword rules dicek (existing)
3. Jika tidak cocok:
   a. Ambil BusinessProfile
   b. Ambil 10 pesan terakhir dengan kontak ini
   c. Kirim ke Gemini: systemPrompt + profile + history + pesan
   d. Dapat response → kirim ke WA
   e. Simpan ke Conversation
```

### Continuous Learning (background)

```
Setiap 6 jam (via cron / API trigger):
1. Ambil pesan baru sejak lastScannedAt
2. Jika ada >= 10 pesan baru:
   a. Kirim ke Gemini untuk extraction incremental
   b. Merge hasil ke BusinessProfile
   c. Update lastScannedAt
```

### Koreksi dari Owner

```
Owner WA: "Maaf, harga bakso jadi Rp15.000 ya"

1. Sistem catat sebagai pesan dari owner
2. Saat extraction berikutnya:
   - Gemini detect koreksi harga
   - Update businessProfile.products
   - Next query: harga sudah benar
```

---

## 8. Gemini API — Detail Teknis

### Generate Response

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
?key=${GEMINI_API_KEY}
```

```json
{
  "system_instruction": {
    "parts": [{
      "text": "Anda asisten UMKM bernama ... Berikut data bisnis:\n\nPRODUK:\n- Nasi Goreng Rp25.000\n- Sate Ayam Rp30.000\n\nJAM: 10:00-22:00\n\nAREA: Cimahi\n\nGunakan data ini untuk jawab pelanggan. Jika tidak tahu, katakan tidak tahu."
    }]
  },
  "contents": [
    { "role": "user", "parts": [{ "text": "Halo" }] },
    { "role": "model", "parts": [{ "text": "Halo! Ada yang bisa dibantu?" }] },
    { "role": "user", "parts": [{ "text": "Nasi goreng berapa?" }] }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 500,
    "topP": 0.9,
    "topK": 40
  }
}
```

### Extract Knowledge

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
?key=${GEMINI_API_KEY}
```

```json
{
  "contents": [{
    "role": "user",
    "parts": [{
      "text": "Ekstrak informasi bisnis dari chat berikut...\n\n---CHAT---\n{...}\n\n---\n\nOutput JSON..."
    }]
  }],
  "generationConfig": {
    "temperature": 0.2,
    "maxOutputTokens": 2000
  }
}
```

### Error Handling

| HTTP Status | Penyebab | Handling |
|---|---|---|
| 200 OK | Sukses | Parse response |
| 400 | Bad request | Log, return null |
| 429 | Rate limit | Exponential backoff (1s, 2s, 4s, max 3 retry) |
| 5xx | Server error | Retry sekali, fallback null |

---

## 9. Daftar File yang Akan Dibuat/Diuabah

### Baru (5 file)

```
lib/llm/types.ts              ~ 30 baris
lib/llm/providers/gemini.ts   ~ 60 baris
lib/llm/providers/index.ts    ~ 15 baris
lib/llm/knowledge.ts          ~ 100 baris
lib/llm-chatbot.ts            ~ 60 baris
```

### Diubah (4 file)

```
prisma/schema.prisma          + 3 model + relasi
lib/whatsapp.ts               ~ +10 baris
app/api/chatbot/llm/route.ts  ~ 80 baris
app/dashboard/chatbot/page.tsx ~ +100 baris
```

### Infra tambahan

```
Tidak ada — semua via cloud API
```

---

## 10. UX untuk Pemilik UMKM (Non-Teknis)

### Hari 1: Aktivasi (1 menit)

1. Login ke dashboard WAGateway
2. Buka menu **Chatbot**
3. Pilih tab **AI Chatbot**
4. Geser toggle **Aktifkan AI** ke ON
5. Masukkan **Gemini API Key** (dapat dari Google AI Studio — gratis)
6. Klik **Simpan**
7. Selesai. AI mulai belajar dari chat history.

### Sehari-hari

- Cukup WA-an seperti biasa dengan pelanggan
- AI otomatis merespon di luar jam kerja
- AI belajar produk, harga, jam buka dari chat

### Kalau Ada Koreksi

- Cukup WA: "Maaf, harga bakso jadi Rp15.000"
- AI serap otomatis saat extraction berikutnya

### Yang TIDAK Perlu Dilakukan

- Input daftar produk
- Update harga di dashboard
- Setup kategori
- Tulis FAQ
- Maintenance
- Belajar teknologi

---

## 11. Estimasi Pengerjaan

| Step | File | Estimasi |
|---|---|---|
| 1 | Prisma schema + migration | 15 menit |
| 2 | `lib/llm/types.ts` | 5 menit |
| 3 | `lib/llm/providers/gemini.ts` | 20 menit |
| 4 | `lib/llm/providers/index.ts` | 5 menit |
| 5 | `lib/llm/knowledge.ts` | 30 menit |
| 6 | `lib/llm-chatbot.ts` | 20 menit |
| 7 | `lib/whatsapp.ts` — integrasi | 10 menit |
| 8 | API route `app/api/chatbot/llm/route.ts` | 20 menit |
| 9 | Dashboard UI — AI Settings | 30 menit |
| **Total** | | **~2,5 jam** |

---

## 12. Glossary

| Istilah | Arti |
|---|---|
| **RAG** | Retrieval-Augmented Generation — ambil data relevan dari DB, kasih ke LLM sebagai konteks |
| **Gemini** | LLM gratis dari Google |
| **API Key** | Kode unik untuk akses Gemini (dapat gratis) |
| **Knowledge Mining** | Proses ekstrak informasi bisnis dari chat history |
| **Business Profile** | Data produk, harga, jam, dll hasil ekstraksi |
| **Conversation History** | Riwayat chat per pelanggan untuk konteks |
| **System Prompt** | Instruksi awal untuk mengatur perilaku AI |
| **Cold Start** | Fase awal saat AI baru aktif dan belum punya pengetahuan |
| **Continuous Learning** | AI terus belajar dari percakapan baru |
