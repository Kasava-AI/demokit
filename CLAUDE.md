# DemoKit OSS

> **For Claude**: This is the open-source DemoKit SDK - a framework for turning real SaaS apps into interactive product demos by intercepting API calls and returning mock data.
>
> **UI work: two rule sets, and they are opposites.** [apps/dashboard/](apps/dashboard/) is a normal token-locked Next app. [packages/react/](packages/react/) renders inside **other people's apps** and follows guest rules. See § Design skills below before touching either.

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

1. **Core changes affect everything**: Changes to core package affect the React SDK, CLI, and dashboard
2. **Test at the seams**: Run package unit tests (`CI=true pnpm test`) and verify in the dashboard app
3. **Keep SSR-safe**: All code should work server-side
4. **Minimize bundle size**: Keep dependencies minimal
5. **TypeScript first**: Full type safety required

## Design skills — what to use, where and when

Order: **structure → specifics → motion**. `hallmark` before any layout code (new surface, redesign, or auditing UI you didn't write) → `impeccable critique` → fix → `impeccable polish` once it's functional → `emil-design-eng` last, for motion. `impeccable audit` on inherited UI and before review. Neither hallmark nor emil is installed here: `npx skills add nutlope/hallmark`, `npx skills add emilkowalski/skills --skill emil-design-eng`.

### `apps/dashboard/` — normal token-locked app rules

- **The theme is already chosen.** The tokens in [apps/dashboard/src/app/globals.css](apps/dashboard/src/app/globals.css) *are* the theme. Skills contribute structure, hierarchy, spacing rhythm, motion, and their quality gates — never a palette, a `font-family`, or an inline hex/OKLCH. Hallmark's 22-theme catalog and `impeccable colorize` are off.
- **This app is on `framer-motion`.** Never add `motion` alongside it — same library, two package names, and having both ships two `AnimatePresence` contexts that can't coordinate exits.
- **Quiet wins.** `impeccable distill` / `quieter` / `normalize` are the aligned passes; `bolder` and `delight` belong to the marketing site.

### `packages/react/` — guest rules, which invert the above

`banner`, `toggle`, `powered-by`, and `mutation-toast` render inside **someone else's application**. Every one of them styles itself with inline `style` objects plus a `demokit-*` className hook, and accepts `className` / `style` overrides.

- **That is the design, not technical debt.** A Tailwind class or a `var(--token)` would resolve against the *consumer's* stylesheet, or not at all. Any skill that proposes Tailwind, a global stylesheet, or a design-token system in this package is wrong. Keep the inline-style pattern.
- **Hard-coded values are correct here.** There is no token to reference. The "no inline hex" rule that governs the dashboard does not apply.
- **Assume a hostile CSS environment** — global resets, aggressive `z-index`, `!important`, transitions on `*`. Set what you depend on explicitly rather than inheriting it.
- **Bundle size is a design constraint.** Development Tip #4 above outranks any skill's component cookbook: don't pull in an animation library, an icon set, or a headless-UI dependency for a banner.
- **Keep it SSR-safe** (Tip #3). Skills reach for `window` and `matchMedia` freely; guard them.

### Never, in either place

`redesign-existing-projects` (opens by replacing the font and collapsing the palette), `brandkit` (designs a brand that already exists), `design-taste-frontend` and `imagegen-frontend-web` (marketing-site skills — their vocabulary is hero, CTA, and landing section, and there's no target here).

Repo-wide routing, plus the rules for DemoKit Cloud and the marketing site, is in the monorepo root's `CLAUDE.md` — one directory up, outside this git repo.

## Related Projects

- **DemoKit Cloud**: Commercial AI-powered extension at `../demokit/apps/cloud/`
  - Adds L3 narrative-driven generation
  - Dashboard for fixture management
  - Billing and team collaboration
