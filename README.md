# TEMANWA — WhatsApp Gateway Service

A full-featured WhatsApp Gateway built with Next.js 16, PostgreSQL, and @whiskeysockets/baileys. Send and receive WhatsApp messages through a web dashboard or REST API.

## Features

- **Dashboard** — Overview with analytics (chart, distribution, insights), usage limits, and quick start checklist
- **Authentication** — Register/login with JWT (httpOnly cookies, bcrypt), plus password reset via email
- **Send Message** — Compose and send WhatsApp messages with optional media (images, PDFs, documents) and location sharing
- **Message Templates** — Save and reuse message templates with `{{variable}}` placeholders
- **Broadcast** — Send bulk messages via BullMQ queue with tier-based priority, concurrency, and per-conversation throttling
- **Recurring Scheduled Messages** — One-time or recurring (hourly/daily/weekly/monthly) with cron expressions
- **Message History** — Paginated list with status filters (sent, delivered, failed, pending, received)
- **Contacts** — Manage contact list with groups for broadcast targeting
- **Contact Groups** — Organize contacts into groups for targeted broadcasts
- **Chatbot Rules** — Keyword-based auto-reply rules with priority ordering and variable interpolation
- **WhatsApp Device** — Connect up to 4 devices via QR code or pairing code (Baileys), with safety monitoring
- **API Keys** — Generate and revoke API keys for programmatic access
- **Webhook Settings** — Configure webhook URL with HMAC-SHA256 signed delivery for incoming messages
- **Safety Monitoring** — Automatic violation tracking, quarantine mode, and health checks
- **Human-like Delays** — Configurable typing/reading delays to mimic human behavior
- **Usage Limits** — Tier-based daily/monthly limits (Free: 50/day, 500/month; Pro: 200/day, 5,000/month; Enterprise: unlimited)
- **REST API** — All features accessible via API endpoints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Database | PostgreSQL via Prisma ORM v6.19.3 |
| Auth | JWT (httpOnly cookies), bcryptjs, API keys |
| WhatsApp | @whiskeysockets/baileys v7.0.0-rc13 (WebSocket, no browser) |
| Queue | BullMQ v5 + Redis (ioredis) |
| Email | nodemailer |
| Image/Media | jimp, @aws-sdk/client-s3 |
| Maps | leaflet |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Toast | sonner |
| Logging | pino |
| Runtime | Node.js 22+ |

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL (local or Docker)
- Redis (Docker)
- npm

### Setup

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Start services (via Docker):
```bash
docker compose up -d
```

4. Copy environment variables:
```bash
cp .env.example .env
```

5. Run Prisma migrations:
```bash
npx prisma migrate dev
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://***:***@localhost:5432/whatsapp_gateway
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CRON_SECRET=your-cron-secret-for-automated-jobs
REDIS_URL=redis://localhost:6379

# Email (for password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@temanwa.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema

| Model | Purpose |
|-------|---------|
| `User` | Account management (name, email, password, avatar) |
| `Subscription` | Tier subscription (free, pro, enterprise) with account age tracking |
| `WhatsAppMessage` | Outgoing and incoming messages with status tracking |
| `Contact` | Saved phone numbers per user |
| `Group` | Contact groups for broadcast targeting |
| `ContactGroup` | Many-to-many relation between contacts and groups |
| `MessageTemplate` | Reusable message templates with `{{variable}}` placeholders |
| `ApiKey` | API access tokens per user |
| `Settings` | Webhook URL/secret, auto-reply, watermark, delay config, admin numbers, safety mode |
| `AutoReplyLog` | Logs of auto-replied contacts for rate limiting |
| `WhatsAppSession` | WhatsApp device connection state (multi-device, quarantine, proxy, safety tracking) |
| `BaileysAuthCred` | WhatsApp auth credentials (Prisma-based SignalKeyStore) |
| `ScheduledMessage` | Scheduled/delayed broadcast messages with recurrence support |
| `ChatbotRule` | Keyword-based auto-reply rules with priority ordering |
| `Product` | Product catalog items for business messaging |
| `UsageRecord` | Daily/monthly usage tracking with composite unique key |
| `PasswordResetToken` | Password reset tokens with expiry |
| `WebhookEvent` | Webhook delivery event logs |

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user + subscription + usage |
| POST | `/api/auth/logout` | Sign out |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics?days=7` | Get message analytics (daily breakdown, summary) |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages` | List messages (paginated, filter by status) |
| POST | `/api/messages` | Send a WhatsApp message (supports media/location) |

### Broadcast
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/broadcast` | Send to multiple recipients via BullMQ queue |

### Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | List message templates |
| POST | `/api/templates` | Create a message template |
| PUT | `/api/templates?id={id}` | Update a template |
| DELETE | `/api/templates?id={id}` | Delete a template |

### Contacts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contacts` | List contacts (paginated, searchable) |
| POST | `/api/contacts` | Add a contact |
| DELETE | `/api/contacts?id={id}` | Delete a contact |

### Groups
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups` | List contact groups |
| POST | `/api/groups` | Create a contact group |
| PUT | `/api/groups?id={id}` | Update a group |
| DELETE | `/api/groups?id={id}` | Delete a group |

### API Keys
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/keys` | List API keys |
| POST | `/api/keys` | Generate a new key |
| DELETE | `/api/keys?id={id}` | Revoke a key |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get settings (webhook, auto-reply, delay config, safety mode) |
| PUT | `/api/settings` | Update settings |

### Chatbot Rules
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chatbot` | List chatbot rules |
| POST | `/api/chatbot` | Create a chatbot rule |
| PUT | `/api/chatbot?id={id}` | Update a chatbot rule |
| DELETE | `/api/chatbot?id={id}` | Delete a chatbot rule |

### Scheduled Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/scheduler` | List scheduled messages |
| POST | `/api/scheduler` | Schedule a message (with recurrence support) |
| PUT | `/api/scheduler?id={id}` | Update a scheduled message |
| DELETE | `/api/scheduler?id={id}` | Cancel a scheduled message |

### WhatsApp Device
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/whatsapp/status?deviceId={id}` | Get connection status (404 if not found) |
| GET | `/api/whatsapp/qrcode?deviceId={id}` | Get current QR/pairing code |
| POST | `/api/whatsapp/connect` | Start device connection (QR) or `{ "phone": "628..." }` for pairing code |
| POST | `/api/whatsapp/disconnect` | Disconnect device |

### Webhook Test
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhook-test` | Trigger a test webhook delivery |

### Cron Jobs (Internal)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cron/process-scheduled` | Process due scheduled messages (secured via `CRON_SECRET`) |

## Auto-Created Device
A "Main Device" `WhatsAppSession` is automatically created when a new user registers. The dashboard always shows a device to connect — no "No Devices" screen.

## WhatsApp Connection

### QR Code
1. Navigate to **Dashboard → Device**
2. Click **Connect**
3. Scan the QR code with WhatsApp on your phone
4. Status changes to **Connected**

### Pairing Code (no QR scan needed)
1. POST to `/api/whatsapp/connect` with `{ "phone": "628123456789" }`
2. Returns an 8-digit pairing code
3. Open WhatsApp → Linked Devices → Link a Device
4. Enter the pairing code instead of scanning QR
5. Status changes to **Connected**

### Multi-Device
Supports up to 4 devices per account (add via **Dashboard → Device → Add Device**).

## Safety Features
- **Safety Monitor** — Tracks disconnection errors and violation counts per device
- **Quarantine Mode** — Devices with excessive violations are automatically quarantined
- **Human-like Delays** — Configurable typing/reading delays to mimic real user behavior
- **Per-conversation Throttling** — Prevents rapid-fire messaging to the same contact

## Development

### Prisma Commands

```bash
npx prisma generate          # Generate client after schema changes
npx prisma migrate dev       # Create and apply migrations
npx prisma studio            # Open database browser
npm run backfill:usage       # Backfill usage records for existing users
```

### Build

```bash
npm run build
```

## Deployment

For production:
1. Use a managed PostgreSQL service
2. Configure Redis (required for BullMQ queue)
3. Set strong `JWT_SECRET`, `CRON_SECRET`, and SMTP credentials
4. Use Docker Compose for containerized deployment

## License

MIT
