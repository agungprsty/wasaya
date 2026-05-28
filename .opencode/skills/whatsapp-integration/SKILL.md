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

### Critical: SignalKeyStore `set()` — No Transactions + Parallel
The `set()` function in `usePrismaAuthState` must NOT use `prisma.$transaction()`. During initial sync, Baileys sends hundreds of keys concurrently; a transaction would hold uncommitted writes invisible to concurrent `get()` calls (Read Committed isolation), causing `failed to find key to decode mutation`.

Always use **direct `prisma` calls + `Promise.all`**:
```typescript
set: async (data: SignalDataSet): Promise<void> => {
  const operations: Promise<any>[] = [];
  for (const category in data) {
    const entries = data[category as keyof SignalDataSet];
    if (!entries) continue;
    for (const id in entries) {
      const value = entries[id];
      if (value === null || value === undefined) {
        operations.push(prisma.baileysAuthCred.deleteMany({ where: { ... } }));
      } else {
        const serialized = JSON.stringify(value, BufferJSON.replacer);
        operations.push(prisma.baileysAuthCred.upsert({ where: { ... }, create: { ... }, update: { ... } }));
      }
    }
  }
  await Promise.all(operations);
};
```

## Reconnect & Auth State Caching
In `_doConnect()` (`lib/whatsapp.ts`), **reuse cached auth state** to preserve Baileys' internal signal key cache across reconnects:

```typescript
let state = this.authStates.get(key);
let saveCreds = this.saveCredsFns.get(key);

if (!state || !saveCreds) {
  const auth = await usePrismaAuthState(userId, deviceId);
  state = auth.state;
  saveCreds = auth.saveCreds;
  this.authStates.set(key, state);
  this.saveCredsFns.set(key, saveCreds);
}
```

This avoids re-initializing `makeCacheableSignalKeyStore` and losing the in-memory key cache on every reconnect.

## Default Device on Registration
When a user registers (`app/api/auth/register/route.ts`), a default `WhatsAppSession` with `deviceId: "main"` and `name: "Main Device"` is auto-created so the dashboard never shows "No Devices" for new users.

## Status API — Null Return
`getStatus()` returns `null` when the requested `deviceId` does not exist in the database (no fabricated fallback object). The API route returns `404 { session: null, error: "Device not found" }` in that case.

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
- Use **`Promise.all` + direct `prisma` calls** in SignalKeyStore `set()` (no `$transaction`)
- **Reuse cached auth state** on reconnect to preserve Baileys' in-memory key cache
- Auto-create "Main Device" `WhatsAppSession` on user registration

### Don't ❌
- Don't call `startConnect()` multiple times — it's idempotent
- Don't block on webhook delivery — fire-and-forget pattern
- Don't auto-reconnect on `DisconnectReason.loggedOut` — notify user instead
- Don't forget to run `prisma generate` after schema changes involving WhatsApp models
- **Don't wrap `set()` in `$transaction`** — concurrent `get()` calls won't see uncommitted data
- **Don't fabricate fallback objects** in `getStatus()` — return `null` when device not found
