# DemoKit Integration

This project uses [DemoKit](https://github.com/Kasava-AI/demokit) to create interactive product demos by intercepting API calls and returning mock data. No backend changes required.

## How DemoKit Works

1. `DemoKitProvider` wraps the app and patches `globalThis.fetch`
2. When demo mode is active (`?demo=true`), fetch calls are matched against fixture patterns
3. Matching requests return fixture data instead of hitting the network
4. Demo state persists in localStorage across page refreshes

## Package Selection

Choose the right packages based on the framework in `package.json`:

| Framework       | Packages to install                              |
|-----------------|--------------------------------------------------|
| React (plain)   | `@demokit-ai/core`                               |
| Next.js         | `@demokit-ai/core @demokit-ai/next`               |
| Remix           | `@demokit-ai/core @demokit-ai/remix`               |
| React Router v7 | `@demokit-ai/core @demokit-ai/react-router`        |
| TanStack Query  | `@demokit-ai/core @demokit-ai/tanstack-query`      |
| SWR             | `@demokit-ai/core @demokit-ai/swr`                 |
| tRPC            | `@demokit-ai/core @demokit-ai/trpc`                |

## Key Files

- `lib/fixtures.ts` — fixture definitions (mock data mapped to API patterns)
- `lib/demokit-config.ts` — DemoKit configuration (optional, for Cloud or advanced setup)
- `app/providers.tsx` — provider wrapper (Next.js App Router pattern)
- `middleware.ts` — Next.js middleware for `?demo=true` handling (Next.js only)

## Fixture Format

```typescript
import type { FixtureMap } from '@demokit-ai/core'

export const fixtures: FixtureMap = {
  // Static response
  'GET /api/users': [{ id: '1', name: 'Alice' }],

  // Dynamic with URL params
  'GET /api/users/:id': ({ params }) => ({ id: params.id, name: `User ${params.id}` }),

  // POST with request body
  'POST /api/users': ({ body }) => ({ id: crypto.randomUUID(), ...body }),

  // Query parameters
  'GET /api/search': ({ searchParams }) => ({
    query: searchParams.get('q'),
    results: [],
  }),

  // Session state (mutable across requests)
  'POST /api/cart': ({ body, session }) => {
    const cart = session.get('cart') ?? []
    cart.push(body.item)
    session.set('cart', cart)
    return { items: cart }
  },
}
```

## Pattern Syntax

- `:param` — named parameter (`/users/:id` matches `/users/123`)
- `*` — wildcard (`/api/*` matches any path under `/api/`)
- Query params are accessible via `searchParams`

## Provider Setup

### React
```tsx
import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/core/react'
import { fixtures } from '@/lib/fixtures'

<DemoKitProvider fixtures={fixtures}>
  <DemoModeBanner />
  <App />
</DemoKitProvider>
```

### Next.js
```tsx
// app/providers.tsx — 'use client'
import { DemoKitNextProvider } from '@demokit-ai/next/client'
import { demoConfig } from '@/lib/demo'

export function Providers({ children }) {
  return <DemoKitNextProvider {...demoConfig}>{children}</DemoKitNextProvider>
}

// lib/demo.ts
import { createDemoConfig, defineFixtures } from '@demokit-ai/next'
export const demoConfig = createDemoConfig({ fixtures: defineFixtures({...}) })
```

## Scenarios

Create multiple named demo states:

```typescript
export const scenarios = {
  default: defaultFixtures,
  'empty-state': emptyFixtures,
  'enterprise-trial': enterpriseFixtures,
}
```

## Data Quality

When creating or modifying fixture data:
- Use realistic, domain-appropriate values (not "test" or "lorem ipsum")
- Maintain referential integrity between related entities
- Include items in various states (pending, active, completed, failed)
- Prefer UUIDs for IDs
- Keep dates realistic and recent

## Commands

```bash
# Activate demo mode in browser
# Visit any page with ?demo=true appended to the URL

# Or toggle programmatically
useDemoMode() → { isDemoMode, toggle, enable, disable }
```

## Reference

- [DemoKit docs](https://demokit.dev/docs)
- [Examples](https://github.com/Kasava-AI/demokit/tree/main/examples)
- [API Reference](https://demokit.dev/docs/api-reference/core)
