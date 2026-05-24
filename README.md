# WhatsApp Gateway Service

Self-hosted WhatsApp Gateway menggunakan Bun + TypeScript + whatsapp-web.js. Service ini dirancang untuk mengirim notifikasi WhatsApp ke pelanggan, terintegrasi dengan Laravel atau aplikasi lainnya.

## Table of Contents

- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Konfigurasi](#konfigurasi)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

---

## Fitur

### Current
- **Multi-Session** - Multiple WhatsApp account dalam satu instance
- **Send Text Messages** - Kirim pesan teks ke nomor WhatsApp
- **Send Media** - Kirim image, document, audio, video via base64
- **Receive Messages** - Terima pesan masuk real-time
- **Webhook System** - Forward pesan masuk ke URL eksternal
- **WhatsApp Client Management** - Session persistence dengan LocalAuth
- **Secure API** - API key + JWT authentication
- **Rate Limiting** - Mencegah abuse dengan in-memory rate limiter
- **Structured Logging** - Pino logger untuk development dan production
- **Graceful Shutdown** - Handle SIGTERM/SIGINT dengan benar
- **Health Monitoring** - Endpoint health check dengan memory usage info
- **Docker Support** - Build dan run dengan Docker/Compose

### Roadmap

#### 🔴 Critical — MVP Enhancement
| Fitur | Status |
|-------|--------|
| Webhook inbound | ✅ Done |
| Send media | ✅ Done |
| Multi-session | ✅ Done |
| Receive messages | ✅ Done |

#### 🟡 Important — Production Ready
| Fitur | Status |
|-------|--------|
| Groups API | ⏳ Planned |
| Message status tracking | ⏳ Planned |
| Contact validation | ⏳ Planned |
| Pairing code | ⏳ Planned |
| Swagger/OpenAPI docs | ⏳ Planned |
| Docker production | ⏳ Planned |

#### 🔵 Nice to Have
| Fitur | Status |
|-------|--------|
| Web Dashboard | ⏳ Planned |
| Bulk/blast messaging | ⏳ Planned |
| Message templates | ⏳ Planned |
| Chatbot / AI auto-reply | ⏳ Planned |
| Typing indicator | ⏳ Planned |
| Presence management | ⏳ Planned |
| Audit logging | ⏳ Planned |

---

## Market Research & Feature Roadmap

Hasil riset kompetitor WhatsApp Gateway self-hosted open source dan layanan komersial.

### Kompetitor

| Produk | ⭐ GitHub | Stack Utama | Lisensi |
|--------|-----------|-------------|---------|
| **Evolution API** | 8.4k | Node.js + Baileys | Apache 2.0 |
| **WAHA (WhatsApp HTTP API)** | 2.7k | Multi-engine (WEBJS/NOWEB/GOWS) | Proprietary |
| **open-wa/wa-automate** | 4k+ | Node.js + Puppeteer | AGPL-3.0 |
| **OpenWA** | 694 | NestJS + PostgreSQL/Redis | MIT |
| **MultiWA** | 22 | NestJS + whatsapp-web.js/Baileys | Open Source |
| **WWebJS REST API** | Popular | Node.js + whatsapp-web.js | Open Source |

**Layanan Komersial:** Twilio, MessageBird, WATI, 360dialog, Respond.io, Gupshup

### Feature Roadmap

#### 🔴 Critical — MVP Enhancement
| Fitur | Deskripsi |
|-------|-----------|
| **Webhook inbound** | Terima pesan masuk real-time, kirim ke URL yang dikonfigurasi |
| **Send media** | Dukung image, document, audio, video via API |
| **Multi-session** | Multiple WhatsApp account dalam satu instance |
| **Receive messages** | Simpan/broadcast pesan masuk |

#### 🟡 Important — Production Ready
| Fitur | Deskripsi |
|-------|-----------|
| **Groups API** | Manage grup: create, invite, remove, send message |
| **Message status tracking** | Track sent/delivered/read receipts via webhook |
| **Contact validation** | Cek nomor terdaftar (`isOnWhatsApp`) |
| **Pairing code** | Alternatif autentikasi selain QR code |
| **Swagger/OpenAPI docs** | Dokumentasi API otomatis untuk integrator |
| **Docker production** | docker-compose production-ready |

#### 🔵 Nice to Have
| Fitur | Deskripsi |
|-------|-----------|
| Web Dashboard | UI untuk manage sessions, logs, test send |
| Bulk/blast messaging | Kirim ke banyak nomor dalam satu request |
| Message templates | Template pesan reusable |
| Chatbot / AI auto-reply | Integrasi OpenAI / Google AI |
| Typing indicator | Kirim typing... sebelum reply |
| Presence management | Set online/offline status |
| Channels / Newsletter | Support WhatsApp Channels |
| Polls, Sticker, Location | Fitur tambahan WhatsApp |
| S3/MinIO storage | Simpan media di cloud storage |
| Proxy per session | Proxy berbeda tiap session |
| Audit logging | Log semua aktivitas API |

---

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Bun | ^1.1.0 |
| Language | TypeScript | ^5.7.0 |
| WhatsApp | whatsapp-web.js | ^1.26.0 |
| Validation | Zod | ^3.24.0 |
| Logging | Pino | ^9.0.0 |
| QR Code | qrcode | ^1.5.4 |
| Process Manager | PM2 | Latest |

---

## Quick Start

### 1. Clone & Install

```bash
bun install
```

### 2. Setup Environment

```bash
# Copy .env.example ke .env
cp .env.example .env

# Generate secure API secret
openssl rand -base64 32
```

Edit file `.env` dan paste API_SECRET yang sudah digenerate.

### 3. Jalankan Service

```bash
# Development
bun run src/index.ts
```

### 4. Scan QR Code

Buka browser dan akses:
```
http://localhost:3001/qr
```

Dengan header `X-API-Key` sesuai yang diset di `.env`.

Scan QR code tersebut dengan aplikasi WhatsApp di HP.

### 5. Test Kirim Pesan

```bash
curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-secret-key" \
  -d '{"phone":"6281234567890","message":"Hello from WhatsApp Gateway!"}'
```

---

## Konfigurasi

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Port untuk HTTP server |
| `NODE_ENV` | development | environment: development/production |
| `LOG_LEVEL` | info | log level: debug/info/warn/error |
| `API_SECRET` | - | **WAJIB** - API key (min 32 chars) |
| `RATE_LIMIT_MAX` | 100 | Max requests per window |
| `RATE_LIMIT_WINDOW` | 60000 | Rate limit window in ms |
| `SESSION_PATH` | ./data/.session | Path untuk session storage |

### Contoh .env

```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
API_SECRET=your-very-secure-api-key-minimum-32-characters
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
SESSION_PATH=./data/.session
```

---

## API Reference

### Authentication

Semua endpoint **kecuali** `/health` wym menggunakan header `X-API-Key`:

```
X-API-Key: your-api-secret-key
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Health check |
| POST | `/auth/register` | ❌ | Register user |
| POST | `/auth/login` | ❌ | Login user |
| GET | `/status` | ✅ | Connection status (default session) |
| GET | `/status?sessionId=X` | ✅ | Connection status (specific session) |
| GET | `/qr` | ✅ | QR code (default session) |
| GET | `/qr?sessionId=X` | ✅ | QR code (specific session) |
| GET | `/sessions` | ✅ | List all sessions |
| POST | `/sessions` | ✅ | Create new session |
| DELETE | `/sessions/:id` | ✅ | Delete session |
| GET | `/sessions/:id/status` | ✅ | Session connection status |
| GET | `/sessions/:id/qr` | ✅ | Session QR code |
| POST | `/sessions/:id/restart` | ✅ | Restart session |
| POST | `/sessions/:id/logout` | ✅ | Logout session |
| POST | `/send` | ✅ | Send text message |
| POST | `/send-media` | ✅ | Send media message |
| POST | `/webhook` | ✅ | Set webhook config |
| GET | `/webhook?sessionId=X` | ✅ | Get webhook config |
| DELETE | `/webhook` | ✅ | Remove webhook |
| POST | `/restart` | ✅ | Restart (default session) |
| POST | `/logout` | ✅ | Logout (default session) |
| POST | `/api-keys` | ✅ | Create API key |
| GET | `/api-keys` | ✅ | List API keys |
| POST | `/api-keys/revoke` | ✅ | Revoke API key |

---

#### GET /health
Health check tanpa authentication.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-17T10:00:00Z",
  "uptime": 3600,
  "environment": "development",
  "whatsapp": {
    "ready": true,
    "sessionExists": true
  },
  "memory": {
    "rss": 150000000,
    "heapTotal": 80000000
  }
}
```

#### GET /status
Mendapatkan status koneksi WhatsApp. Gunakan `?sessionId=X` untuk session tertentu.

**Response:**
```json
{
  "sessionId": "default",
  "ready": true,
  "qr": false,
  "sessionExists": true,
  "memoryUsage": {
    "rss": 150000000,
    "heapTotal": 80000000
  }
}
```

#### GET /qr
Mendapatkan QR code dalam format base64. Gunakan `?sessionId=X` untuk session tertentu.

**Response:**
```json
{
  "success": true,
  "ready": false,
  "sessionId": "default",
  "qr": "data:image/png;base64,..."
}
```

#### POST /send
Mengirim pesan WhatsApp. Gunakan `sessionId` opsional untuk multi-session.

**Request:**
```json
{
  "phone": "6281234567890",
  "message": "Hello world!",
  "sessionId": "default"
}
```

**Response (Success):**
```json
{
  "success": true,
  "messageId": "message_id_here"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "WhatsApp client is not ready"
}
```

#### POST /send-media
Mengirim media (image, document, audio, video) via base64.

**Request:**
```json
{
  "phone": "6281234567890",
  "message": "Caption here",
  "media": {
    "mimetype": "image/png",
    "data": "base64_encoded_data",
    "filename": "image.png"
  },
  "sessionId": "default"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "message_id_here"
}
```

#### POST /webhook
Konfigurasi webhook untuk menerima pesan masuk.

**Request:**
```json
{
  "sessionId": "default",
  "url": "https://example.com/webhook",
  "events": ["message"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook configured",
  "webhook": {
    "sessionId": "default",
    "url": "https://example.com/webhook",
    "events": ["message"]
  }
}
```

**Webhook Payload (dikirim ke URL):**
```json
{
  "event": "message",
  "sessionId": "default",
  "data": {
    "messageId": "true_123...",
    "from": "6281234567890@c.us",
    "body": "Halo!",
    "timestamp": 1712345678,
    "type": "chat",
    "isMedia": false
  },
  "timestamp": "2026-05-17T10:00:00Z"
}
```

#### POST /restart
Merestart WhatsApp client (default session).

**Response:**
```json
{
  "success": true,
  "message": "Restart initiated"
}
```

#### POST /logout
Logout dan hapus session (default session).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /sessions
Mendapatkan daftar semua session.

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "default",
      "name": "Default Session",
      "status": "ready",
      "ready": true,
      "sessionExists": true,
      "hasQr": false,
      "hasWebhook": true,
      "webhookUrl": "https://example.com/webhook"
    }
  ]
}
```

#### POST /sessions
Membuat session baru.

**Request:**
```json
{
  "id": "cs-1",
  "name": "Customer Service 1"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "cs-1",
    "name": "Customer Service 1",
    "status": "qr",
    "ready": false,
    "createdAt": "2026-05-17T10:00:00Z"
  }
}
```

---

## Deployment

### Local Development

```bash
# Dengan hot reload
bun run --watch src/index.ts
```

### Production dengan PM2

```bash
# Install PM2 globally jika belum
npm install -g pm2

# Start service
pm2 start src/index.ts --name whatsapp-gateway

# View logs
pm2 logs whatsapp-gateway

# Restart
pm2 restart whatsapp-gateway

# Stop
pm2 stop whatsapp-gateway
```

### Docker

#### Build Image

```bash
docker build -t whatsapp-gateway .
```

#### Run Container

```bash
docker run -d -p 3001:3001 \
  --name whatsapp-gateway \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  whatsapp-gateway
```

#### Docker Compose

```bash
# Build dan start
docker-compose up -d

# View logs
docker-compose logs -f whatsapp-gateway

# Stop dan remove
docker-compose down
```

---

## Troubleshooting

### 1. Error: "API_SECRET minimal 32 karakter"

Solution: Generate API secret baru dengan:
```bash
openssl rand -base64 32
```

### 2. WhatsApp client not ready

- Cek status: `GET /status`
- Jika ada QR: akses `GET /qr` untuk dapat QR code
- Scan QR dengan HP

### 3. Session Expired

```bash
# Hapus session
rm -rf data/.session/

# Restart service
pm2 restart whatsapp-gateway

# Scan QR baru
```

### 4. Memory Usage Tinggi

Puppeteer membutuhkan memory besar. Monitor dengan:
```bash
curl http://localhost:3001/health
```

 Jika memory terlalu tinggi, restart service secara berkala.

### 5. Rate Limit Exceeded

Kurangi request rate atau naikkan `RATE_LIMIT_MAX` di `.env`.

---

## Security

### Checklist untuk Production

- [ ] Set `API_SECRET` minimal 32 karakter
- [ ] Gunakan HTTPS (reverse proxy seperti Nginx/Caddy)
- [ ] Batasi akses dengan firewall/VPN
- [ ] Monitor logs untuk aktivitas mencurigakan
- [ ] Update dependencies secara berkala
- [ ] Regular session cleanup

### Cara Aman Akses dari Laravel

```php
$response = Http::withHeaders([
    'X-API-Key' => config('services.whatsapp.api_secret'),
])->post('http://whatsapp-gateway:3001/send', [
    'phone' => '6281234567890',
    'message' => 'Pesanan Anda telah dikonfirmasi!',
]);
```

---

## Project Structure

```
wawawa/
├── src/
│   ├── index.ts                    # Entry point + Bun server
│   ├── app/
│   │   ├── router.ts               # HTTP routing + path matching
│   │   └── middleware/
│   │       ├── auth.ts             # API key + JWT validation
│   │       ├── validation.ts       # JSON body parser
│   │       └── rate-limit.ts       # Rate limiting
│   ├── lib/
│   │   ├── auth/
│   │   │   └── service.ts          # Auth business logic
│   │   ├── db/
│   │   │   ├── index.ts            # Database connection
│   │   │   └── schema.ts           # Drizzle ORM schema
│   │   └── whatsapp/
│   │       ├── client.ts           # WhatsApp client wrapper (single session)
│   │       ├── session-manager.ts  # Multi-session management + webhook
│   │       ├── service.ts          # Business logic layer
│   │       └── types.ts            # TypeScript interfaces
│   ├── core/
│   │   ├── env.ts                  # Zod environment validation
│   │   └── logger.ts               # Pino structured logging
│   └── api/
│       └── routes/
│           ├── health.ts
│           ├── status.ts
│           ├── qr.ts
│           ├── send.ts
│           ├── send-media.ts
│           ├── sessions.ts
│           ├── webhook.ts
│           └── auth.ts
├── data/
│   └── .session/                   # Session storage (gitignored)
├── migrations/
│   ├── 001_initial.sql
│   └── 002_sessions_webhooks.sql
├── tests/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run src/index.ts` | Run development |
| `bun run --watch src/index.ts` | Run with hot reload |
| `bun test` | Run tests |
| `bunx tsc --noEmit` | TypeScript check |
| `docker build -t whatsapp-gateway .` | Build Docker image |
| `docker-compose up -d` | Run with Docker Compose |
| `pm2 start src/index.ts --name whatsapp-gateway` | Run with PM2 |

---

## License

MIT License