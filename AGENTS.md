# WhatsApp Gateway - Agent Documentation

## Project Overview

Self-hosted WhatsApp Gateway service using NuxtJS (Nitro) + PostgREST + whatsapp-web.js. Service untuk mengirim notifikasi WhatsApp ke pelanggan (terintegrasi dengan Laravel).

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js (build/run), Bun (package mgr) | ^22 / ^1.1 |
| Framework | Nuxt (Nitro SSR) | ^3.15.4 |
| Language | TypeScript | ^5.7 |
| Database Driver | pg (node-postgres) | ^8.21 |
| Frontend State | Pinia | ^3.0 |
| WhatsApp Library | whatsapp-web.js | ^1.26 |
| Validation | Zod | ^3.24 |
| Logging | Pino | ^9.0 |
| Styling | Tailwind CSS (CDN) | latest |

## Project Structure

```
wawawa/
├── server/
│   ├── api/                        # Nitro API routes
│   │   ├── auth/                   # Auth endpoints
│   │   │   ├── register.post.ts
│   │   │   ├── login.post.ts
│   │   │   └── api-keys/          # API key management
│   │   ├── health.get.ts           # Health check
│   │   ├── webhook/               # Webhook CRUD
│   │   └── whatsapp/
│   │       ├── send.post.ts        # Send text
│   │       ├── send-media.post.ts  # Send media
│   │       └── sessions/           # Multi-session mgmt
│   ├── middleware/
│   │   └── auth.ts                 # API key + JWT auth
│   ├── plugins/
│   │   └── whatsapp-init.ts        # Default session init
│   ├── utils/
│   │   ├── logger.ts               # Pino logger
│   │   ├── postgrest.ts            # PostgREST client
│   │   └── validation.ts           # Zod schemas
│   └── whatsapp/
│       ├── client.ts               # WhatsApp client wrapper
│       ├── session-manager.ts      # Singleton multi-session
│       └── types.ts                # TypeScript interfaces
├── app/                            # Vue 3 frontend
│   ├── app.vue
│   ├── layouts/default.vue
│   ├── pages/                      # Nuxt pages
│   │   ├── index.vue               # Dashboard overview
│   │   ├── login.vue
│   │   ├── register.vue
│   │   ├── sessions.vue            # Session list
│   │   ├── device.vue              # QR scan
│   │   ├── send.vue                # Send message
│   │   └── webhook.vue             # Webhook config
│   ├── components/                 # Vue components
│   │   ├── AppSidebar.vue
│   │   ├── QrDisplay.vue
│   │   ├── SessionList.vue
│   │   ├── SendMessageForm.vue
│   │   ├── WebhookForm.vue
│   │   ├── ConnectionStatus.vue
│   │   └── ApiKeyManager.vue
│   ├── composables/useApi.ts       # API composable
│   └── stores/                     # Pinia stores
│       ├── auth.ts
│       ├── sessions.ts
│       └── webhook.ts
├── db/
│   └── schema.sql                  # PostgreSQL schema
├── data/
│   └── .session/                   # WhatsApp session data
├── middleware/
│   └── auth.ts                     # Page auth guard
├── plugins/
│   └── pinia.ts                    # Pinia setup
├── nuxt.config.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── AGENTS.md
```

## Important Notes for AI Agents

### 1. Environment Variables

Copy `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Wajib diisi:
- `API_SECRET` — minimal 32 karakter (`openssl rand -base64 32`)
- `JWT_SECRET` — minimal 32 karakter
- `PGPASSWORD` — password PostgreSQL

Variable database terpisah (bukan DATABASE_URL) untuk keamanan:
`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

### 2. Running the Service

```bash
# Install
bun install

# Development (hot reload)
npx nuxi dev --port 3001

# Build
npx nuxi build

# Production
PORT=3001 node .output/server/index.mjs

# Docker
docker-compose up -d
```

### 3. API Endpoints

Semua endpoint kecuali `/api/health` dan `/api/auth/*` WAJIB header `X-API-Key`:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | ❌ | Health check |
| POST | `/api/auth/register` | ❌ | Register user |
| POST | `/api/auth/login` | ❌ | Login (returns JWT) |
| GET | `/api/auth/api-keys` | ✅ | List API keys |
| POST | `/api/auth/api-keys` | ✅ | Create API key |
| POST | `/api/auth/api-keys/revoke` | ✅ | Revoke API key |
| GET | `/api/whatsapp/sessions` | ✅ | List sessions |
| POST | `/api/whatsapp/sessions` | ✅ | Create session |
| GET | `/api/whatsapp/sessions/:id` | ✅ | Session detail |
| GET | `/api/whatsapp/sessions/:id/status` | ✅ | Connection status |
| GET | `/api/whatsapp/sessions/:id/qr` | ✅ | QR code (base64) |
| POST | `/api/whatsapp/sessions/:id/restart` | ✅ | Restart client |
| POST | `/api/whatsapp/sessions/:id/logout` | ✅ | Logout |
| DELETE | `/api/whatsapp/sessions/:id` | ✅ | Delete session |
| POST | `/api/whatsapp/send` | ✅ | Send text message |
| POST | `/api/whatsapp/send-media` | ✅ | Send media |
| GET | `/api/webhook` | ✅ | Get webhook config |
| POST | `/api/webhook` | ✅ | Set webhook URL |
| DELETE | `/api/webhook` | ✅ | Delete webhook |

Contoh:

```bash
# Health check
curl http://localhost:3001/api/health

# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123","name":"User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'

# Send message (dengan API key)
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"sessionId":"default","phone":"6281234567890","message":"Hello!"}'
```

### 4. Phone Number Format

Indonesia tanpa prefix +:

- ✅ `6281234567890`
- ❌ `+6281234567890` atau `081234567890`

### 5. Session Management

- Session tersimpan di `data/.session/{sessionId}/`
- Scan QR sekali via `/api/whatsapp/sessions/:id/qr`
- Jika expired, QR baru otomatis

### 6. Docker Architecture

```
Port 5432: PostgreSQL
Port 3001: NuxtJS (Nitro API + Vue frontend)
```

```bash
docker-compose up -d
```

### 7. Security

- [ ] Set `API_SECRET` minimal 32 karakter
- [ ] Set `JWT_SECRET` minimal 32 karakter
- [ ] Gunakan HTTPS di production (reverse proxy)
- [ ] Batasi akses dengan firewall
- [ ] Monitor logs untuk suspicious activity

## Code Conventions

### TypeScript
- Strict mode in tsconfig
- `export type` untuk type exports
- No `any` — gunakan `unknown`

### Logging
- Pino logger dari `server/utils/logger.ts`
- Dev: JSON pretty
- Prod: JSON structured

### Error Handling
- Zod untuk validasi input
- `createError` dari h3 untuk error responses
- Structured error logging

### Testing
- PostgREST harus running untuk integration test
- Test dengan `bun test`

## Commands Reference

```bash
bun install              # Install dependencies
npx nuxi dev             # Dev server (hot reload)
npx nuxi build           # Production build
PORT=3001 node .output/server/index.mjs  # Start production
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker build -t whatsapp-gateway .  # Build Docker image
```

## Troubleshooting

### Error: EADDRINUSE
Port sudah dipakai. Ganti PORT env var atau kill proses lama:
```bash
fuser -k 3001/tcp
```

### Error: Database connection failed
Pastikan PostgreSQL running:
```bash
docker-compose ps
docker-compose logs db
```

### Error: WhatsApp client not ready
Cek `/api/health` endpoint. Scan QR dari `/api/whatsapp/sessions/:id/qr`.

### Session expired
Hapus folder `data/.session/{sessionId}/` dan scan ulang QR.

### Error: whatsapp-web.js import fails
Gunakan default import (bukan named) untuk CJS modules:
```typescript
import wweb from 'whatsapp-web.js'
const { Client, LocalAuth } = wweb
```
