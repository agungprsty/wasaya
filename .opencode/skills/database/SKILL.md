---
name: database
description: Schema design, migrations, and Prisma query patterns for PostgreSQL
---

# Database (Prisma) Skill

## Overview
Prisma schema design, migrations, and query patterns for PostgreSQL database.

## Schema Conventions

### Model Structure (Required)
```prisma
model Contact {
  id        String   @id @default(uuid())
  userId    String
  name      String
  phone     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Rules
- **All primary keys are UUIDs** — `@id @default(uuid())`
- **User ownership** — every resource has `userId` FK with `onDelete: Cascade`
- **Timestamps** — `@default(now())` for `createdAt`, `@updatedAt` for `updatedAt`
- **Nullable fields** — use `String?` (not `String | null` in schema)
- **Enum-like values** — stored as plain `String` with documented status values
- **JSON fields** — use Prisma `Json` type (`ScheduledMessage.recipients`, `WebhookEvent.payload`, `Settings.enterpriseCustomSettings`)
- **Array fields** — use Prisma `String[]` (`ChatbotRule.keywords`, `Settings.adminNumbers`)

### Model Reference
Current models in `prisma/schema.prisma` (17 models):
- `User`, `ApiKey`, `Contact`, `Group`, `ContactGroup`, `WhatsAppMessage`, `Settings`, `Subscription`, `AutoReplyLog`, `WhatsAppSession`, `MessageTemplate`, `ScheduledMessage`, `ChatbotRule`, `Product`, `UsageRecord`, `PasswordResetToken`, `BaileysAuthCred`, `WebhookEvent`

### Unique Constraints
- `@@unique([userId, type, periodKey])` on `UsageRecord` for composite daily/monthly tracking
- `@@unique([userId, deviceId])` on `WhatsAppSession` for per-user device uniqueness
- `@@unique([userId, deviceId, category, keyId])` on `BaileysAuthCred` for WhatsApp signal keys

## Migrations
```bash
# After schema changes:
npx prisma migrate dev           # Create and apply migration
npx prisma generate              # Regenerate client (required before npm run build)
```

### Best Practices
1. **Name migrations descriptively**: `add_user_id_to_messages`
2. **Always run `prisma generate`** after schema changes, especially before build
3. **Never edit migration files manually** — use `prisma format` if needed
4. **Keep migrations in version control**
5. **After schema changes**: also check `instrumentation.ts` and `lib/` modules for impacted queries

## Query Patterns

### Paginated List (Parallel Query)
```typescript
const [items, total] = await Promise.all([
  prisma.model.findMany({
    where: { userId: user!.userId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.model.count({ where: { userId: user!.userId } }),
]);
```

### Find One by ID
```typescript
const item = await prisma.model.findFirst({
  where: { id, userId: user!.userId },
});
if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
```

### Create with Data
```typescript
const item = await prisma.model.create({
  data: { name: body.name, userId: user!.userId },
});
```

### Update (Ownership-Enforced)
```typescript
const item = await prisma.model.updateMany({
  where: { id, userId: user!.userId },
  data: { name: body.name },
});
if (item.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
```

### Delete (Ownership-Enforced)
```typescript
const result = await prisma.model.deleteMany({
  where: { id, userId: user!.userId },
});
if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
```

### Upsert
```typescript
const settings = await prisma.settings.upsert({
  where: { userId },
  update: { webhookUrl: newUrl },
  create: { userId, webhookUrl: newUrl },
});
```

## Performance Tips
1. **Use `select`** to fetch only needed fields
2. **Batch with `Promise.all`** — list + count pattern is standard
3. **Index frequently filtered fields** in migrations (e.g., `userId`, `status`)
4. **Avoid N+1** — use `include` for nested relations
