# React Router E-Commerce Demo

A full-featured e-commerce application demonstrating the `@demokit-ai/react-router` package for building interactive demos with React Router v7.

## Features

- **Product Catalog**: Browse products with category filtering and search
- **Product Details**: View detailed product information with related products
- **Shopping Cart**: Add, update quantity, and remove items
- **Checkout Flow**: Complete checkout with order confirmation
- **Order History**: View past orders with status tracking
- **Demo Mode Toggle**: Switch between demo fixtures and real data

## Tech Stack

- **React 19** - Latest React with concurrent features
- **React Router v7** - Data router with loaders and actions
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
│   ├── ProductCard.tsx  # Product grid card
│   ├── ProductList.tsx  # Product grid layout
│   └── SearchBar.tsx    # Search and filter form
├── demo/
│   └── fixtures.ts      # Demo data and fixture definitions
├── lib/
│   ├── cart-storage.ts  # LocalStorage cart utilities
│   └── demo-mode.ts     # Demo mode state management
├── routes/              # Route components (pages)
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
└── router.tsx           # Route configuration
```

## DemoKit Integration

### Route Configuration

The `router.tsx` file demonstrates the primary integration pattern:

```tsx
import { createDemoRoutes, defineLoaderFixtures, defineActionFixtures } from '@demokit-ai/react-router'

const routes: RouteObject[] = [/* your routes */]

const loaderFixtures = defineLoaderFixtures({
  '/products': () => ({ products: [...], categories: [...] }),
  '/products/:id': ({ params }) => ({ product: getProduct(params.id) }),
})

const actionFixtures = defineActionFixtures({
  '/cart': {
    POST: ({ formData }) => ({ success: true, cart: updatedCart }),
  },
})

const demoRoutes = createDemoRoutes(routes, {
  isEnabled: () => localStorage.getItem('demoMode') === 'true',
  loaders: loaderFixtures,
  actions: actionFixtures,
  delay: 200, // Simulate network latency
})

const router = createBrowserRouter(demoRoutes)
```

### Fixture Definitions

Fixtures in `src/demo/fixtures.ts` define the data returned during demo mode:

```tsx
// Static fixture
'/products': { products: demoProducts, categories: ['electronics', 'accessories'] }

// Dynamic fixture with params
'/products/:id': ({ params }) => ({
  product: demoProducts.find(p => p.id === params.id),
  relatedProducts: [...],
})

// Action fixture with form data
'/cart': {
  POST: async ({ formData }) => {
    const action = formData?.get('action')
    // Handle add, update, remove actions
    return { success: true, cart: updatedCart }
  }
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

### Data Loading with useLoaderData

```tsx
function Products() {
  const { products, categories } = useLoaderData() as ProductsLoaderData

  return (
    <ProductList products={products} />
  )
}
```

### Mutations with useFetcher

```tsx
function ProductCard({ product }: { product: Product }) {
  const fetcher = useFetcher()

  const handleAddToCart = () => {
    fetcher.submit(
      { action: 'add', productId: product.id, quantity: '1' },
      { method: 'POST', action: '/cart' }
    )
  }

  return (
    <button onClick={handleAddToCart} disabled={fetcher.state !== 'idle'}>
      Add to Cart
    </button>
  )
}
```

### Loading States with useNavigation

```tsx
function Layout() {
  const navigation = useNavigation()
  const isNavigating = navigation.state === 'loading'

  return (
    <main className={isNavigating ? 'opacity-60' : ''}>
      <Outlet />
    </main>
  )
}
```

## Building for Production

```bash
npm run build
npm run preview
```

## Learn More

- [DemoKit Documentation](https://demokit.dev/docs)
- [React Router v7 Documentation](https://reactrouter.com/)
- [Vite Documentation](https://vitejs.dev/)
