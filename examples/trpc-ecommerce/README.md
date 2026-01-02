# tRPC E-commerce Demo

A complete e-commerce example app showcasing DemoKit integration with tRPC v11, demonstrating type-safe fixture definitions and the `createDemoLink` API.

## What This Example Demonstrates

- **Type-Safe tRPC Fixtures**: Full type inference from your router to fixture definitions
- **Demo Link Integration**: `createDemoLink` that intercepts tRPC calls when demo mode is enabled
- **End-to-End Type Safety**: TypeScript catches fixture errors at compile time
- **TanStack Query Integration**: Works seamlessly with `@trpc/react-query` hooks
- **Session State**: Simulated cart and order persistence during demo sessions

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**

   ```bash
   npm run dev
   ```

3. **Open in browser:**

   Visit [http://localhost:3000](http://localhost:3000)

4. **Enable demo mode:**

   Click the "Try Demo" button in the header

## Key Files

### tRPC Router & Types

- **`src/server/router.ts`** - tRPC router definition with Zod validation
- **`app/types/index.ts`** - Shared TypeScript interfaces

### DemoKit Configuration

- **`src/demo/fixtures.ts`** - Type-safe fixtures using `defineTRPCFixtures<AppRouter>()`
- **`src/lib/trpc.ts`** - tRPC client with `createDemoLink` integration

### tRPC Setup

- **`app/api/trpc/[trpc]/route.ts`** - Next.js App Router API handler
- **`app/providers.tsx`** - tRPC + TanStack Query providers with demo state

### Components

- **`app/components/DemoToggle.tsx`** - Demo mode toggle button
- **`app/components/DemoModeBanner.tsx`** - Demo mode indicator banner
- **`app/components/ProductList.tsx`** - Products with filtering and search
- **`app/components/ProductCard.tsx`** - Product card with add to cart
- **`app/components/CartIcon.tsx`** - Cart icon with item count badge

### Pages

- **`app/page.tsx`** - Products home page
- **`app/products/[id]/page.tsx`** - Product detail page
- **`app/cart/page.tsx`** - Shopping cart
- **`app/checkout/page.tsx`** - Checkout flow with order confirmation
- **`app/orders/page.tsx`** - Order history
- **`app/orders/[id]/page.tsx`** - Order detail page

## tRPC Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `product.list` | Query | List products with optional category/search filter |
| `product.get` | Query | Get product by ID |
| `cart.get` | Query | Get current cart |
| `cart.addItem` | Mutation | Add item to cart |
| `cart.updateItem` | Mutation | Update item quantity |
| `cart.removeItem` | Mutation | Remove item from cart |
| `cart.clear` | Mutation | Clear cart |
| `order.list` | Query | List orders |
| `order.get` | Query | Get order by ID |
| `order.create` | Mutation | Create order from cart |

## How Type-Safe Fixtures Work

### 1. Define Your Router

```typescript
// src/server/router.ts
import { initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()

export const appRouter = t.router({
  product: t.router({
    list: t.procedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(({ input }) => { /* ... */ }),
    get: t.procedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => { /* ... */ }),
  }),
  cart: t.router({
    get: t.procedure.query(() => { /* ... */ }),
    addItem: t.procedure
      .input(z.object({ productId: z.string(), quantity: z.number() }))
      .mutation(({ input }) => { /* ... */ }),
  }),
})

export type AppRouter = typeof appRouter
```

### 2. Define Type-Safe Fixtures

```typescript
// src/demo/fixtures.ts
import { defineTRPCFixtures } from '@demokit-ai/trpc'
import type { AppRouter } from '../server/router'

// TypeScript infers input/output types from your router!
export const fixtures = defineTRPCFixtures<AppRouter>()({
  product: {
    // input is inferred as { category?: string } | undefined
    // return type must match Product[]
    list: ({ input }) => products.filter(p =>
      !input?.category || p.category === input.category
    ),

    // input is inferred as { id: string }
    // return type must match Product
    get: ({ input }) => {
      const product = products.find(p => p.id === input.id)
      if (!product) throw new Error('Not found')
      return product
    },
  },
  cart: {
    get: () => sessionCart,

    // input is inferred as { productId: string, quantity: number }
    addItem: ({ input }) => addToCart(input.productId, input.quantity),
  },
})
```

### 3. Create tRPC Client with Demo Link

```typescript
// src/lib/trpc.ts
import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import { createDemoLink } from '@demokit-ai/trpc'
import { fixtures } from '../demo/fixtures'
import type { AppRouter } from '../server/router'

export const trpc = createTRPCReact<AppRouter>()

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      // Demo link intercepts when enabled
      createDemoLink<AppRouter>({
        fixtures,
        isEnabled: () => localStorage.getItem('demoMode') === 'true',
        delay: 100, // Simulate network latency
      }),
      // Real API link (fallback)
      httpBatchLink({ url: '/api/trpc' }),
    ],
  })
}
```

### 4. Use tRPC Hooks Normally

```typescript
// Components use standard tRPC hooks
const { data: products } = trpc.product.list.useQuery()

const addToCart = trpc.cart.addItem.useMutation({
  onSuccess: () => utils.cart.get.invalidate(),
})
```

## Demo Link Options

```typescript
createDemoLink<AppRouter>({
  // Type-safe fixtures (required)
  fixtures: fixtures,

  // Function to check if demo mode is enabled
  isEnabled: () => localStorage.getItem('demoMode') === 'true',

  // Simulate network latency (ms)
  delay: 100,

  // Only intercept these procedures
  include: ['product.*', 'cart.*'],

  // Never intercept these procedures
  exclude: ['auth.login'],

  // Called when no fixture is found
  onMissing: (path, input) => {
    console.warn(`No fixture for: ${path}`)
  },
})
```

## Demo Data

| ID | Product | Price | Category |
|----|---------|-------|----------|
| p1 | Laptop Pro | $999 | electronics |
| p2 | Wireless Headphones | $199 | electronics |
| p3 | Mechanical Keyboard | $149 | accessories |
| p4 | USB-C Hub | $79 | accessories |
| p5 | 4K Monitor | $449 | electronics |

## Key Benefits

1. **Compile-Time Safety**: TypeScript catches fixture type errors before runtime
2. **Full Type Inference**: Input types inferred from Zod schemas, output types from procedures
3. **IDE Autocomplete**: Full autocomplete for fixture definitions
4. **Seamless Integration**: Works with existing tRPC + TanStack Query setup
5. **Zero Runtime Overhead**: Demo link is a no-op when disabled

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- tRPC v11
- TanStack Query v5
- Zod
- Tailwind CSS v4
- @demokit-ai/trpc
- @demokit-ai/core

## License

MIT
