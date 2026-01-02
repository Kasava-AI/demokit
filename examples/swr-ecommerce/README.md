# SWR E-Commerce Demo

A full-featured e-commerce application demonstrating the `@demokit-ai/swr` package for building interactive demos with SWR (stale-while-revalidate) data fetching.

## Features

- **Product Catalog**: Browse products with category filtering and search
- **Product Details**: View detailed product information with related products
- **Shopping Cart**: Add, update quantity, and remove items
- **Checkout Flow**: Complete checkout with order confirmation
- **Order History**: View past orders with status tracking
- **Demo Mode Toggle**: Switch between demo fixtures and real data

## Tech Stack

- **React 19** - Latest React with concurrent features
- **SWR 2.x** - React hooks for data fetching
- **React Router DOM 7** - Client-side routing
- **Vite 6** - Fast development and build tooling
- **Tailwind CSS v4** - Utility-first styling
- **TypeScript** - Type-safe code

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Enable Demo Mode

By default, demo mode is enabled. You can toggle it using the button in the header.

When demo mode is enabled:
- Product data comes from static fixtures
- Cart operations simulate API responses
- Checkout creates mock orders

When demo mode is disabled:
- The app attempts to call real API endpoints
- Without a backend, you'll see error states

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── CartIcon.tsx     # Cart icon with item count
│   ├── CartItem.tsx     # Cart item row with controls
│   ├── DemoToggle.tsx   # Demo mode toggle button
│   ├── Header.tsx       # Navigation header
│   ├── Layout.tsx       # Root layout wrapper
│   ├── ProductCard.tsx  # Product grid card
│   ├── ProductList.tsx  # Product grid layout
│   └── SearchBar.tsx    # Search and filter form
├── demo/
│   └── fixtures.ts      # Demo data and fixture definitions
├── hooks/               # Custom SWR hooks
│   ├── index.ts         # Barrel export
│   ├── useCart.ts       # Cart data and mutations
│   ├── useOrders.ts     # Orders data and checkout
│   └── useProducts.ts   # Products data fetching
├── lib/
│   ├── cart-storage.ts  # LocalStorage cart utilities
│   ├── demo-mode.ts     # Demo mode state management
│   └── fetcher.ts       # SWR fetcher functions
├── pages/               # Route components (pages)
│   ├── Cart.tsx         # Shopping cart page
│   ├── Checkout.tsx     # Checkout form
│   ├── OrderConfirmation.tsx
│   ├── OrderDetail.tsx  # Single order view
│   ├── Orders.tsx       # Order history
│   ├── ProductDetail.tsx
│   └── Products.tsx     # Product listing
├── types/
│   └── index.ts         # TypeScript interfaces
├── App.tsx              # Route definitions
├── index.css            # Global styles
├── main.tsx             # App entry point
└── providers.tsx        # DemoSWRProvider setup
```

## DemoKit + SWR Integration

### Provider Setup

The `providers.tsx` file sets up the DemoSWRProvider:

```tsx
import { DemoSWRProvider } from '@demokit-ai/swr'
import { fixtures, mutationFixtures } from '@/demo/fixtures'
import { isDemoEnabled } from '@/lib/demo-mode'

export function Providers({ children }) {
  return (
    <DemoSWRProvider
      enabled={isDemoEnabled()}
      fixtures={fixtures}
      mutationFixtures={mutationFixtures}
      delay={200} // Simulate network latency
    >
      {children}
    </DemoSWRProvider>
  )
}
```

### Fixture Definitions

Fixtures in `src/demo/fixtures.ts` use URL pattern matching:

```tsx
// GET request fixtures
export const fixtures = {
  // Static fixture
  '/api/products': ({ url }) => ({
    products: demoProducts,
    categories: ['electronics', 'accessories'],
  }),

  // Dynamic fixture with URL params
  '/api/products/:id': ({ params }) => ({
    product: demoProducts.find(p => p.id === params.id),
    relatedProducts: [...],
  }),

  // Cart data
  '/api/cart': () => ({
    cart: demoCart,
    products: getCartProducts(),
  }),
}

// Mutation fixtures
export const mutationFixtures = {
  addToCart: ({ arg }) => ({
    success: true,
    cart: updatedCart,
  }),

  updateCartItem: ({ arg }) => ({
    success: true,
    cart: updatedCart,
  }),

  checkout: ({ arg }) => ({
    success: true,
    orderId: generateOrderId(),
  }),
}
```

### Using useDemoSWR

The `useDemoSWR` hook wraps SWR with demo mode awareness:

```tsx
import { useDemoSWR } from '@demokit-ai/swr'

function Products() {
  const { data, error, isLoading } = useDemoSWR<ProductsResponse>('/api/products')

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorMessage />

  return <ProductList products={data.products} />
}
```

### Using useDemoSWRMutation

The `useDemoSWRMutation` hook handles mutations:

```tsx
import { useDemoSWRMutation } from '@demokit-ai/swr'

function ProductCard({ product }) {
  const { trigger, isMutating } = useDemoSWRMutation<
    CartMutationResponse,
    { productId: string; quantity: number }
  >('addToCart', '/api/cart')

  const handleAddToCart = async () => {
    await trigger({ productId: product.id, quantity: 1 })
    // Optionally revalidate cart data
  }

  return (
    <button onClick={handleAddToCart} disabled={isMutating}>
      {isMutating ? 'Adding...' : 'Add to Cart'}
    </button>
  )
}
```

### Custom Hooks Pattern

Wrap SWR calls in custom hooks for reusability:

```tsx
// hooks/useProducts.ts
export function useProducts(options?: { search?: string; category?: string }) {
  const url = buildUrl('/api/products', options)
  const { data, error, isLoading, mutate } = useDemoSWR<ProductsResponse>(url)

  return {
    products: data?.products ?? [],
    categories: data?.categories ?? [],
    isLoading,
    error,
    mutate,
  }
}

// Usage
function ProductPage() {
  const { products, isLoading } = useProducts({ category: 'electronics' })
  // ...
}
```

### Demo Mode Toggle

The `DemoToggle` component manages demo state:

```tsx
import { isDemoEnabled, toggleDemoMode } from '@/lib/demo-mode'

function DemoToggle() {
  const handleToggle = () => {
    toggleDemoMode()
    window.location.reload() // Reload to apply changes
  }

  return (
    <button onClick={handleToggle}>
      {isDemoEnabled() ? 'Demo Mode' : 'Live Mode'}
    </button>
  )
}
```

## Key SWR Patterns

### Data Fetching with Conditional Keys

```tsx
// Only fetch when id is available
const { data } = useDemoSWR(id ? `/api/products/${id}` : null)
```

### Revalidation After Mutations

```tsx
const { mutate } = useCart()

const handleAddToCart = async () => {
  await addToCart({ productId, quantity: 1 })
  mutate() // Revalidate cart data
}
```

### Loading States

```tsx
if (isLoading) {
  return <div className="animate-pulse">...</div>
}
```

### Error Handling

```tsx
if (error) {
  return <div className="text-red-600">Failed to load data</div>
}
```

## Building for Production

```bash
npm run build
npm run preview
```

## Learn More

- [DemoKit Documentation](https://demokit.dev/docs)
- [SWR Documentation](https://swr.vercel.app/)
- [React Router Documentation](https://reactrouter.com/)
- [Vite Documentation](https://vitejs.dev/)
