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
  <a href="https://discord.gg/demokit">Discord</a>
</p>

---

DemoKit is an open-source SDK that lets SaaS companies create interactive product demos by intercepting API calls and returning mock data. No backend changes required.

- [x] **Zero Backend Changes**: intercepts fetch calls at the client level
- [x] **Framework Support**: TanStack Query and SWR apps work through standard network interception — no adapter needed. Next.js apps that fetch client-side can use `@demokit-ai/react` directly.
- [x] **LLM Fixture Generation**: generate realistic demo data with your own API keys (BYOK)
- [x] **URL Pattern Matching**: flexible route matching with `:params` and `*` wildcards
- [x] **Session Persistence**: demo mode survives page refreshes
- [x] **Self-Hostable Dashboard**: full web UI for managing fixtures

**Created by [Kasava](https://kasava.dev)**, the team building developer tools that read your repo.

---

## Why DemoKit?

### The Problem: Demos That Don't Feel Real

Every SaaS company needs product demos. Sales teams demo to prospects. Marketing embeds them on landing pages. Documentation shows features in action. Onboarding guides new users through workflows.

But every approach has a painful tradeoff:

| Approach                          | Feels Real?                       | Maintainable?                       | Cost      |
| --------------------------------- | --------------------------------- | ----------------------------------- | --------- |
| **Screenshots & videos**          | No, static and quickly outdated   | No, remake on every UI change       | Low       |
| **Demo tools** (Navattic, Walnut) | Partial, overlays on screenshots  | Partial, still breaks on changes    | $$$$      |
| **Staging environments**          | Yes, it's your real app           | No, data gets stale; security risk  | High      |
| **Manual mocking**                | Yes, your real UI                 | No, engineering time sink           | Very High |

The core issue: **demos that feel real are expensive to create and impossible to maintain.**

### Why Feeling Real Matters

Prospects can tell when they're looking at a screenshot with hotspots versus actually clicking through your product. The difference in conversion is measurable:

- **Interactive demos convert 2-3x better** than static content
- **Self-serve demos reduce sales cycles** by letting prospects explore on their own time
- **Real UI builds trust**; prospects see exactly what they're buying

But the engineering cost of maintaining demo environments kills most teams' ambitions. Every feature change means updating fixtures. Every schema migration breaks the demo. Engineers end up spending 10-20% of their time on demo infrastructure.

### The LLM Opportunity

The hard part of demo data isn't the plumbing; it's creating **realistic, coherent data that tells a story**. An e-commerce demo needs:

- Products that make sense together
- A customer with a believable purchase history
- Orders in various states (pending, shipped, delivered, returned)
- Edge cases that showcase your features

Manually crafting this takes days. LLMs can generate it in seconds.

DemoKit combines **simple fetch interception** (the plumbing) with **LLM-generated fixture data** (the hard part):

```typescript
// The plumbing: intercept API calls
<DemoKitProvider fixtures={fixtures}>
  <YourApp />
</DemoKitProvider>;

// LLMs generate fixture data that fits the narrative
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

### Set up with AI

The fastest way to add DemoKit is to paste this prompt into your AI coding tool (Claude Code, Cursor, Codex, Copilot, etc.):

> **Add DemoKit to this project.** Analyze my codebase to find my API routes and fetch calls, install `@demokit-ai/core` and `@demokit-ai/react`, generate realistic fixture data for each endpoint, and wire up `DemoKitProvider` in my root layout. Create a `lib/fixtures.ts` with at least 2 scenarios (default and empty-state). After setup, visiting any page with `?demo=true` should activate demo mode.

For deeper integration with your AI tool, grab a config template from [`templates/`](./templates):

| Tool | File | Command |
|------|------|---------|
| Claude Code | `CLAUDE.md` | `curl -o CLAUDE.md https://raw.githubusercontent.com/Kasava-AI/demokit/main/templates/CLAUDE.md` |
| Cursor | `.cursor/rules` | `mkdir -p .cursor && curl -o .cursor/rules https://raw.githubusercontent.com/Kasava-AI/demokit/main/templates/.cursor/rules` |
| OpenAI Codex | `AGENTS.md` | `curl -o AGENTS.md https://raw.githubusercontent.com/Kasava-AI/demokit/main/templates/AGENTS.md` |

### Add to an existing project

```bash
npm install @demokit-ai/core @demokit-ai/react
```

```tsx
import {
  DemoKitProvider,
  DemoModeBanner,
  useDemoMode,
} from "@demokit-ai/react";

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

### Framework Support

TanStack Query and SWR apps work through standard network interception — no adapter needed. Next.js apps that fetch client-side can use `@demokit-ai/react` directly.

| Framework | Import               |
| --------- | --------------------- |
| React     | `@demokit-ai/react` |

### LLM Data Generation (BYOK)

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
| **L3: Narrative-driven**   | LLM-generated story fixtures | Yes (BYOK)  |

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

- [Documentation](https://demokit.dev/docs): full guides and API reference
- [Getting Started](https://demokit.dev/docs/getting-started): first steps
- [React Integration](https://demokit.dev/docs/react): React-specific guide
- [API Reference](https://demokit.dev/docs/api): complete API docs
- [Example Workflows](https://demokit.dev/workflows): common patterns

---

## DemoKit Cloud

For teams who prefer managed infrastructure, [DemoKit Cloud](https://demokit.dev/cloud) offers:

- **Managed AI**: no API key management needed
- **Team collaboration**: share and version configurations
- **Visual dashboard**: manage fixtures without code
- **Usage analytics**: track demo engagement
- **Demo composition**: combine features, flows, and scenarios

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
