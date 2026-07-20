# DemoKit OSS

> **For Claude**: This is the open-source DemoKit SDK - a framework for turning real SaaS apps into interactive product demos by intercepting API calls and returning mock data.

## Quick Reference

### Project Type

pnpm monorepo with multiple npm packages

### Key Commands

```bash
pnpm install            # Install dependencies
pnpm build              # Build all packages
pnpm dev                # Watch mode for all packages
pnpm test               # Run all tests
pnpm test:coverage      # Generate coverage reports
pnpm typecheck          # Full TypeScript check
pnpm clean              # Clean build artifacts
```

## Architecture Overview

```text
demokit-oss/
├── packages/
│   ├── core/                 # Core fetch interception
│   │   └── src/
│   │       ├── index.ts      # Main exports
│   │       ├── interceptor.ts # Fetch interception logic
│   │       ├── session.ts    # Session management
│   │       ├── state.ts      # State machine
│   │       ├── matcher.ts    # URL pattern matching
│   │       ├── remote.ts     # Cloud fixture fetching
│   │       ├── storage.ts    # Storage adapters
│   │       ├── types.ts      # Shared types
│   │       └── services/     # Service modules
│   ├── react/                # React provider, hooks, components
│   ├── ai/                   # AI generation (server-only)
│   ├── db/                   # Database utilities
│   └── intelligence/         # App intelligence synthesis
├── apps/                     # Example/playground apps
├── docs/                     # Mintlify documentation
├── scripts/                  # Build and utility scripts
├── package.json              # Workspace root
├── pnpm-workspace.yaml       # pnpm workspace config
└── tsconfig.base.json        # Shared TypeScript config
```

## Published Packages

All packages are published under the `@demokit-ai` scope:

| Package | Description |
| ------- | ----------- |
| `@demokit-ai/core` | Core fetch interception, session, state |
| `@demokit-ai/react` | React provider, hooks, components |
| `@demokit-ai/ai` | AI generation (server-only) |
| `@demokit-ai/db` | Database utilities |
| `@demokit-ai/intelligence` | App intelligence |

## Core Concepts

### How It Works

1. **Fetch Interception**: Patches `globalThis.fetch` at the client level
2. **Pattern Matching**: Matches requests against fixture patterns (`:param`, `*` wildcards)
3. **Mock Response**: Returns fixture data instead of hitting the network
4. **State Persistence**: Demo mode state stored in localStorage/sessionStorage

### Data Generation Levels

| Level | Description | AI Required |
| ----- | ----------- | ----------- |
| L1: schema-valid | Data matches types only | No |
| L2: relationship-valid | Foreign keys are valid | No |
| L3: narrative-driven | AI-powered storytelling | Yes (Cloud) |

## Key Packages

### @demokit-ai/core

Core fetch interception, session management, and state machine.

- `interceptor.ts` - Main fetch interception logic
- `session.ts` - Demo session management
- `state.ts` - State machine for scenarios
- `matcher.ts` - URL pattern matching
- `remote.ts` - Cloud fixture fetching

### @demokit-ai/react

React provider, hooks, and components.

- `DemoKitProvider` - Context provider
- `useDemoMode` - Hook for demo mode state
- `useDemoState` - Hook for scenario state
- `DemoModeBanner` - Visual indicator component

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
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test:coverage
```

## Build System

- **Build Tool**: tsup (fast ES module bundling)
- **Test Runner**: vitest
- **TypeScript**: Strict mode enabled
- **Monorepo**: pnpm workspaces

## Development Tips

1. **Core changes affect everything**: Changes to core package affect all adapters
2. **Test in examples**: Use example apps to verify changes
3. **Keep SSR-safe**: All code should work server-side
4. **Minimize bundle size**: Keep dependencies minimal
5. **TypeScript first**: Full type safety required

## Related Projects

- **DemoKit Cloud**: Commercial AI-powered extension at `../demokit/apps/cloud/`
  - Adds L3 narrative-driven generation
  - Dashboard for fixture management
  - Billing and team collaboration
