<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16 — Breaking Changes & Conventions

This project uses Next.js 16.2.6 with Turbopack (default bundler). The following differ from standard Next.js documentation:

## Async Request APIs (Required)
- `cookies()`, `headers()`, `draftMode()` — **async only**, no sync shim
- `params` in `layout.tsx`, `page.tsx`, `route.ts` — must be `await`ed
- `searchParams` in `page.tsx` — must be `await`ed

## Middleware → Proxy
- `middleware.ts` is **deprecated**; rename to `proxy.ts` and export `proxy` (not `middleware`)
- Runs on `nodejs` runtime only (no `edge` support)

## Routing & Caching
- Parallel route slots (`@slot`) **must** have a `default.js` file
- `revalidateTag(key, cacheLife)` — second argument (`cacheLife` profile) is required
- `experimental.dynamicIO` → `cacheComponents: true`
- `unstable_cacheLife`/`unstable_cacheTag` → `cacheLife`/`cacheTag` (stable, no prefix)
- `use cache` directive is the central caching model

## Image & Config
- `next/legacy/image` deprecated; use `next/image`
- `images.domains` → `images.remotePatterns`
- `serverRuntimeConfig`/`publicRuntimeConfig` removed; use `process.env` directly
- `next lint` removed; use ESLint CLI directly (`npm run lint`)

## Build & Dev
- Turbopack is default (`--turbopack` not needed); use `--webpack` for Webpack
- Concurrent dev/build output dirs: `.next/dev` (dev) and `.next` (build)
- React Compiler via `reactCompiler: true` (top-level, not `experimental.reactCompiler`)
<!-- END:nextjs-agent-rules -->

---

# Project Conventions

## Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Language | TypeScript 5+ (strict mode) |
| Database | PostgreSQL + Prisma ORM v6.19.3 |
| Auth | JWT (httpOnly cookies), bcryptjs |
| WhatsApp | @whiskeysockets/baileys v7.0.0-rc13 (WebSocket murni, tanpa browser) |
| Queue | BullMQ v5 + Redis (ioredis) |
| Email | nodemailer |
| Image/Media | jimp, @aws-sdk/client-s3 |
| Maps | leaflet + @types/leaflet |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |
| Icons | lucide-react |
| Toast | sonner |
| Logging | pino |
| Linting | ESLint v9 (flat config, `eslint.config.mjs`) |
| Package manager | npm |

## Directory Structure
```
app/                    # Next.js App Router (pages + API routes)
  layout.tsx            # Root layout (server component)
  page.tsx              # Landing page (TEMANWA brand)
  globals.css           # Global styles (Tailwind v4 @import)
  AuthNavButtons.tsx    # Auth nav component (landing page)
  components/           # Shared client components
  login/                # Login page
  register/             # Register page
  forgot-password/      # Forgot password page
  reset-password/       # Reset password page
  dashboard/            # Dashboard pages (client components)
    page.tsx            # Overview with analytics + usage limits
    layout.tsx          # Dashboard layout with sidebar
    limit-constants.ts  # TIER_DAILY_LIMITS / TIER_MONTHLY_LIMITS
    limit-watcher.tsx   # Usage limit notification component
    send/               # Send message page
    messages/           # Message history page
    contacts/           # Contact management page
    groups/             # Contact groups page
    templates/          # Message templates page
    chatbot/            # Chatbot rules page
    broadcast/          # Broadcast page
    scheduled/          # Scheduled messages page
    device/             # WhatsApp device management page
    keys/               # API keys page
    settings/           # Settings page (webhook, auto-reply)
  api/                  # API routes (route.ts per resource)
    auth/               # register, login, me, logout, forgot-password, reset-password
    analytics/          # Analytics endpoint
    messages/           # Message CRUD
    broadcast/          # Broadcast
    templates/          # Template CRUD
    contacts/           # Contact CRUD
    groups/             # Contact groups CRUD
    keys/               # API key CRUD
    settings/           # Settings CRUD
    chatbot/            # Chatbot rule CRUD
    scheduler/          # Scheduled message CRUD
    whatsapp/           # Device connect/disconnect/status/qrcode
    webhook-test/       # Webhook test trigger
    cron/               # Cron jobs (process-scheduled)
  about/                # About page
  contact-support/      # Contact support page
  docs/                 # API docs page
  safety-guidelines/    # Safety guidelines page
  privacy/              # Privacy policy page
  terms/                # Terms of service page
lib/                    # Shared utilities & business logic (no imports from app/)
  prisma.ts             # Prisma client singleton
  api-auth.ts           # JWT + API key auth middleware
  auth.ts               # Token/password helpers
  whatsapp.ts           # BaileysManager singleton (WASocket lifecycle)
  baileys-auth.ts       # Prisma-based SignalKeyStore
  chatbot.ts            # Chatbot rules engine + auto-reply
  message-queue.ts      # BullMQ queue + worker
  redis.ts              # ioredis singleton
  rate-limit.ts         # Rate limiter
  usage-tracker.ts      # Usage limit checking + tracking
  api-tier.ts           # Tier resolution
  delay-engine.ts       # Human-like typing/message delays
  safety-monitor.ts     # WhatsApp safety violation monitor
  email.ts              # Nodemailer email sender
  logger.ts             # Pino logger
  phone-utils.ts        # Phone validation
  template-utils.ts     # Template variable extraction/interpolation
  webhook.ts            # Webhook delivery with HMAC-SHA256
  usage.ts              # Usage data helpers
types/                  # Global TypeScript declarations
  cache-life.d.ts       # Next.js cache life types
  routes.d.ts           # Route type helpers
  validator.ts          # Zod/validation schemas
prisma/                 # Prisma schema + migrations
  schema.prisma         # Data model (17 models)
  seed.ts               # Seed script
public/                 # Static assets
scripts/                # Utility scripts
  backfill-usage.ts     # Usage record backfill
  convert-jid-format.sql# JID format migration SQL
```

## Path Alias
- `@/*` maps to project root (e.g., `@/lib/prisma`, `@/lib/api-auth`)

---

# TypeScript Best Practices

## Type Safety
- **Strict mode enabled** — never use `any` unless necessary (document why when used)
- Use `interface` for object shapes (e.g., `PhoneValidationResult`, component props)
- Use `type` for unions, intersections, mapped types
- Prefer explicit return types on exported functions: `export function foo(): string { ... }`
- Use discriminated unions for state/status patterns: `"idle" | "sending" | "success" | "error"`

## Handling `any` and `as` casts
- Prisma queries may cast with `as any` for dynamic `where` clauses — acceptable but annotate inline
- When using `Record<string, T>`, prefer specific key types over bare `any`
- Prefer narrowing with type guards over blind assertions (`foo as Foo`)

## Null vs Optional
- Use `T | null` for values that can be explicitly null (e.g., `selectedTemplate: Template | null`)
- Use `T?` for optional properties in interfaces
- Use the **optional chaining** operator (`?.`) liberally to avoid null checks

---

# Code Consistency Guidelines

## File & Naming Conventions
| Pattern | Convention | Examples |
|---------|-----------|----------|
| Files (lib, app) | `kebab-case` | `api-auth.ts`, `phone-utils.ts`, `template-utils.ts` |
| Components | PascalCase | `DashboardPage`, `AuthNavButtons` |
| Functions/variables | camelCase | `requireUser`, `hashPassword`, `sendMessage` |
| Types/interfaces | PascalCase | `PhoneValidationResult`, `DailyData` |
| Route directories | kebab-case | `whatsapp/status`, `process-scheduled` |
| Prisma models | PascalCase | `WhatsAppMessage`, `ScheduledMessage` |

## API Route Patterns
- All handlers are **async functions** — use `await` for Prisma and external calls
- Consistent error response: `{ error: "message" }` with appropriate HTTP status
- CRUD resources follow this pattern:
  - `GET` → List (paginated, `?page=` + `?limit=`, filter params)
  - `POST` → Create (JSON body, return 201)
  - `PUT` → Update (by `?id=` query param)
  - `DELETE` → Delete (by `?id=` query param)
- All user-owned data enforces ownership via `userId`
- Use `updateMany`/`deleteMany` with both `id` and `userId` for safety

## API Route Example
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    // ... handler logic
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
```

## Component Patterns
| Type | Usage | Declaration |
|------|-------|-------------|
| Server components | Landing page, root layout, data fetching | Default export, no directive |
| Client components (`"use client"`) | Dashboard pages, auth pages, interactive UI | First line of file, before imports or after comments |

### Client Component Guidelines
- Define **inline interfaces** for local component state/data (e.g., `interface Template { ... }`)
- Use explicit React event types: `FormEvent`, `React.KeyboardEvent<HTMLElement>`, `MouseEvent`
- Prefer `useRef<HTMLInputElement>(null)` over untyped refs
- Wrap fetch calls with `.catch(() => ({ data: [] }))` for resilience against missing API responses

## Error Handling
- Use `try/catch` in API handlers, casting `err as any` to access `.message`
- Always check `err instanceof Error` before accessing `.message` on client-side catch blocks
- Return typed error responses: `{ error: string }` with appropriate HTTP status codes
  - `400` → Missing/invalid params
  - `401` → Unauthorized (no valid token/key)
  - `404` → Resource not found
  - `409` → Conflict (duplicate record)
  - `429` → Rate limited
  - `500` → Internal server error

## Imports Order
1. Third-party imports (`react`, `next/server`, `crypto`)
2. Local lib imports (`@/lib/api-auth`, `@/lib/prisma`)
3. Relative imports for local files (`. AuthNavButtons`)
4. Static imports first, then dynamic `import()` when needed

## State Management
- Client components: prefer `useState` + `useEffect` over Redux/Zustand (current pattern)
- Use discriminated unions for UI state: `"idle" | "sending" | "success" | "error"`
- Derive computed values from state rather than duplicating in separate state variables
  - e.g., `const allFilled = currentVariables.every((v) => variableValues[v]?.trim())`

## Tailwind CSS v4 Conventions
- Use direct classes in JSX (no CSS modules or styled-components)
- Brand colors: `#075E54` (dark teal), `#25D366` (WhatsApp green), `#DCF8C6` (light green)
- Consistent border/radius/padding utilities:
  - Borders: `border-[#DCF8C6]`, focus: `focus:border-[#25D366]`
  - Radius: `rounded-xl` for cards/inputs, `rounded-lg` for buttons
  - Padding: `px-4 py-3` for inputs, `p-8` for cards
- Use utility-first classes over arbitrary values when practical
- Apply `focus:ring-2 focus:ring-[#25D366]/15` pattern consistently on interactive inputs

## Database Patterns (Prisma)
- All primary keys are **UUIDs** (`@default(uuid())`)
- All user-owned data includes `userId` foreign key with `onDelete: Cascade`
- Use `@default(now())` for creation timestamps, `@updatedAt` for updates
- JSON fields: use Prisma `Json` type (`ScheduledMessage.recipients`, `WebhookEvent.payload`, `Settings.enterpriseCustomSettings`)
- Array fields: use Prisma `String[]` (`ChatbotRule.keywords`, `Settings.adminNumbers`)
- Enum-like values stored as plain `String` (not native Prisma enums) with documented status values
- Tier/subscription stored in a separate `Subscription` model (`free` | `pro` | `enterprise`)
- Usage tracking via `UsageRecord` model with `@@unique([userId, type, periodKey])` composite key
- Password reset via `PasswordResetToken` model with expiry
- Product catalog via `Product` model for business messaging
- WhatsApp auth stored in `BaileysAuthCred` model (Prisma-based `SignalKeyStore`)

## WhatsApp Module Patterns
- `BaileysManager` is a **singleton class** keyed by `userId_deviceId`
- Connection lifecycle: `connect → QR/pairing code → open → message listening`
- Auth state stored in DB via `BaileysAuthCred` model (Prisma-based `SignalKeyStore`)
- Contacts populated via `contacts.upsert` event (in-memory cache)
- Reconnect with exponential backoff (max 5 retries)
- Event handlers update both in-memory state and database simultaneously
- Fire-and-forget pattern for non-blocking operations (e.g., `startConnect()`)

## Queue & Background Jobs
- BullMQ v5 for message broadcast queue (`wa-send` queue)
- Worker started in `instrumentation.ts` via `register()` hook
- Tier-based priority: enterprise > pro > free
- Tier-based concurrency: enterprise (10), pro (2), free (1)
- Per-conversation throttle via Redis (separate from usage limits)
- Deduplication via `dedupId` option (60s TTL)

## Usage Tracking & Limits
- `UsageRecord` model tracks daily and monthly counts per user
- `checkAndTrack()` / `checkLimit()` enforces tier limits before sending
- Limits defined in `limit-constants.ts`: daily (free: 50, pro: 200, enterprise: ∞), monthly (free: 500, pro: 5,000, enterprise: ∞)
- Safety monitoring via `safetyMonitor` tracks violations and quarantines devices

## Human-like Delay Engine
- `delay-engine.ts` implements typing delays (`calculateTypingDelay`), read delays, and jitter
- Configurable via `Settings` model: `msPerChar`, `readDelayMs`, `typingEnabled`
- Random presence updates (typing/paused) before sending messages

## Environment Variables
- All env vars defined in `.env.example` — keep them synced
- Runtime access via `process.env.VAR_NAME` (no config objects)
- Required: `DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`
- Also needed: `REDIS_URL` (BullMQ + rate limiting), SMTP vars for email, `NEXT_PUBLIC_APP_URL`

---

# Do's and Don'ts

## Do ✅
- Use `@/` alias for all project-internal imports
- Prefer `async/await` over `.then()` chains
- Define TypeScript interfaces/types at the top of files
- Wrap API response parsing in try/catch: `const data = await res.json().catch(() => ({}))`
- Use `Promise.all` for parallel database queries (list + count pattern)
- Add explicit status codes to responses: `NextResponse.json(data, { status: 201 })`
- Use optional chaining (`?.`) and nullish coalescing (`??`) liberally
- Document the purpose of every exported function and class

## Don't ❌
- Don't use `middleware.ts` — rename to `proxy.ts` (Next.js 16 convention)
- Don't add comments inline unless they clarify non-obvious logic (per project convention)
- Don't use `any` without justification — prefer unknown or specific types
- Don't mix server and client component concerns — keep data fetching in server components
- Don't forget to `await` params/searchParams in App Router pages
- Don't call `next lint` — use `npm run lint` (ESLint CLI directly)
- Don't forget to run `npx prisma generate` before `npm run build`
- Don't modify `lib/` files to import from `app/` — `lib/` is a leaf module
- Don't use deprecated `whatsapp-web.js` — use `BaileysManager` from `@/lib/whatsapp`
- Don't use deprecated patterns: `next/legacy/image`, `images.domains`, `unstable_` prefixed APIs
- Don't forget to run `npx prisma generate` before `npm run build`

---

# Commands Reference

| Command | Purpose |
|---------|----------|
| `npm run dev` | Start dev server (Turbopack, `.next/dev`) |
| `npm run build` | Production build (`prisma generate` runs automatically) |
| `npm start` | Start production server |
| `npm run lint` | Lint via ESLint CLI directly |
| `npx prisma generate` | Generate Prisma client (after schema changes) |
| `npx prisma migrate dev` | Create and apply migrations |
| `npx prisma studio` | Open database browser GUI |
| `npm run backfill:usage` | Backfill usage records for existing users |

---

# Skills

This project ships with markdown skills for specialized tasks. Load them with the skill tool:

| Skill | File | When to Use |
|-------|------|-------------|
| **API Routes** | `.opencode/skills/api-routes/SKILL.md` | Creating, modifying, or debugging API route handlers |
| **Database (Prisma)** | `.opencode/skills/database/SKILL.md` | Schema design, migrations, and Prisma query patterns |
| **Components & Pages** | `.opencode/skills/components-and-pages/SKILL.md` | Building React components, pages, and dashboard UI |
| **Authentication** | `.opencode/skills/authentication/SKILL.md` | JWT auth flow, API keys, cookie management, middleware/proxy |
| **WhatsApp Integration** | `.opencode/skills/whatsapp-integration/SKILL.md` | WhatsApp device lifecycle, messaging, webhooks, chatbot rules |

---

# Git Workflow

- Commit messages follow conventional format: `<type>(<scope>): <description>`
  - Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `style`
  - Example: `feat(messages): add media upload to send endpoint`
- Run `npm run lint` before committing to ensure code quality
- Push migrations after schema changes: `npx prisma migrate dev && npx prisma generate`
