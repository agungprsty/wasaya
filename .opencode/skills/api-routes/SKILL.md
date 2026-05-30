---
name: api-routes
description: Creating, modifying, or debugging API route handlers in the app/api/ directory for Next.js 16
---

# API Routes Skill

## Overview
Create, modify, and debug RESTful API route handlers in `app/api/`.

## File Structure
- Each resource has its own directory: `app/api/{resource}/route.ts`
- Sub-resources get nested dirs: `app/api/auth/login/route.ts`
- Main handler exports `GET`, `POST`, `PUT`, `DELETE` async functions

## Handler Pattern (Required)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser(request);
  if (error) return error;

  try {
    const body = await request.json();
    // validate input before processing
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create" },
      { status: 400 }
    );
  }
}
```

## Query Params & Pagination
```typescript
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "20");
const filter = searchParams.get("status");
```

## Error Response Mapping
| Status | When | Example |
|--------|------|---------|
| `400` | Missing/invalid params | `{ error: "Recipient number is required" }` |
| `401` | Unauthorized | `{ error: "Unauthorized" }` |
| `404` | Resource not found | `{ error: "Template not found" }` |
| `409` | Conflict | `{ error: "Email already registered" }` |
| `429` | Rate limited | (handled by `lib/rate-limit.ts`) |
| `500` | Internal error | `{ error: err.message || "Internal error" }` |

## Common Library Imports
```typescript
import { validatePhone } from "@/lib/phone-utils";      // Phone validation
import { extractVariables, interpolate } from "@/lib/template-utils"; // Template vars
import { whatsappManager } from "@/lib/whatsapp";        // WhatsApp send/connect
import { rateLimit } from "@/lib/rate-limit";            // Rate limiting
import { checkAndTrack, checkLimit } from "@/lib/usage-tracker"; // Usage limits
import { getUserTier } from "@/lib/api-tier";            // Tier resolution
import { toJID } from "@/lib/whatsapp";                  // JID formatting
```

## Best Practices
1. **Always check `requireUser()` first** — return early if auth fails
2. **Use `Promise.all` for list + count** to reduce DB round trips
3. **Cast Prisma `where` with `as any`** when building dynamic filters
4. **Validate input** before processing (e.g., phone number validation with `validatePhone`)
5. **Wrap non-critical ops in `.catch(() => {})`** to prevent cascading failures
6. **Use explicit status codes**: `201` for create, `200` success, `202` queued
7. **Rate limiting**: call `rateLimit(userId, key, maxRequests, windowMs)` early
8. **Ownership enforcement**: filter by `userId`, use `updateMany`/`deleteMany`
9. **Usage limits**: call `checkAndTrack(userId, tier)` before sending messages
10. **JID conversion**: use `toJID()` to format phone numbers for WhatsApp

## Dynamic Where Clause
```typescript
const where: Record<string, string | undefined> = { userId: user!.userId };
if (status) where.status = status;
prisma.model.findMany({ where: where as any });
```

## Safe JSON Parsing
```typescript
const body = await request.json();
// or with fallback
const data = await res.json().catch(() => ({}));
```
