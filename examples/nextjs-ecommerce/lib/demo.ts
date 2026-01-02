import {
  createDemoConfig,
  defineFixtures,
  defineScenarios,
} from '@demokit-ai/next'
import type { Product, Cart, Order, CartItem } from '@/app/types'

// Demo product data
const products: Product[] = [
  {
    id: 'p1',
    name: 'Laptop Pro',
    price: 999,
    category: 'electronics',
    stock: 15,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    description: 'Powerful laptop for professionals with 16GB RAM, 512GB SSD, and stunning Retina display. Perfect for development, design, and multitasking.',
  },
  {
    id: 'p2',
    name: 'Wireless Headphones',
    price: 199,
    category: 'electronics',
    stock: 42,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and crystal-clear audio quality.',
  },
  {
    id: 'p3',
    name: 'Mechanical Keyboard',
    price: 149,
    category: 'accessories',
    stock: 28,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=300&fit=crop',
    description: 'RGB mechanical keyboard with Cherry MX switches, N-key rollover, and programmable macros for gaming and productivity.',
  },
  {
    id: 'p4',
    name: 'USB-C Hub',
    price: 79,
    category: 'accessories',
    stock: 67,
    image: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=300&fit=crop',
    description: '7-in-1 USB-C hub with HDMI, USB 3.0 ports, SD card reader, and 100W power delivery for all your connectivity needs.',
  },
  {
    id: 'p5',
    name: '4K Monitor',
    price: 449,
    category: 'electronics',
    stock: 12,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
    description: '27-inch 4K UHD monitor with HDR support, 144Hz refresh rate, and USB-C connectivity. Perfect for creative professionals.',
  },
]

// Session-based cart state (simulated)
let sessionCart: Cart = {
  items: [],
  total: 0,
}

// Session-based orders
let sessionOrders: Order[] = []

// Helper to calculate cart total
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
}

// Define fixtures for API endpoints
const fixtures = defineFixtures({
  // Products endpoints
  'GET /api/products': () => products,

  'GET /api/products/:id': ({ params }) => {
    const product = products.find((p) => p.id === params.id)
    if (!product) {
      throw new Error('Product not found')
    }
    return product
  },

  // Cart endpoints
  'GET /api/cart': () => sessionCart,

  'POST /api/cart/add': async ({ body }) => {
    const { productId, quantity = 1 } = body as { productId: string; quantity?: number }
    const existingItem = sessionCart.items.find((item) => item.productId === productId)

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      sessionCart.items.push({ productId, quantity })
    }

    sessionCart.total = calculateTotal(sessionCart.items)
    return sessionCart
  },

  'PUT /api/cart/:productId': async ({ params, body }) => {
    const { quantity } = body as { quantity: number }
    const item = sessionCart.items.find((item) => item.productId === params.productId)

    if (item) {
      if (quantity <= 0) {
        sessionCart.items = sessionCart.items.filter((i) => i.productId !== params.productId)
      } else {
        item.quantity = quantity
      }
    }

    sessionCart.total = calculateTotal(sessionCart.items)
    return sessionCart
  },

  'DELETE /api/cart/:productId': ({ params }) => {
    sessionCart.items = sessionCart.items.filter((item) => item.productId !== params.productId)
    sessionCart.total = calculateTotal(sessionCart.items)
    return sessionCart
  },

  'DELETE /api/cart': () => {
    sessionCart = { items: [], total: 0 }
    return sessionCart
  },

  // Checkout endpoints
  'POST /api/checkout': async () => {
    if (sessionCart.items.length === 0) {
      throw new Error('Cart is empty')
    }

    const order: Order = {
      id: `order-${Date.now()}`,
      items: [...sessionCart.items],
      total: sessionCart.total,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }

    sessionOrders.push(order)
    sessionCart = { items: [], total: 0 }

    return order
  },

  // Orders endpoints
  'GET /api/orders': () => sessionOrders,

  'GET /api/orders/:id': ({ params }) => {
    const order = sessionOrders.find((o) => o.id === params.id)
    if (!order) {
      throw new Error('Order not found')
    }
    return order
  },
})

// Define scenarios for different demo states
const scenarios = defineScenarios({
  // Default scenario - start fresh
  'fresh-start': {
    'GET /api/cart': () => ({ items: [], total: 0 }),
    'GET /api/orders': () => [],
  },

  // Pre-filled cart scenario
  'with-cart': {
    'GET /api/cart': () => ({
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p3', quantity: 2 },
      ],
      total: 999 + 149 * 2,
    }),
  },

  // Low stock scenario
  'low-stock': {
    'GET /api/products': () =>
      products.map((p) => ({
        ...p,
        stock: p.stock <= 15 ? 2 : p.stock,
      })),
  },

  // Order history scenario
  'with-orders': {
    'GET /api/orders': () => [
      {
        id: 'order-demo-1',
        items: [{ productId: 'p2', quantity: 1 }],
        total: 199,
        status: 'delivered' as const,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'order-demo-2',
        items: [
          { productId: 'p4', quantity: 1 },
          { productId: 'p3', quantity: 1 },
        ],
        total: 228,
        status: 'shipped' as const,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
})

// Export the complete demo configuration
export const demoConfig = createDemoConfig({
  fixtures,
  scenarios,
  storageKey: 'ecommerce-demo-mode',
  cookieName: 'ecommerce-demo-mode',
  urlParam: 'demo',
})

// Re-export for convenience
export { fixtures, scenarios }
