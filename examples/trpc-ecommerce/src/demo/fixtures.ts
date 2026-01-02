import { defineTRPCFixtures } from '@demokit-ai/trpc'
import type { AppRouter } from '../server/router'
import type { Product, Cart, CartItem, Order } from '@/app/types'

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

// Helper to get current cart
function getCart(): Cart {
  return sessionCart
}

// Helper to add to cart
function addToCart(productId: string, quantity: number): Cart {
  const existingItem = sessionCart.items.find((item) => item.productId === productId)

  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    sessionCart.items.push({ productId, quantity })
  }

  sessionCart.total = calculateTotal(sessionCart.items)
  return sessionCart
}

// Helper to update cart item
function updateCartItem(productId: string, quantity: number): Cart {
  const item = sessionCart.items.find((item) => item.productId === productId)

  if (item) {
    if (quantity <= 0) {
      sessionCart.items = sessionCart.items.filter((i) => i.productId !== productId)
    } else {
      item.quantity = quantity
    }
  }

  sessionCart.total = calculateTotal(sessionCart.items)
  return sessionCart
}

// Helper to remove from cart
function removeFromCart(productId: string): Cart {
  sessionCart.items = sessionCart.items.filter((item) => item.productId !== productId)
  sessionCart.total = calculateTotal(sessionCart.items)
  return sessionCart
}

// Helper to clear cart
function clearCart(): Cart {
  sessionCart = { items: [], total: 0 }
  return sessionCart
}

// Helper to create order
function createOrder(): Order {
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
}

/**
 * Type-safe fixtures for tRPC procedures
 *
 * These fixtures mirror the AppRouter structure and provide mock data
 * when demo mode is enabled. TypeScript catches any type mismatches
 * at compile time.
 */
export const fixtures = defineTRPCFixtures<AppRouter>()({
  product: {
    list: ({ input }) => {
      let result = products

      if (input?.category) {
        result = result.filter((p) => p.category === input.category)
      }

      if (input?.search) {
        const searchLower = input.search.toLowerCase()
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower)
        )
      }

      return result
    },

    get: ({ input }) => {
      const product = products.find((p) => p.id === input.id)
      if (!product) {
        throw new Error('Product not found')
      }
      return product
    },
  },

  cart: {
    get: () => getCart(),

    addItem: ({ input }) => addToCart(input.productId, input.quantity),

    updateItem: ({ input }) => updateCartItem(input.productId, input.quantity),

    removeItem: ({ input }) => removeFromCart(input.productId),

    clear: () => clearCart(),
  },

  order: {
    list: () => sessionOrders,

    get: ({ input }) => {
      const order = sessionOrders.find((o) => o.id === input.id)
      if (!order) {
        throw new Error('Order not found')
      }
      return order
    },

    create: () => createOrder(),
  },
})

// Export products for use in components
export { products }

/**
 * Reset demo state - useful for testing or when switching scenarios
 */
export function resetDemoState() {
  sessionCart = { items: [], total: 0 }
  sessionOrders = []
}

/**
 * Pre-populate cart for demo scenarios
 */
export function setDemoCart(items: CartItem[]) {
  sessionCart = {
    items,
    total: calculateTotal(items),
  }
}

/**
 * Pre-populate orders for demo scenarios
 */
export function setDemoOrders(orders: Order[]) {
  sessionOrders = orders
}
