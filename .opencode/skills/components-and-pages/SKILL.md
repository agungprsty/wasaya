---
name: components-and-pages
description: Building React components, pages, and dashboard UI with TypeScript and Tailwind CSS v4
---

# Components & Pages Skill

## Overview
Build React components, pages, and dashboard UI using TypeScript, Tailwind CSS v4, and Next.js 16 App Router.

## Component Types

### Server Components (Default)
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = { ... };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
```

### Client Components (`"use client"` — Required)
```typescript
"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  return <div>Dashboard</div>;
}
```

## Component Patterns (Required)

### Client Component with State
```typescript
"use client";

interface Template { id: string; name: string; body: string; }
interface Contact { id: string; name: string; phone: string; }

export default function SendPage() {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setStatus("success");
    } catch (err) {
      setStatus("error");
    }
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Inline Interface Definition
Define interfaces inside the component file for local types.

### Typed React Events
```typescript
function handleKeyDown(e: React.KeyboardEvent) { ... }
function handleClick(e: MouseEvent) { ... }
async function handleSubmit(e: FormEvent) { ... }
```

### Typed Refs
```typescript
const fileRef = useRef<HTMLInputElement>(null);
const dropdownRef = useRef<HTMLDivElement>(null);
```

## Dashboard Page Structure
1. **First line**: `"use client";` (before imports or after comments)
2. **Interfaces**: Define local types at the top
3. **Hooks**: `useState`, `useEffect`, `useRef` organized by purpose
4. **Derived values**: Computed from state, not duplicated
5. **Event handlers**: Named consistently — `handleSubmit`, `handleSelect`
6. **Fetch logic**: Wrapped with `.catch(() => ({ data: [] }))`
7. **Return**: JSX using Tailwind CSS utility classes

## State Management

### Discriminated Union State
```typescript
const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
```

### Derived State (No Duplication)
```typescript
const allFilled = currentVariables.every((v) => variableValues[v]?.trim());
// Derive from existing state instead of creating new useState
```

### Fetch + State Pattern
```typescript
useEffect(() => {
  fetch("/api/templates")
    .then((r) => r.json().catch(() => ({ templates: [] })))
    .then((data) => setTemplates(data.templates || []));
}, []);
```

## Tailwind CSS v4 Conventions

### Brand Colors
- `#075E54` — Dark teal (headings, primary accents)
- `#25D366` — WhatsApp green (buttons, focus states, active items)
- `#DCF8C6` — Light green (borders, backgrounds, hover states)

### Consistent Spacing & Radius
| Element | Class Pattern |
|---------|-------------|
| Inputs | `rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-[#25D366]` |
| Buttons | `rounded-lg bg-[#25D366] text-white hover:bg-[#1DAF5A]` |
| Cards | `rounded-2xl border border-[#DCF8C6] p-8` |
| Focus ring | `focus:ring-2 focus:ring-[#25D366]/15` |

## Best Practices (Required)

### Do ✅
- Use `"use client";` as first line for client components
- Define inline interfaces for local component state/data
- Use discriminated unions for UI state
- Derive computed values from state instead of duplicating
- Wrap fetch calls with `.catch()` for resilience
- Use explicit React event types: `FormEvent`, `React.KeyboardEvent`
- Consistent use of brand colors in Tailwind classes

### Don't ❌
- Don't add data-fetching logic to client components unless interactive
- Don't mix server and client component concerns
- Don't forget `key` prop when rendering lists
- Don't use deprecated `next/legacy/image` — use `next/image`
