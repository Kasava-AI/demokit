# react-ecommerce

A small Vite + React SPA wired to DemoKit's `msw` transport. Runs entirely
offline — no DemoKit Cloud `apiKey`, no real backend. Demo data lives in
[`src/demo/demo-config.ts`](src/demo/demo-config.ts), which builds a
`CloudFixtureResponse`-shaped object by hand and hands it to
`createDemoRuntime()` (the same store-runtime the cloud path uses) to get a
`FixtureMap`.

## Quickstart

```bash
corepack pnpm install
corepack pnpm --filter react-ecommerce dev
```

Open the printed local URL, flip **Demo Mode** on in the header, and browse
the catalog, cart, and orders.

## What to look at

- **Network tab**: with demo mode on, requests to `/api/products`,
  `/api/orders`, etc. are answered by a Service Worker
  (`public/mockServiceWorker.js`) instead of leaving the browser. Each mocked
  response carries an `X-DemoKit-Mock: true` header.
- **Demo mode off**: this example ships no real server, so every fetch fails
  with "backend unreachable." That's intentional — flip demo mode back on to
  see data again.
- **Checkout with demo mode off**: `POST /api/orders` fails the same way as
  the GETs (no backend to reach). This is the point — the blocked-mutation
  guard (a mock 409 for mutations that match no fixture) only applies while
  demo mode is *on*; with it off, every request just passes straight through
  to the real network.
- **Cancel an order** (demo mode on): deletes the order and cascades to
  delete its `OrderItem` rows in the store, via the FK relationships declared
  in `demo-config.ts`.

## Switch transport

`src/App.tsx` passes `transport="msw"` to `DemoKitProvider`. Remove that prop
(or set it to `"fetch"`) to fall back to the fetch-interceptor transport —
same fixtures, no Service Worker, works without `public/mockServiceWorker.js`:

```tsx
<DemoKitProvider fixtures={fixtures}>
```

## Point at DemoKit Cloud

Swap the local `fixtures` for a cloud `source` and this example fetches its
data (and mappings) from DemoKit Cloud instead of the hand-built config:

```tsx
// src/demo/demo-config.ts
import { createRemoteSource } from '@demokit-ai/react'

export const demokitSource = createRemoteSource({
  apiUrl: import.meta.env.VITE_DEMOKIT_API_URL!,
  apiKey: import.meta.env.VITE_DEMOKIT_API_KEY!,
})
```

```tsx
// src/App.tsx
<DemoKitProvider source={demokitSource} transport="msw">
```

Then add a `.env.local` with `VITE_DEMOKIT_API_URL` / `VITE_DEMOKIT_API_KEY`.

## Regenerating the worker script

`public/mockServiceWorker.js` is copied from the installed `msw` package. If
you upgrade `msw`, re-run:

```bash
corepack pnpm --filter react-ecommerce exec msw init public/ --save
```
