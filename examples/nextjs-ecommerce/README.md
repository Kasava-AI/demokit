# Next.js E-commerce Demo

A complete e-commerce example app showcasing DemoKit integration with Next.js 15 App Router.

## What This Example Demonstrates

- **DemoKit Next.js Integration**: Full integration with `@demokit-ai/next` package
- **Fixture-based API Mocking**: Mock all API endpoints without backend changes
- **Scenario Switching**: Multiple demo scenarios (fresh start, with cart, low stock, order history)
- **Session State**: Simulated cart and order persistence during demo sessions
- **Demo Mode UI**: Banner, toggle, and scenario selector components

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

   - Click the "Try Demo" button in the header, OR
   - Add `?demo=true` to the URL

## Demo Scenarios

Access different demo states by appending scenario names to the URL:

| Scenario | URL | Description |
|----------|-----|-------------|
| Default | `?demo=true` | Standard demo with full fixtures |
| Fresh Start | `?demo=fresh-start` | Empty cart and no orders |
| With Cart | `?demo=with-cart` | Pre-filled shopping cart |
| Low Stock | `?demo=low-stock` | Products with low inventory |
| Order History | `?demo=with-orders` | Previous orders visible |

## Key Files

### DemoKit Configuration

- **`lib/demo.ts`** - Fixtures, scenarios, and demo configuration
- **`middleware.ts`** - Demo middleware for cookie/URL handling
- **`app/providers.tsx`** - DemoKitNextProvider wrapper

### Components

- **`app/components/DemoToggle.tsx`** - Demo mode toggle with scenario selector
- **`app/components/DemoModeBanner.tsx`** - Demo mode indicator banner
- **`app/components/ProductList.tsx`** - Products with filtering and search
- **`app/components/Cart.tsx`** - Shopping cart with quantity controls

### Pages

- **`app/page.tsx`** - Products home page
- **`app/products/[id]/page.tsx`** - Product detail page
- **`app/cart/page.tsx`** - Cart page
- **`app/checkout/page.tsx`** - Checkout flow with order confirmation
- **`app/orders/page.tsx`** - Order history

## API Endpoints (Mocked in Demo Mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List all products |
| `/api/products/:id` | GET | Get product by ID |
| `/api/cart` | GET | Get current cart |
| `/api/cart/add` | POST | Add item to cart |
| `/api/cart/:productId` | PUT | Update item quantity |
| `/api/cart/:productId` | DELETE | Remove item from cart |
| `/api/cart` | DELETE | Clear cart |
| `/api/checkout` | POST | Create order |
| `/api/orders` | GET | List orders |
| `/api/orders/:id` | GET | Get order by ID |

## How DemoKit Works

1. **Middleware** (`middleware.ts`) detects `?demo=true` in URL and sets a cookie
2. **Provider** (`app/providers.tsx`) wraps the app and enables fetch interception
3. **Fixtures** (`lib/demo.ts`) define mock responses for API endpoints
4. **Components** make normal `fetch()` calls - DemoKit intercepts them automatically

## Features

### Products
- Grid layout with category filtering
- Search functionality
- Low stock indicators
- Add to cart from list or detail page

### Cart
- Update quantities
- Remove items
- Cart icon with item count badge
- Order summary with totals

### Checkout
- Form validation
- Order confirmation
- Automatic cart clearing after purchase

### Demo Mode
- Toggle button in header
- Scenario dropdown for quick switching
- Persistent banner when active
- Exit demo functionality

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- @demokit-ai/next
- @demokit-ai/core

## License

MIT
