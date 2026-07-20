# DemoKit Integration

This project uses [DemoKit](https://github.com/Kasava-AI/demokit) to create interactive product demos by intercepting API calls and returning mock data. No backend changes required.

## How DemoKit Works

1. `DemoKitProvider` wraps the app and patches `globalThis.fetch`
2. When demo mode is active (`?demo=true`), fetch calls are matched against fixture patterns
3. Matching requests return fixture data instead of hitting the network
4. Demo state persists in localStorage across page refreshes

## Package Selection

Install `@demokit-ai/core` and `@demokit-ai/react`. This works for any React app, including TanStack Query and SWR apps (standard network interception, no adapter needed) and Next.js apps that fetch client-side.

## Key Files

- `lib/fixtures.ts` — fixture definitions (mock data mapped to API patterns)
- `lib/demokit-config.ts` — DemoKit configuration (optional, for Cloud or advanced setup)
- `app/providers.tsx` — provider wrapper

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
import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '@/lib/fixtures'

<DemoKitProvider fixtures={fixtures}>
  <DemoModeBanner />
  <App />
</DemoKitProvider>
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
- [API Reference](https://demokit.dev/docs/api-reference/core)
