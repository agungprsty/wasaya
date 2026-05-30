---
name: whatsapp-integration
description: WhatsApp device lifecycle, messaging, webhooks, and chatbot rules
---

# WhatsApp Integration Skill

## Overview
WhatsApp device lifecycle, messaging, webhooks, and chatbot rules via `lib/whatsapp.ts`.

## Core Module: `BaileysManager` (`lib/whatsapp.ts`)
Singleton class keyed by `userId_deviceId`. Manages multiple `@whiskeysockets/baileys` `WASocket` instances over WebSocket (no browser). Manages up to 4 devices per user.

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
whatsappManager.startConnect(userId, timeoutMs, deviceId)        // Fire-and-forget connection (idempotent)
await whatsappManager.startPairing(userId, phone, deviceId)       // Pairing code flow, returns code
await whatsappManager.getStatus(userId, deviceId)                 // Returns { status, phone, qrCode } or null
const qr = whatsappManager.getQR(userId, deviceId)                // Current QR/pairing code string
await whatsappManager.disconnect(userId, deviceId)                // End socket, update DB, clear caches
await whatsappManager.listDevices(userId)                         // All devices for a user
await whatsappManager.addDevice(userId, name, deviceId)           // Add new device (max 4)
await whatsappManager.deleteDevice(userId, deviceId)              // Remove device + auth creds
const contacts = await whatsappManager.getContacts(userId, deviceId)  // From in-memory cache
await whatsappManager.getGroups(userId, deviceId)                 // Fetch live WhatsApp groups
await whatsappManager.sendMessage(userId, to, body, media, deviceId, location, quotedMsg)
// sendMessage supports: text, image, video, audio, document, location, quoted replies
// Also applies watermark if configured in Settings
```

## Event Handlers (Baileys)
All handlers update both **in-memory state** and the **database** simultaneously:

| Event | Action |
|-------|--------|
| `connection.update` (qr) | Upserts QR/pairing code to `WhatsAppSession` table, sets 20s timeout |
| `connection.update` (open) | Updates status to connected, duplicates check, retries pending messages |
| `connection.update` (close) | Handles reconnect (exponential backoff, max 5 retries) or loggedOut |
| `messages.update` | Tracks delivery status (`1=sent, 2=delivered, 3=read`), fires webhooks |
| `messages.upsert` (incoming) | Stores message, runs auto-reply + chatbot, fires webhook |
| `contacts.upsert` | Populates in-memory contacts cache |
| `creds.update` | Auto-saves auth credentials to `BaileysAuthCred` table |

## Incoming Message Flow
When a message arrives:
1. Skip if `fromMe` (own message) or no `remoteJid`
2. Extract body from `conversation`, `extendedTextMessage`, `imageMessage`, `videoMessage`, or `documentMessage`
3. Store in `WhatsAppMessage` with status `"received"`
4. Try `processAutoReply(userId, jid)` first — checks `AutoReplyLog` cooldown
5. If no auto-reply, try `processChatbot(userId, jid, body)` — keyword matching
6. Before sending reply: check usage limits via `checkAndTrack(userId, tier)`
7. Apply human-like delays: read delay → typing presence → typing delay → send
8. After reply: mark auto-reply sent, read receipt, sleep
9. If no reply: deliver webhook `message.received`

## Messaging

### Send Single Message
```typescript
await whatsappManager.sendMessage(userId, "+628123456789", "Hello!", media, deviceId, location, quotedMsg)
// media: { base64: string; mimetype: string; filename: string } | null
// location: { latitude: number; longitude: number; title?: string } | null
// quotedMsg: optional key from original message to reply to
// Automatically applies watermark from Settings
// Throws if device is quarantined
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

### Usage Limits (check before sending)
```typescript
import { checkAndTrack, checkLimit } from "@/lib/usage-tracker";
import { getUserTier } from "@/lib/api-tier";

const tier = await getUserTier(userId);
const limitCheck = await checkAndTrack(userId, tier);
if (!limitCheck.allowed) throw new Error(limitCheck.error);
```

## Human-like Delay Engine (`lib/delay-engine.ts`)
```typescript
import { sleep, calculateTypingDelay, jitterDelay, humanDelay } from "@/lib/delay-engine";

calculateTypingDelay(text, msPerChar)  // Typing simulation duration
jitterDelay(baseMs)                    // Add random ±30% variance
humanDelay(context, charCount)         // Combined delay with jitter
```

## Safety Monitor (`lib/safety-monitor.ts`)
- `safetyMonitor.recordError(userId, deviceId, statusCode)` — track disconnection errors
- `safetyMonitor.isQuarantined(userId, deviceId)` — check if device is quarantined
- Quarantine threshold: configurable via `Settings.safetyMode`
- Health check runs every 30 seconds to auto-reconnect known sessions

## Queue & Background Jobs (`lib/message-queue.ts`)
BullMQ v5 queue for broadcast/bulk messages:

```typescript
import { enqueueMessage, sendQueue, startWorker } from "@/lib/message-queue";

// Enqueue a message
await enqueueMessage({ userId, tier, jid, body, media, deviceId, location }, { dedupId });

// Worker auto-started via instrumentation.ts register() hook
```

| Feature | Details |
|---------|---------|
| Queue name | `wa-send` |
| Tier priority | enterprise: 1, pro: 2, free: 3 |
| Tier concurrency | enterprise: 10, pro: 2, free: 1 |
| Per-conversation throttle | Redis-based, resets per window |
| Deduplication | 60s TTL via `dedupId` |

## Webhooks (`lib/webhook.ts`)
- Messages signed with **HMAC-SHA256** signature in header
- Automatic retry up to 3 times with exponential backoff
- Events recorded in `WebhookEvent` table
```typescript
import { deliverWebhook } from "@/lib/webhook";
deliverWebhook(userId, "message.received", payload);
```

### Webhook Settings (per user in `Settings` model)
| Field | Description |
|-------|-------------|
| `webhookUrl` | Target URL for delivery |
| `webhookSecret` | Secret for HMAC signature verification |

## Chatbot Rules (`lib/chatbot.ts`, `prisma/ChatbotRule`)

### Auto-Reply Flow
1. Incoming message stored in `WhatsAppMessage`
2. `processAutoReply(userId, from)` checks per-contact cooldown via `AutoReplyLog`
3. If cooldown passed, `processChatbot(userId, from, body)` is called
4. Finds active `ChatbotRule` records (ordered by priority)
5. Checks if any rule's `keywords` array matches the message
6. Returns first matching rule's `response` with **variable interpolation** (`{{name}}`, `{{phone}}`)

```typescript
import { processChatbot, processAutoReply, markAutoReplySent } from "@/lib/chatbot";
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
- **Database**: `WhatsAppSession` model tracks connection state, proxy URL, safety metrics
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
| `/api/whatsapp/connect` | POST | Start device connection (QR or `{ phone }` for pairing code) |
| `/api/whatsapp/status?deviceId={id}` | GET | Get connection status (404 if not found) |
| `/api/whatsapp/qrcode?deviceId={id}` | GET | Get current QR/pairing code |
| `/api/whatsapp/disconnect` | POST | Disconnect device |

## Best Practices (Required)

### Do ✅
- Use fire-and-forget for `startConnect()` — poll `/api/whatsapp/status` for updates
- Validate phone numbers before sending messages
- Handle "not connected" by returning 202 accepted with message stored as pending
- Update in-memory state AND database simultaneously in event handlers
- Use `?.` for optional chaining on WhatsApp objects (phone, qrCode may be null)
- Call `toJID()` on every `to` parameter before passing to `sock.sendMessage()`
- Use **`Promise.all` + direct `prisma` calls** in SignalKeyStore `set()` (no `$transaction`)
- **Reuse cached auth state** on reconnect to preserve Baileys' in-memory key cache
- Auto-create "Main Device" `WhatsAppSession` on user registration
- Check usage limits via `checkAndTrack()` before sending
- Check quarantine status via `safetyMonitor.isQuarantined()` before sending
- Use human-like delays (`delay-engine.ts`) for natural behavior
- Check tier limits (daily/monthly) from `limit-constants.ts`
- Enforce duplicate phone check across users during pairing

### Don't ❌
- Don't call `startConnect()` multiple times — it's idempotent (wait if already connecting)
- Don't block on webhook delivery — fire-and-forget pattern
- Don't auto-reconnect on `DisconnectReason.loggedOut` — notify user instead
- Don't forget to run `prisma generate` after schema changes involving WhatsApp models
- **Don't wrap `set()` in `$transaction`** — concurrent `get()` calls won't see uncommitted data
- **Don't fabricate fallback objects** in `getStatus()` — return `null` when device not found
- Don't send messages without checking usage limits first
- Don't bypass safety monitor checks for quarantined devices
