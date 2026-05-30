---
name: authentication
description: JWT auth flow, API keys, cookie management, and proxy configuration
---

# Authentication Skill

## Overview
JWT authentication flow, API key management, cookie handling, and proxy configuration.

## Auth Strategy
- **Primary**: JWT stored in `httpOnly` cookie named `token`
- **Fallback**: API Key via `Authorization: Bearer <key>` header
- **Hashing**: bcrypt with 12 salt rounds

## Cookie Specification
| Property | Value |
|----------|-------|
| Name | `token` |
| Type | httpOnly |
| Secure | true (production) |
| SameSite | lax |
| Expiry | 7 days |

## Core Functions (`lib/auth.ts`)

### Token Operations
```typescript
signToken({ userId, email })        // → string
verifyToken(token)                  // → { userId, email } | null
getTokenFromCookies(request)        // → string | null
setTokenCookie(response, token)     // → void
clearTokenCookie(response)          // → void
```

### Password Operations
```typescript
hashPassword(password)              // → string (bcrypt hash)
verifyPassword(password, hash)      // → boolean
```

## API Auth Middleware (`lib/api-auth.ts`)

### `requireUser(request)` — Required Guard
Checks JWT cookie first, then falls back to API Key:
1. Extracts token from `token` cookie via `getTokenFromCookies()` + `verifyToken()`
2. If no valid JWT, checks `Authorization: Bearer <key>` header
3. Looks up `ApiKey` record, updates `lastUsedAt` (fire-and-forget with `.catch(() => {})`)
4. Returns `{ error: null, user }` or `{ error: Response, user: null }`

```typescript
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error; // Returns the Response directly
}
```

## Auth Endpoints

### `/api/auth/register` (POST)
- Body: `{ name, email, password }`
- Validates email uniqueness (409 if duplicate)
- Hashes password with bcrypt (12 rounds), signs JWT, sets cookie
- Returns: `201 Created`

### `/api/auth/login` (POST)
- Body: `{ email, password }`
- Verifies credentials with bcrypt, signs JWT, sets cookie
- Returns: `200 OK`

### `/api/auth/me` (GET)
- Extracts JWT from cookie (or API key)
- Returns: `{ user: { id, name, email, avatar } }` — 200 or 401

### `/api/auth/logout` (POST)
- Clears the `token` cookie
- Returns: `200 OK`

### `/api/auth/forgot-password` (POST)
- Body: `{ email }`
- Sends password reset email via nodemailer (from `lib/email.ts`)
- Creates `PasswordResetToken` in DB with expiry
- Returns: `200 { message: "If email exists, reset link sent" }`

### `/api/auth/reset-password` (POST)
- Body: `{ token, password }`
- Validates token from `PasswordResetToken` (checks expiry, not used)
- Hashes new password, updates User, marks token as used
- Returns: `200 { message: "Password reset successful" }`

## Protected Routes Pattern
```typescript
export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;
  // Use user!.userId for queries
  const items = await prisma.model.findMany({ where: { userId: user!.userId } });
  return NextResponse.json({ data: items });
}
```

## API Key Management
- Each user can have multiple API keys in `ApiKey` model
- Keys stored with `userId`, `name`, and `key` fields
- `lastUsedAt` tracks usage (updated on each `requireUser()` call)

## Environment Variables
| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for JWT sign/verify (change in production) |
| `CRON_SECRET` | Secret for cron job authentication |
| `SMTP_HOST` | SMTP server for password reset emails |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address for emails |

## Best Practices (Required)

### Do ✅
- Use `requireUser()` as first line in protected API routes
- Check `error` before accessing `user!.userId`
- Cast errors: `catch (err: any)` when accessing `.message`
- Update `lastUsedAt` with `.catch(() => {})` for non-blocking API key usage
- Enforce `userId` ownership in all queries

### Don't ❌
- Don't use `middleware.ts` — rename to `proxy.ts` (Next.js 16 convention)
- Don't forget httpOnly, secure, and sameSite: "lax" on cookies
- Don't mix JWT and API key logic — `requireUser()` handles priority order
