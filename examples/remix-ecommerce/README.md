# Remix E-commerce Demo

A full-featured e-commerce demo application showcasing `@demokit-ai/remix` integration for Remix applications.

## Features

- **Product Catalog**: Browse products with category filtering and search
- **Product Details**: View detailed product information with add-to-cart functionality
- **Shopping Cart**: Manage cart items with quantity controls
- **Checkout Flow**: Complete checkout with order confirmation
- **Order History**: View past orders with status tracking
- **Demo Mode Toggle**: Switch between demo and real data seamlessly

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Demo Mode

Toggle demo mode using the switch in the header, or:

- Add `?demo=true` to any URL
- Visit `/demo/enable` to enable via cookie
- Visit `/demo/disable` to disable

## Project Structure

```
app/
├── components/          # React components
│   ├── Cart.tsx        # Cart component
│   ├── CartIcon.tsx    # Header cart icon with badge
│   ├── DemoToggle.tsx  # Demo mode toggle switch
│   ├── Header.tsx      # App header with navigation
│   ├── ProductCard.tsx # Product card for grid display
│   └── ProductList.tsx # Product grid layout
├── demo/               # Demo mode configuration
│   ├── data.ts         # Demo product/order data
│   └── fixtures.ts     # DemoKit fixture definitions
├── routes/             # Remix routes
│   ├── _index.tsx      # Products home page
│   ├── products.$id.tsx # Product detail page
│   ├── cart.tsx        # Shopping cart
│   ├── checkout.tsx    # Checkout flow
│   ├── orders.tsx      # Order history
│   ├── demo.enable.tsx # Enable demo mode action
│   └── demo.disable.tsx # Disable demo mode action
├── styles/             # CSS styles
│   └── app.css         # Tailwind CSS entry
├── types/              # TypeScript types
│   └── index.ts        # Shared type definitions
├── entry.client.tsx    # Client entry
├── entry.server.tsx    # Server entry
└── root.tsx            # Root layout with DemoRemixProvider
```

## DemoKit Integration

### Key Patterns

#### 1. Root Provider Setup

```tsx
// app/root.tsx
import { DemoRemixProvider } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const demoEnabled = isDemoMode(request)
  return json({ isDemoMode: demoEnabled })
}

export default function App() {
  const { isDemoMode } = useLoaderData<typeof loader>()

  return (
    <DemoRemixProvider enabled={isDemoMode} loaders={loaderFixtures} actions={actionFixtures}>
      {/* ... */}
    </DemoRemixProvider>
  )
}
```

#### 2. Demo-Aware Loaders

```tsx
// app/routes/_index.tsx
import { createDemoLoader } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'

export const loader = createDemoLoader<Response>({
  loader: async ({ request }) => {
    // Real loader logic
    return json({ products: await db.products.findMany() })
  },
  isEnabled: isDemoMode,
  fixture: ({ request }) => {
    // Demo fixture logic
    return json({ products: demoProducts })
  },
  delay: 100, // Simulate network latency
})
```

#### 3. Demo-Aware Actions

```tsx
// app/routes/cart.tsx
import { createDemoAction } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'

export const action = createDemoAction<Response>({
  action: async ({ request }) => {
    // Real action logic
  },
  isEnabled: isDemoMode,
  fixture: {
    POST: async ({ formData }) => {
      // Demo fixture for POST
      return json({ success: true })
    },
  },
})
```

#### 4. Centralized Fixtures

```tsx
// app/demo/fixtures.ts
import { createFixtureStore, defineRemixLoaderFixtures } from '@demokit-ai/remix'

export const loaderFixtures = defineRemixLoaderFixtures({
  '/': () => json({ products: demoProducts }),
  '/products/:id': ({ params }) => json({ product: getProductById(params.id) }),
})

export const fixtureStore = createFixtureStore({
  loaders: loaderFixtures,
  actions: actionFixtures,
})
```

#### 5. Demo Mode Toggle

```tsx
// app/components/DemoToggle.tsx
import { useIsDemoRemixMode } from '@demokit-ai/remix'

export function DemoToggle() {
  const isDemo = useIsDemoRemixMode()

  return (
    <Form action={isDemo ? '/demo/disable' : '/demo/enable'} method="post">
      <button type="submit">{isDemo ? 'Disable Demo' : 'Enable Demo'}</button>
    </Form>
  )
}
```

## Demo Data

### Products

| ID  | Name                 | Price | Category    |
| --- | -------------------- | ----- | ----------- |
| p1  | Laptop Pro           | $999  | electronics |
| p2  | Wireless Headphones  | $199  | electronics |
| p3  | Mechanical Keyboard  | $149  | accessories |
| p4  | USB-C Hub            | $79   | accessories |
| p5  | 4K Monitor           | $449  | electronics |

### Sample Orders

- Order `ord-001`: Laptop Pro + 2x USB-C Hub (Delivered)
- Order `ord-002`: Wireless Headphones (Shipped)

### Default Cart

- 1x Mechanical Keyboard
- 1x 4K Monitor

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Run production build
npm run typecheck # Run TypeScript type checking
```

## Tech Stack

- **Framework**: Remix v2.15
- **React**: 19.0
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite v6
- **Demo Mode**: @demokit-ai/remix

## License

MIT
