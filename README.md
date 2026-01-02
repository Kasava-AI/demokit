<p align="center">
  <img src="https://github.com/user-attachments/assets/fd0e4c2d-3678-4f28-a7d6-d8906ee1f101#gh-light-mode-only" alt="DemoKit" width="300">
  <img src="https://github.com/user-attachments/assets/9ad645cd-f5db-4b50-a6dd-0376c3068f57#gh-dark-mode-only" alt="DemoKit" width="300">
</p>

<p align="center">
  <strong>Turn your real app into an interactive demo</strong>
</p>

<p align="center">
  <a href="https://github.com/Kasava-AI/demokit/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Kasava-AI/demokit/ci.yml?branch=main&label=CI&logo=github" alt="CI"></a>
  <a href="https://codecov.io/gh/Kasava-AI/demokit"><img src="https://img.shields.io/codecov/c/github/Kasava-AI/demokit?logo=codecov" alt="Coverage"></a>
  <a href="https://www.npmjs.com/package/@demokit-ai/core"><img src="https://img.shields.io/npm/v/@demokit-ai/core?logo=npm" alt="npm version"></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache 2.0"></a>
</p>

<p align="center">
  <a href="https://demokit.dev/docs">Documentation</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#examples">Examples</a> |
  <a href="https://discord.gg/demokit">Discord</a>
</p>

---

DemoKit is an open-source SDK that lets SaaS companies create interactive product demos by intercepting API calls and returning mock data. No backend changes required.

- [x] **Zero Backend Changes** - Intercepts fetch calls at the client level
- [x] **Framework Adapters** - React, Next.js, Remix, React Router, TanStack Query, SWR, tRPC
- [x] **AI-Powered Generation** - Generate realistic demo data with your own API keys (BYOK)
- [x] **URL Pattern Matching** - Flexible route matching with `:params` and `*` wildcards
- [x] **Session Persistence** - Demo mode survives page refreshes
- [x] **Self-Hostable Dashboard** - Full web UI for managing fixtures

**Created by [Kasava](https://kasava.dev)** - AI-powered development platform for GitHub integration, semantic code analysis, and intelligent development workflows.

---

## Why DemoKit?

### The Problem: Demos That Don't Feel Real

Every SaaS company needs product demos. Sales teams demo to prospects. Marketing embeds them on landing pages. Documentation shows features in action. Onboarding guides new users through workflows.

But current solutions create a painful tradeoff:

| Approach                          | Feels Real?                       | Maintainable?                       | Cost      |
| --------------------------------- | --------------------------------- | ----------------------------------- | --------- |
| **Screenshots & videos**          | No - static, quickly outdated     | No - remake on every UI change      | Low       |
| **Demo tools** (Navattic, Walnut) | Partial - overlays on screenshots | Partial - still breaks on changes   | $$$$      |
| **Staging environments**          | Yes - it's your real app          | No - data gets stale, security risk | High      |
| **Manual mocking**                | Yes - your real UI                | No - engineering time sink          | Very High |

The core issue: **demos that feel real are expensive to create and impossible to maintain.**

### Why Feeling Real Matters

Prospects can tell when they're looking at a screenshot with hotspots versus actually clicking through your product. The difference in conversion is measurable:

- **Interactive demos convert 2-3x better** than static content
- **Self-serve demos reduce sales cycles** by letting prospects explore on their own time
- **Real UI builds trust** - prospects see exactly what they're buying

But the engineering cost of maintaining demo environments kills most teams' ambitions. Every feature change means updating fixtures. Every schema migration breaks the demo. Engineers end up spending 10-20% of their time on demo infrastructure.

### The LLM Opportunity

This is where AI changes everything.

The hard part of demo data isn't the plumbing - it's creating **realistic, coherent data that tells a story**. An e-commerce demo needs:

- Products that make sense together
- A customer with a believable purchase history
- Orders in various states (pending, shipped, delivered, returned)
- Edge cases that showcase your features

Manually crafting this takes days. LLMs can generate it in seconds.

DemoKit combines **simple fetch interception** (the plumbing) with **AI-powered data generation** (the hard part):

```typescript
// The plumbing: intercept API calls
<DemoKitProvider fixtures={fixtures}>
  <YourApp />
</DemoKitProvider>;

// The magic: AI generates realistic demo data
const fixtures = await generateNarrativeData({
  schema: yourOpenAPISpec,
  narrative: {
    scenario: "Power user upgrading to enterprise",
    highlights: ["Team collaboration", "Advanced analytics", "SSO setup"],
  },
});
```

Your real app. AI-generated data that tells a story. Zero backend changes. Demos that update automatically when your product does.

---

## Quick Start

Try DemoKit instantly by running one of the examples:

```bash
git clone https://github.com/Kasava-AI/demokit.git
cd demokit/examples/nextjs-ecommerce
npm install
npm run dev
```

Visit <http://localhost:3000?demo=true> to see demo mode in action.

See the [Examples](#examples) section below for all available examples (Next.js, TanStack Query, SWR, Remix, React Router, tRPC).

### Add to an existing project

```bash
npm install @demokit-ai/core
```

```tsx
import {
  DemoKitProvider,
  DemoModeBanner,
  useDemoMode,
} from "@demokit-ai/core/react";

const fixtures = {
  "GET /api/users": () => [{ id: "1", name: "Demo User" }],
  "GET /api/users/:id": ({ params }) => ({ id: params.id, name: "Demo User" }),
};

function App() {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <DemoModeBanner />
      <YourApp />
    </DemoKitProvider>
  );
}
```

Access at <http://localhost:3000?demo=true>

---

## Examples

Learn by example with complete demo applications:

| Example                                                         | Framework       | Description                                        |
| --------------------------------------------------------------- | --------------- | -------------------------------------------------- |
| [nextjs-ecommerce](./examples/nextjs-ecommerce)                 | Next.js 15      | Full e-commerce with cart, checkout, order history |
| [tanstack-query-ecommerce](./examples/tanstack-query-ecommerce) | TanStack Query  | Data fetching integration                          |
| [swr-ecommerce](./examples/swr-ecommerce)                       | SWR             | SWR integration                                    |
| [remix-ecommerce](./examples/remix-ecommerce)                   | Remix           | Loader/action mocking                              |
| [react-router-ecommerce](./examples/react-router-ecommerce)     | React Router v7 | React Router data patterns                         |
| [trpc-ecommerce](./examples/trpc-ecommerce)                     | tRPC            | Type-safe API mocking                              |

Each example includes demo mode toggle, multiple scenarios, and full TypeScript support.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Your React App                          │
│                                                             │
│   fetch('/api/users')  ──►  DemoKit Interceptor             │
│                                    │                        │
│                         ┌──────────┴──────────┐             │
│                         │                     │             │
│                    Demo Mode ON          Demo Mode OFF      │
│                         │                     │             │
│                    Return fixture       Real API call       │
└─────────────────────────────────────────────────────────────┘
```

1. **Fetch Interception**: Patches `globalThis.fetch` to intercept outgoing requests
2. **Pattern Matching**: Matches requests against your fixture patterns
3. **Mock Response**: Returns fixture data instead of hitting the network
4. **State Persistence**: Demo mode state stored in localStorage

---

## Key Capabilities

### Framework Adapters

First-class support for popular frameworks:

| Adapter         | Import                            |
| --------------- | --------------------------------- |
| React           | `@demokit-ai/core/react`          |
| Next.js         | `@demokit-ai/core/next`           |
| Remix           | `@demokit-ai/core/remix`          |
| React Router v7 | `@demokit-ai/core/react-router`   |
| TanStack Query  | `@demokit-ai/core/tanstack-query` |
| SWR             | `@demokit-ai/core/swr`            |
| tRPC            | `@demokit-ai/core/trpc`           |

### AI-Powered Data Generation (BYOK)

Generate realistic demo data with your own API keys:

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxx   # Required for AI generation
```

```typescript
import { generateNarrativeData } from "@demokit-ai/core/ai";

const data = await generateNarrativeData({
  schema,
  narrative: {
    scenario: "E-commerce holiday rush",
    keyPoints: ["High volume sales", "One delayed order"],
  },
});
```

### Data Generation Levels

| Level                      | Description             | AI Required |
| -------------------------- | ----------------------- | ----------- |
| **L1: Schema-valid**       | Data matches types only | No          |
| **L2: Relationship-valid** | Foreign keys are valid  | No          |
| **L3: Narrative-driven**   | AI-powered storytelling | Yes (BYOK)  |

---

## Self-Hosting

DemoKit includes a full web dashboard for fixture management:

```bash
git clone https://github.com/Kasava-AI/demokit.git
cd demokit
pnpm install
cp .env.example .env  # Configure your settings
docker compose up -d  # Start PostgreSQL
pnpm db:migrate
pnpm dev
```

Access the dashboard at <http://localhost:3000>

---

## Resources

- [Documentation](https://demokit.dev/docs) - Full guides and API reference
- [Getting Started](https://demokit.dev/docs/getting-started) - First steps
- [React Integration](https://demokit.dev/docs/react) - React-specific guide
- [Next.js Integration](https://demokit.dev/docs/nextjs) - Next.js App Router guide
- [API Reference](https://demokit.dev/docs/api) - Complete API docs
- [Example Workflows](https://demokit.dev/workflows) - Common patterns

---

## DemoKit Cloud

For teams who prefer managed infrastructure, [DemoKit Cloud](https://demokit.dev/cloud) offers:

- **Managed AI** - No API key management needed
- **Team collaboration** - Share and version configurations
- **Visual dashboard** - Manage fixtures without code
- **Usage analytics** - Track demo engagement
- **Demo composition** - Combine features, journeys, and scenarios

---

## Contributing

Found a bug or have a feature idea? Check our [Contributing Guide](CONTRIBUTING.md) to get started.

```bash
pnpm install       # Install dependencies
pnpm test          # Run tests
pnpm build         # Build packages
pnpm typecheck     # Type check
```

---

## License

DemoKit is **Apache 2.0 licensed**

See [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with care by <a href="https://kasava.dev">Kasava</a></sub>
</p>
