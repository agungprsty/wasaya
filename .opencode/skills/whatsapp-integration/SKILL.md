---
name: whatsapp-integration
description: WhatsApp device lifecycle, messaging, webhooks, and chatbot rules
---

# WhatsApp Integration Skill

## Overview
WhatsApp device lifecycle, messaging, webhooks, and chatbot rules via `lib/whatsapp.ts`.

## Core Module: `WhatsAppManager` (`lib/whatsapp.ts`)
Singleton class keyed by `userId`. Manages multiple `whatsapp-web.js` `Client` instances.

```typescript
import { whatsappManager } from "@/lib/whatsapp";
```

## Connection Lifecycle (Required)

```
connect → QR generation → connected (ready) → message listening
                                    ↓
                            disconnected ←── (events)
```

### Key Methods
```typescript
whatsappManager.startConnect(userId, timeoutMs)      // Fire-and-forget connection
await whatsappManager.getStatus(userId)               // Returns { status, phone, qrCode }
const qr = whatsappManager.getQR(userId)              // Current QR code string
await whatsappManager.disconnect(userId)              // Destroy client, update DB
const contacts = await whatsappManager.getContacts(userId)
await whatsappManager.sendMessage(userId, to, body, media)
```

## Event Handlers
All handlers update both **in-memory state** and the **database** simultaneously:

| Event | Action |
|-------|--------|
| `qr` | Upserts QR code to `WhatsAppSession` table |
| `ready` | Updates status to connected, retries pending messages |
| `message_ack` | Tracks delivery status, fires webhooks |
| `disconnected` | Updates session status to disconnected |
| `message` (incoming) | Stores message, runs chatbot, fires webhook |

## Messaging

### Send Single Message
```typescript
await whatsappManager.sendMessage(userId, "+628123456789", "Hello!", media)
// media: { base64: string; mimetype: string; filename: string } | null
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
- **Local Auth**: `wa_sessions/<userId>/` directory
- **Database**: `WhatsAppSession` model tracks connection state
- **Puppeteer**: headless with `--no-sandbox` flag

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/connect` | POST | Start device connection |
| `/api/whatsapp/status` | GET | Get connection status |
| `/api/whatsapp/qrcode` | GET | Get current QR code |
| `/api/whatsapp/disconnect` | POST | Disconnect device |
| `/api/whatsapp/contacts` | GET | Fetch WhatsApp contacts |

## Best Practices (Required)

### Do ✅
- Use fire-and-forget for `startConnect()` — poll `/api/whatsapp/status` for updates
- Validate phone numbers before sending messages
- Handle "not connected" with pending message fallback (202 accepted)
- Update in-memory state AND database simultaneously in event handlers
- Use `?.` for optional chaining on WhatsApp objects (phone, qrCode may be null)

### Don't ❌
- Don't call `startConnect()` multiple times — it's idempotent
- Don't block on webhook delivery — fire-and-forget pattern
- Don't forget to run `prisma generate` after schema changes involving WhatsApp models
