---
name: whatsapp-integration
description: WhatsApp device lifecycle, messaging, webhooks, and chatbot rules
---

# WhatsApp Integration Skill

## Overview
WhatsApp device lifecycle, messaging, webhooks, and chatbot rules via `lib/whatsapp.ts`.

## Core Module: `BaileysManager` (`lib/whatsapp.ts`)
Singleton class keyed by `userId_deviceId`. Manages multiple `@whiskeysockets/baileys` `WASocket` instances over WebSocket (no browser).

```typescript
import { whatsappManager } from "@/lib/whatsapp";
```

## Connection Lifecycle (Required)

```
connect → QR/pairing code → open → message listening
                   ↓
             disconnected ←── (events)
                   ↓
             loggedOut → jangan reconnect
```

### Key Methods
```typescript
whatsappManager.startConnect(userId, timeoutMs, deviceId)        // Fire-and-forget connection
await whatsappManager.startPairing(userId, phone, deviceId)       // Pairing code flow, returns code
await whatsappManager.getStatus(userId, deviceId)                 // Returns { status, phone, qrCode }
const qr = whatsappManager.getQR(userId, deviceId)                // Current QR code string
await whatsappManager.disconnect(userId, deviceId)                // End socket, update DB
const contacts = await whatsappManager.getContacts(userId, deviceId)
await whatsappManager.sendMessage(userId, to, body, media, deviceId, location)
```

## Event Handlers (Baileys)
All handlers update both **in-memory state** and the **database** simultaneously:

| Event | Action |
|-------|--------|
| `connection.update` (qr) | Upserts QR/pairing code to `WhatsAppSession` table |
| `connection.update` (open) | Updates status to connected, retries pending messages |
| `connection.update` (close) | Handles reconnect (exponential backoff) or loggedOut |
| `messages.update` | Tracks delivery status (`1=sent, 2=delivered, 3=read`), fires webhooks |
| `messages.upsert` (incoming) | Stores message, runs chatbot, fires webhook |
| `contacts.upsert` | Populates in-memory contacts cache |
| `creds.update` | Auto-saves auth credentials to `BaileysAuthCred` table |

## Messaging

### Send Single Message
```typescript
await whatsappManager.sendMessage(userId, "+628123456789", "Hello!", media, deviceId, location)
// media: { base64: string; mimetype: string; filename: string } | null
// location: { latitude: number; longitude: number; title?: string } | null
```

### Phone Validation (use before sending — Required)
```typescript
import { validatePhone } from "@/lib/phone-utils";
const result = validatePhone("+628123456789");
// Returns: { valid: boolean; normalized: string; error?: string }
```

### Rate Limiting
- Messages: 30 req/min, Broadcast: 10 req/min per user
```typescript
import { rateLimit } from "@/lib/rate-limit";
const rl = rateLimit(user!.userId, "messages", 30, 60000);
if (rl) return rl; // Return 429 immediately
```

## Webhooks (`lib/webhook.ts`)
- Messages signed with **HMAC-SHA256** signature in header
- Automatic retry up to 3 times with exponential backoff
- Events recorded in `WebhookEvent` table
```typescript
import { deliverWebhook } from "@/lib/webhook";
deliverWebhook(userId, "message", payload);
```

### Webhook Settings (per user in `Settings` model)
| Field | Description |
|-------|-------------|
| `webhookUrl` | Target URL for delivery |
| `webhookSecret` | Secret for HMAC signature verification |

## Chatbot Rules (`lib/chatbot.ts`, `prisma/ChatbotRule`)

### Auto-Reply Flow
1. Incoming message stored in `WhatsAppMessage`
2. `processChatbot(userId, from, body)` called
3. Finds active `ChatbotRule` records (ordered by priority)
4. Checks if any rule's `keywords` array matches the message
5. Returns first matching rule's `response` with **variable interpolation** (`{{name}}`, `{{phone}}`)

```typescript
import { processChatbot } from "@/lib/chatbot";
const response = await processChatbot(userId, "+628123456789", "Hello");
```

### ChatbotRule Schema
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Rule identifier |
| `keywords` | String[] | Keywords to match (PostgreSQL array) |
| `response` | String | Auto-reply with `{{variable}}` placeholders |
| `isActive` | Boolean | Enable/disable |
| `priority` | Int | Higher = checked first (default: 0) |

## Template Variables (`lib/template-utils.ts`)
```typescript
import { extractVariables, interpolate } from "@/lib/template-utils";

const vars = extractVariables("Hello {{name}}, order ready."); // ["name"]
const body = interpolate("Hi {{name}}", { name: "John" });    // "Hi John"
```

## Session Storage
- **Auth state**: `BaileysAuthCred` model (Prisma-based `SignalKeyStore` with caching)
- **Database**: `WhatsAppSession` model tracks connection state
- **No browser**: Baileys uses WebSocket murni

## Auth Helper (`lib/baileys-auth.ts`)
```typescript
import { usePrismaAuthState } from "@/lib/baileys-auth";

const { state, saveCreds } = await usePrismaAuthState(userId, deviceId);
// state.creds → AuthenticationCreds
// state.keys → SignalKeyStore (wrapped with makeCacheableSignalKeyStore)
// saveCreds() → triggered by creds.update event
```

## JID Format
Gunakan `toJID()` helper dari `lib/whatsapp.ts` untuk semua konversi nomor:
```typescript
import { toJID } from "@/lib/whatsapp";

toJID("628123456789")           // → "628123456789@s.whatsapp.net"
toJID("628123456789@c.us")      // → "628123456789@s.whatsapp.net"
toJID("123@g.us")               // → "123@g.us" (group, unchanged)
toJID("628123456789@s.whatsapp.net") // → unchanged
```

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/connect` | POST | Start device connection (QR or pairing code) |
| `/api/whatsapp/status` | GET | Get connection status |
| `/api/whatsapp/qrcode` | GET | Get current QR/pairing code |
| `/api/whatsapp/disconnect` | POST | Disconnect device |
| `/api/whatsapp/contacts` | GET | Fetch WhatsApp contacts (from cache) |

## Best Practices (Required)

### Do ✅
- Use fire-and-forget for `startConnect()` — poll `/api/whatsapp/status` for updates
- Validate phone numbers before sending messages
- Handle "not connected" with pending message fallback (202 accepted)
- Update in-memory state AND database simultaneously in event handlers
- Use `?.` for optional chaining on WhatsApp objects (phone, qrCode may be null)
- Call `toJID()` on every `to` parameter before passing to `sock.sendMessage()`

### Don't ❌
- Don't call `startConnect()` multiple times — it's idempotent
- Don't block on webhook delivery — fire-and-forget pattern
- Don't auto-reconnect on `DisconnectReason.loggedOut` — notify user instead
- Don't forget to run `prisma generate` after schema changes involving WhatsApp models
