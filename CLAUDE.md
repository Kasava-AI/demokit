# DemoKit OSS

> **For Claude**: This is the open-source DemoKit SDK - a framework for turning real SaaS apps into interactive product demos by intercepting API calls and returning mock data.

## Quick Reference

### Project Type
Single npm package with subpath exports for framework adapters

### Key Commands
```bash
npm run build           # Build all entry points
npm run dev             # Watch mode
npm test                # Run all tests
npm run test:coverage   # Generate coverage reports
npm run typecheck       # Full TypeScript check
npm run clean           # Clean build artifacts
```

## Architecture Overview

```
demokit-oss/
├── src/
│   ├── index.ts              # Core exports (fetch interception, session, state)
│   ├── interceptor.ts        # Main fetch interception logic
│   ├── session.ts            # Demo session management
│   ├── state.ts              # State machine for scenarios
│   ├── matcher.ts            # URL pattern matching
│   ├── types.ts              # Shared types
│   ├── remote.ts             # Cloud fixture fetching
│   ├── services/
│   │   ├── schema/           # OpenAPI parsing
│   │   ├── codegen/          # Data generation
│   │   ├── ai/               # L3 AI generation (server-only)
│   │   └── auth/             # Auth abstraction (client-only)
│   └── adapters/
│       ├── react/            # React provider, hooks, components
│       ├── next/             # Next.js SSR adapter
│       ├── remix/            # Remix loader/action mocking
│       ├── react-router/     # React Router v7 adapter
│       ├── tanstack-query/   # TanStack Query integration
│       ├── swr/              # SWR integration
│       └── trpc/             # tRPC v11 type-safe adapter
├── examples/                 # Working example apps
└── docs/                     # Mintlify documentation
```

## Subpath Exports

All functionality is available via subpath imports from `@demokit-ai/core`:

| Import Path | Description |
|-------------|-------------|
| `@demokit-ai/core` | Core fetch interception, session, state |
| `@demokit-ai/core/react` | React provider, hooks, components |
| `@demokit-ai/core/next` | Next.js config |
| `@demokit-ai/core/next/client` | Next.js client components |
| `@demokit-ai/core/next/server` | Next.js server utilities |
| `@demokit-ai/core/next/middleware` | Next.js middleware |
| `@demokit-ai/core/remix` | Remix integration |
| `@demokit-ai/core/remix/server` | Remix server utilities |
| `@demokit-ai/core/react-router` | React Router v7 adapter |
| `@demokit-ai/core/tanstack-query` | TanStack Query integration |
| `@demokit-ai/core/swr` | SWR integration |
| `@demokit-ai/core/trpc` | tRPC integration |
| `@demokit-ai/core/trpc/react` | tRPC React hooks |
| `@demokit-ai/core/ai` | AI generation (server-only) |
| `@demokit-ai/core/auth` | Auth abstraction (client-only) |

## Core Concepts

### How It Works
1. **Fetch Interception**: Patches `globalThis.fetch` at the client level
2. **Pattern Matching**: Matches requests against fixture patterns (`:param`, `*` wildcards)
3. **Mock Response**: Returns fixture data instead of hitting the network
4. **State Persistence**: Demo mode state stored in localStorage/sessionStorage

### Data Generation Levels
| Level | Description | AI Required |
|-------|-------------|-------------|
| L1: schema-valid | Data matches types only | No |
| L2: relationship-valid | Foreign keys are valid | No |
| L3: narrative-driven | AI-powered storytelling | Yes (Cloud) |

## Key Files

### Core
- `src/index.ts` - Main exports
- `src/interceptor.ts` - Fetch interception logic
- `src/session.ts` - Session management
- `src/state.ts` - State machine
- `src/matcher.ts` - URL pattern matching

### React Adapter
- `src/adapters/react/provider.tsx` - DemoKitProvider context
- `src/adapters/react/hooks.ts` - useDemoMode, useDemoState hooks
- `src/adapters/react/banner.tsx` - DemoModeBanner component

### Services
- `src/services/codegen/` - Demo data generation
- `src/services/schema/` - OpenAPI parsing
- `src/services/ai/` - L3 AI generation (server-only)
- `src/services/auth/` - Auth abstraction (client-only)

## Common Patterns

### Adding a Fixture
```typescript
const fixtures = {
  'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
  'GET /api/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
  'POST /api/users': ({ body }) => ({ id: 'new-1', ...body }),
}
```

### URL Pattern Syntax
- `:param` - Named parameter (e.g., `/users/:id`)
- `*` - Wildcard match (e.g., `/api/*`)
- Query params - Match specific query strings

### Session Storage Options
- `localStorage` - Persists across browser sessions
- `sessionStorage` - Clears when tab closes
- `memory` - In-memory only (SSR safe)
- Custom adapter - Implement `StorageAdapter` interface

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

## Build System

- **Build Tool**: tsup (fast ES module bundling)
- **Test Runner**: vitest v2.1.8
- **TypeScript**: v5.7.2 with strict mode

## Related Projects

- **DemoKit Cloud**: Commercial AI-powered extension at `../demokit-cloud/`
  - Adds L3 narrative-driven generation
  - Dashboard for fixture management
  - Billing and team collaboration

## Development Tips

1. **Core changes affect everything**: Changes to core code affect all adapters
2. **Test in examples**: Use example apps to verify changes
3. **Keep SSR-safe**: All code should work server-side
4. **Minimize bundle size**: Keep dependencies minimal
5. **TypeScript first**: Full type safety required
6. **Subpath separation**: ai (server-only) and auth (client-only) must stay isolated
