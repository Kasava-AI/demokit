# DemoKit Integration

This project uses [DemoKit](https://github.com/Kasava-AI/demokit) to create interactive product demos by intercepting API calls and returning mock data.

## Overview

DemoKit patches `globalThis.fetch` at the client level. When demo mode is active (via `?demo=true` URL parameter), fetch calls are matched against fixture patterns and return mock data instead of hitting the network. No backend changes are required.

## Setup

### Package Selection

Detect the framework from `package.json` and install the correct packages:

- **React**: `npm install @demokit-ai/core`
- **Next.js**: `npm install @demokit-ai/core @demokit-ai/next`
- **Remix**: `npm install @demokit-ai/core @demokit-ai/remix`
- **React Router v7**: `npm install @demokit-ai/core @demokit-ai/react-router`
- **TanStack Query**: `npm install @demokit-ai/core @demokit-ai/tanstack-query`
- **SWR**: `npm install @demokit-ai/core @demokit-ai/swr`
- **tRPC**: `npm install @demokit-ai/core @demokit-ai/trpc`

### Key Files

| File | Purpose |
|------|---------|
| `lib/fixtures.ts` | Fixture definitions — mock data mapped to API patterns |
| `app/providers.tsx` | Provider wrapper component (Next.js App Router) |
| `middleware.ts` | Next.js middleware for `?demo=true` URL param (Next.js only) |

### Fixture Format

Fixtures map HTTP method + URL pattern to response data:

```typescript
import type { FixtureMap } from '@demokit-ai/core'

export const fixtures: FixtureMap = {
  'GET /api/users': [{ id: '1', name: 'Alice' }],
  'GET /api/users/:id': ({ params }) => ({ id: params.id, name: `User ${params.id}` }),
  'POST /api/users': ({ body }) => ({ id: crypto.randomUUID(), ...body }),
  'GET /api/search': ({ searchParams }) => ({ query: searchParams.get('q'), results: [] }),
}
```

- `:param` — named URL parameter
- `*` — wildcard match
- Function fixtures receive `{ params, body, searchParams, session }`

### Provider Wrapping

**React:**
```tsx
import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/core/react'
<DemoKitProvider fixtures={fixtures}><DemoModeBanner /><App /></DemoKitProvider>
```

**Next.js:** Wrap with `DemoKitNextProvider` in a client component. Use `createDemoConfig()` for configuration. Add middleware for `?demo=true` handling.

## Data Generation Guidelines

When generating fixture data:
- Use realistic, domain-appropriate values — not "test", "foo", or "lorem ipsum"
- Maintain referential integrity (e.g., `order.user_id` references a real user fixture)
- Create at least 2 scenarios: `default` (happy path) and `empty-state`
- Include items in various states (pending, shipped, delivered, cancelled)
- Use UUIDs for IDs and realistic recent dates

## Scenarios

Named sets of fixtures for different demo states:

```typescript
export const scenarios = {
  default: defaultFixtures,
  'empty-state': emptyFixtures,
  'enterprise': enterpriseFixtures,
}
```

## Session State

Fixtures can read/write mutable state within a demo session:

```typescript
'POST /api/cart': ({ body, session }) => {
  const cart = session.get('cart') ?? []
  cart.push(body.item)
  session.set('cart', cart)
  return { items: cart }
}
```

## Reference

- Docs: https://demokit.dev/docs
- Examples: https://github.com/Kasava-AI/demokit/tree/main/examples
- API Reference: https://demokit.dev/docs/api-reference/core
