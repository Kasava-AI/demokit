# TanStack Query E-Commerce Demo

A full-featured e-commerce application demonstrating the `@demokit-ai/tanstack-query` package for building interactive demos with TanStack Query v5.

## Features

- **Product Catalog**: Browse products with category filtering and search
- **Product Details**: View detailed product information with related products
- **Shopping Cart**: Add, update quantity, and remove items
- **Checkout Flow**: Complete checkout with order confirmation
- **Order History**: View past orders with status tracking
- **Demo Mode Toggle**: Switch between demo fixtures and real data

## Tech Stack

- **React 19** - Latest React with concurrent features
- **TanStack Query v5** - Powerful async state management
- **React Router v7** - Client-side routing
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
- Cart operations use demo mutation handlers
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
│   ├── ProductCard.tsx  # Product grid card
│   ├── ProductList.tsx  # Product grid layout
│   └── SearchBar.tsx    # Search and filter form
├── demo/
│   └── fixtures.ts      # Demo data and fixture definitions
├── hooks/               # TanStack Query hooks
│   ├── useProducts.ts   # Product queries
│   ├── useCart.ts       # Cart queries and mutations
│   └── useOrders.ts     # Order queries and mutations
├── lib/
│   └── demo-mode.ts     # Demo mode state management
├── pages/               # Page components
│   ├── Cart.tsx         # Shopping cart page
│   ├── Checkout.tsx     # Checkout form
│   ├── Layout.tsx       # Root layout with header
│   ├── OrderConfirmation.tsx
│   ├── OrderDetail.tsx  # Single order view
│   ├── Orders.tsx       # Order history
│   ├── ProductDetail.tsx
│   └── Products.tsx     # Product listing
├── types/
│   └── index.ts         # TypeScript interfaces
├── index.css            # Global styles
├── main.tsx             # App entry point
└── providers.tsx        # DemoQueryProvider setup
```

## DemoKit Integration

### Provider Setup

The `providers.tsx` file sets up the DemoQueryProvider:

```tsx
import { DemoQueryProvider } from '@demokit-ai/tanstack-query'
import { queryFixtures, mutationFixtures } from '@/demo/fixtures'
import { isDemoEnabled } from '@/lib/demo-mode'

export function Providers({ children }: ProvidersProps) {
  return (
    <DemoQueryProvider
      enabled={isDemoEnabled()}
      queries={queryFixtures}
      mutations={mutationFixtures}
      delay={200}
      staleTime={Infinity}
    >
      {children}
    </DemoQueryProvider>
  )
}
```

### Query Fixtures

Query fixtures use query key pattern matching:

```tsx
const queryFixtures = {
  // Static fixture
  '["products"]': () => demoProducts,

  // Dynamic fixture with params
  '["products", ":id"]': ({ params }) =>
    demoProducts.find(p => p.id === params.id),

  // Filtered queries
  '["products", { "category": ":category" }]': ({ params }) =>
    demoProducts.filter(p => p.category === params.category),

  // Nested params
  '["products", ":id", "related"]': ({ params }) =>
    demoProducts.filter(p => p.category === product.category && p.id !== params.id),
}
```

### Mutation Fixtures

Mutation fixtures handle demo mutations:

```tsx
const mutationFixtures = {
  addToCart: ({ variables, queryClient }) => {
    // Update demo cart state
    demoCart.items.push({ ...variables })

    // Invalidate cart query
    queryClient.invalidateQueries({ queryKey: ['cart'] })

    return { success: true, cart: demoCart }
  },

  checkout: ({ variables, queryClient }) => {
    // Create order from cart
    const order = { id: generateId(), items: demoCart.items, ... }
    demoOrders.push(order)
    demoCart = { items: [], total: 0 }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['cart'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })

    return { success: true, orderId: order.id }
  },
}
```

### Using Demo Mutations

The `useDemoMutation` hook wraps `useMutation` with demo awareness:

```tsx
import { useDemoMutation } from '@demokit-ai/tanstack-query'

function useAddToCart() {
  const queryClient = useQueryClient()

  return useDemoMutation({
    mutationFn: api.addToCart,  // Real API call
    demoName: 'addToCart',      // Links to mutation fixture
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
```

### Demo Mode Toggle

The `DemoToggle` component manages demo state via localStorage:

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

## Key Patterns

### Query Hooks

```tsx
function Products() {
  const { data: products = [], isLoading, error } = useProducts()

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return <ProductList products={products} />
}
```

### Mutation Hooks

```tsx
function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart()

  const handleAddToCart = () => {
    addToCart.mutate({ productId: product.id, quantity: 1 })
  }

  return (
    <button onClick={handleAddToCart} disabled={addToCart.isPending}>
      {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  )
}
```

### Optimistic Updates

```tsx
function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useDemoMutation({
    mutationFn: api.updateCartItem,
    demoName: 'updateCartItem',
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] })
      const previousCart = queryClient.getQueryData(['cart'])

      // Optimistic update
      queryClient.setQueryData(['cart'], (old: Cart) => ({
        ...old,
        items: old.items.map(item =>
          item.productId === variables.productId
            ? { ...item, quantity: variables.quantity }
            : item
        ),
      }))

      return { previousCart }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['cart'], context?.previousCart)
    },
  })
}
```

## Building for Production

```bash
npm run build
npm run preview
```

## Learn More

- [DemoKit Documentation](https://demokit.dev/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com/)
- [Vite Documentation](https://vitejs.dev/)
