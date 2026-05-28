# WhatsApp Gateway Service

A full-featured WhatsApp Gateway built with Next.js 16, PostgreSQL, and @whiskeysockets/baileys. Send and receive WhatsApp messages through a web dashboard or REST API.

## Features

- **Dashboard** — Overview stats, quick start checklist
- **Authentication** — Register/login with JWT (httpOnly cookies, bcrypt)
- **Send Message** — Compose and send WhatsApp messages with optional media (images, PDFs, documents)
- **Message Templates** — Save and reuse message templates with placeholders for consistent messaging
- **Broadcast** — Send bulk messages to multiple contacts with automatic rate limiting
- **Message History** — Paginated list with status filters (sent, delivered, failed, pending)
- **Contacts** — Manage contact list (add, delete)
- **WhatsApp Device** — Connect your WhatsApp number via QR code or pairing code (Baileys)
- **API Keys** — Generate and revoke API keys for programmatic access
- **Webhook Settings** — Configure webhook URL for incoming message notifications
- **REST API** — All features accessible via API endpoints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (httpOnly cookies), bcryptjs |
| WhatsApp | @whiskeysockets/baileys v6 (WebSocket, no browser) |
| Styling | Tailwind CSS v4 |
| Runtime | Node.js 22+ |

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL (local or Docker)
- npm

### Setup

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Start PostgreSQL (via Docker):
```bash
docker compose up -d db
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
DATABASE_URL=postgresql://***:***@localhost:5432/whatsapp_gateway
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## Database Schema

| Model | Purpose |
|-------|---------|
| `User` | Account management (name, email, password) |
| `WhatsAppMessage` | Outgoing and incoming messages with status tracking |
| `Contact` | Saved phone numbers per user |
| `MessageTemplate` | Reusable message templates per user |
| `ApiKey` | API access tokens per user |
| `Settings` | Webhook URL and secret per user |
| `WhatsAppSession` | WhatsApp device connection state |
| `BaileysAuthCred` | WhatsApp auth credentials (Prisma-based SignalKeyStore) |
| `WebhookEvent` | Incoming webhook event logs |

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Sign out |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages` | List messages (paginated, filter by status) |
| POST | `/api/messages` | Send a WhatsApp message (supports media attachment) |

### Broadcast
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/broadcast` | Send a message to multiple recipients (rate-limited) |

### Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | List message templates |
| POST | `/api/templates` | Create a message template |
| DELETE | `/api/templates?id={id}` | Delete a template |

### Contacts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contacts` | List contacts |
| POST | `/api/contacts` | Add a contact |
| DELETE | `/api/contacts?id={id}` | Delete a contact |

### API Keys
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/keys` | List API keys |
| POST | `/api/keys` | Generate a new key |
| DELETE | `/api/keys?id={id}` | Revoke a key |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get webhook settings |
| PUT | `/api/settings` | Update webhook settings |

### WhatsApp Device
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/whatsapp/connect` | Start device connection (QR) or `{ "phone": "628..." }` for pairing code |
| GET | `/api/whatsapp/status` | Get connection status |
| GET | `/api/whatsapp/qrcode` | Get current QR/pairing code |
| POST | `/api/whatsapp/disconnect` | Disconnect device |

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

## Development

### Prisma Commands

```bash
npx prisma generate          # Generate client after schema changes
npx prisma migrate dev       # Create and apply migrations
npx prisma studio            # Open database browser
```

### Build

```bash
npm run build
```

## Deployment

For production:
1. Use a managed PostgreSQL service
2. Set a strong `JWT_SECRET` in environment variables
3. Use Docker Compose for containerized deployment

## License

MIT
