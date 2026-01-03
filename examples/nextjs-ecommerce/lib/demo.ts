import {
  createDemoConfig,
  defineFixtures,
  defineScenarios,
} from '@demokit-ai/next'
import type { Product, Cart, Order, CartItem, Address, AuthResponse } from '@/app/types'

// Helper to generate UUIDs
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Demo product data matching OpenAPI spec
const products: Product[] = [
  {
    id: 'eda5cbc1-a615-4da5-ae73-4a33a9acfb6a',
    name: 'Laptop Pro',
    price: 999.99,
    category: 'electronics',
    stock: 15,
    image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    description: 'Powerful laptop for professionals with 16GB RAM, 512GB SSD, and stunning Retina display. Perfect for development, design, and multitasking.',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-20T14:30:00Z',
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Wireless Headphones',
    price: 199.50,
    category: 'electronics',
    stock: 42,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and crystal-clear audio quality.',
    created_at: '2024-02-10T08:15:00Z',
    updated_at: '2024-12-18T09:45:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Mechanical Keyboard',
    price: 149.00,
    category: 'accessories',
    stock: 28,
    image_url: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=300&fit=crop',
    description: 'RGB mechanical keyboard with Cherry MX switches, N-key rollover, and programmable macros for gaming and productivity.',
    created_at: '2024-03-05T11:20:00Z',
    updated_at: '2024-12-15T16:00:00Z',
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    name: 'USB-C Hub',
    price: 79.99,
    category: 'accessories',
    stock: 67,
    image_url: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=300&fit=crop',
    description: '7-in-1 USB-C hub with HDMI, USB 3.0 ports, SD card reader, and 100W power delivery for all your connectivity needs.',
    created_at: '2024-04-12T13:45:00Z',
    updated_at: '2024-12-10T10:30:00Z',
  },
  {
    id: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    name: '4K Monitor',
    price: 449.00,
    category: 'electronics',
    stock: 12,
    image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
    description: '27-inch 4K UHD monitor with HDR support, 144Hz refresh rate, and USB-C connectivity. Perfect for creative professionals.',
    created_at: '2024-05-20T09:00:00Z',
    updated_at: '2024-12-22T11:15:00Z',
  },
]

// Demo addresses
const addresses: Address[] = [
  {
    id: 'addr-001',
    line1: '123 Main Street',
    line2: 'Apt 4B',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94102',
    country: 'US',
  },
  {
    id: 'addr-002',
    line1: '456 Oak Avenue',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'US',
  },
]

// Session-based cart state (simulated)
let sessionCart: Cart = {
  items: [],
  total: 0,
}

// Session-based orders
let sessionOrders: Order[] = []

// Session auth token
let sessionToken: string | null = null

// Helper to calculate cart total
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.product_id)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
}

// Define fixtures for API endpoints matching OpenAPI spec
const fixtures = defineFixtures({
  // Auth endpoints
  'POST /auth/register': async ({ body }: { body: unknown }) => {
    const { email, password, name } = body as { email: string; password: string; name?: string }
    if (!email || !password) {
      throw new Error('Email and password are required')
    }
    const userId = generateUUID()
    sessionToken = `demo-token-${userId}`
    return {
      token: sessionToken,
      user: { id: userId, email, name },
    } as AuthResponse
  },

  'POST /auth/login': async ({ body }: { body: unknown }) => {
    const { email, password } = body as { email: string; password: string }
    if (!email || !password) {
      throw new Error('Invalid credentials')
    }
    const userId = generateUUID()
    sessionToken = `demo-token-${userId}`
    return {
      token: sessionToken,
      user: { id: userId, email },
    } as AuthResponse
  },

  // Products endpoints with filtering
  'GET /products': ({ searchParams }: { searchParams?: URLSearchParams }) => {
    let filtered = [...products]

    const category = searchParams?.get('category')
    const search = searchParams?.get('search')?.toLowerCase()
    const minPrice = searchParams?.get('min_price')
    const maxPrice = searchParams?.get('max_price')

    if (category) {
      filtered = filtered.filter((p) => p.category === category)
    }
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description?.toLowerCase().includes(search)
      )
    }
    if (minPrice) {
      filtered = filtered.filter((p) => p.price >= parseFloat(minPrice))
    }
    if (maxPrice) {
      filtered = filtered.filter((p) => p.price <= parseFloat(maxPrice))
    }

    return filtered
  },

  'GET /products/:id': ({ params }: { params: { id: string } }) => {
    const product = products.find((p) => p.id === params.id)
    if (!product) {
      throw new Error('Product not found')
    }
    return product
  },

  // Cart endpoints
  'GET /cart': () => sessionCart,

  'POST /cart/items': async ({ body }: { body: unknown }) => {
    const { product_id, quantity = 1 } = body as { product_id: string; quantity?: number }
    const existingItem = sessionCart.items.find((item) => item.product_id === product_id)

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      sessionCart.items.push({ product_id, quantity })
    }

    sessionCart.total = calculateTotal(sessionCart.items)
    return sessionCart
  },

  'PUT /cart/:product_id': async ({ params, body }: { params: { product_id: string }; body: unknown }) => {
    const { quantity } = body as { quantity: number }
    const item = sessionCart.items.find((item) => item.product_id === params.product_id)

    if (item) {
      if (quantity <= 0) {
        sessionCart.items = sessionCart.items.filter((i) => i.product_id !== params.product_id)
      } else {
        item.quantity = quantity
      }
    }

    sessionCart.total = calculateTotal(sessionCart.items)
    return sessionCart
  },

  'DELETE /cart/:product_id': ({ params }: { params: { product_id: string } }) => {
    sessionCart.items = sessionCart.items.filter((item) => item.product_id !== params.product_id)
    sessionCart.total = calculateTotal(sessionCart.items)
    return sessionCart
  },

  'DELETE /cart': () => {
    sessionCart = { items: [], total: 0 }
    return sessionCart
  },

  // Checkout endpoint
  'POST /checkout': async ({ body }: { body: unknown }) => {
    const { address_id, payment_method_id } = body as { address_id: string; payment_method_id: string }

    if (!address_id || !payment_method_id) {
      throw new Error('Address and payment method are required')
    }

    if (sessionCart.items.length === 0) {
      throw new Error('Cart is empty')
    }

    const order: Order = {
      id: generateUUID(),
      items: [...sessionCart.items],
      total_amount: sessionCart.total,
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    sessionOrders.push(order)
    sessionCart = { items: [], total: 0 }

    return order
  },

  // Orders endpoints
  'GET /orders': () => sessionOrders,

  'GET /orders/:orderId': ({ params }: { params: { orderId: string } }) => {
    const order = sessionOrders.find((o) => o.id === params.orderId)
    if (!order) {
      throw new Error('Order not found')
    }
    return order
  },

  // Addresses endpoints
  'GET /addresses': () => addresses,

  'POST /addresses': async ({ body }: { body: unknown }) => {
    const newAddress = body as Address
    newAddress.id = generateUUID()
    addresses.push(newAddress)
    return newAddress
  },
})

// Define scenarios for different demo states
const scenarios = defineScenarios({
  // Default scenario - start fresh
  'fresh-start': {
    'GET /cart': () => ({ items: [], total: 0 }),
    'GET /orders': () => [],
  },

  // Pre-filled cart scenario
  'with-cart': {
    'GET /cart': () => ({
      items: [
        { product_id: 'eda5cbc1-a615-4da5-ae73-4a33a9acfb6a', quantity: 1 },
        { product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 },
      ],
      total: 999.99 + 149 * 2,
    }),
  },

  // Low stock scenario
  'low-stock': {
    'GET /products': () =>
      products.map((p) => ({
        ...p,
        stock: p.stock <= 15 ? 2 : p.stock,
      })),
  },

  // Order history scenario
  'with-orders': {
    'GET /orders': () => [
      {
        id: 'order-demo-1',
        items: [{ product_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', quantity: 1 }],
        total_amount: 199.50,
        status: 'delivered' as const,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'order-demo-2',
        items: [
          { product_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', quantity: 1 },
          { product_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 1 },
        ],
        total_amount: 228.99,
        status: 'shipped' as const,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
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
export { fixtures, scenarios, products, addresses }
