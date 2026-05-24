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
- `next lint` removed; use ESLint CLI directly

## Build & Dev
- Turbopack is default (`--turbopack` not needed); use `--webpack` for Webpack
- Concurrent dev/build output dirs: `.next/dev` (dev) and `.next` (build)
- React Compiler via `reactCompiler: true` (top-level, not `experimental.reactCompiler`)
<!-- END:nextjs-agent-rules -->

---

# Project Conventions

## Stack
- **Framework**: Next.js 16.2.6 (App Router, Turbopack)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (httpOnly cookies), bcryptjs
- **WhatsApp**: whatsapp-web.js (Puppeteer)
- **Styling**: Tailwind CSS v4
- **Package manager**: npm

## Auth
- Login/Register via `/api/auth/*`, JWT stored in `httpOnly` cookie named `token`
- Protected API routes use `requireUser()` from `lib/api-auth.ts`
- Dashboard pages redirect to `/login` if unauthenticated

## Prisma
- Run `npx prisma migrate dev` after schema changes
- Always run `npx prisma generate` before `npm run build`
- Prisma client is in `lib/prisma.ts` (singleton pattern)

## WhatsApp
- Connection managed via `lib/whatsapp.ts` (singleton `WhatsAppManager`)
- `startConnect()` is fire-and-forget; poll `/api/whatsapp/status` for updates
- Session data stored in `wa_sessions/` directory and `WhatsAppSession` table
- Puppeteer runs headless with `--no-sandbox` flag
