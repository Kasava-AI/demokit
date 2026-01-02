/**
 * Demo fixtures for the SWR e-commerce app
 *
 * Defines URL-based fixtures that DemoKit uses when demo mode is enabled.
 * These fixtures intercept SWR fetches and return mock data.
 */

import type {
  Product,
  Order,
  Cart,
  ProductsResponse,
  ProductDetailResponse,
  CartResponse,
  OrdersResponse,
  OrderDetailResponse,
  CartMutationResponse,
  CheckoutMutationResponse,
} from '@/types'

/**
 * Demo product catalog
 */
export const demoProducts: Product[] = [
  {
    id: 'p1',
    name: 'Laptop Pro',
    price: 999,
    category: 'electronics',
    stock: 15,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
    description:
      'Powerful laptop with M3 chip, 16GB RAM, and 512GB SSD. Perfect for developers and creative professionals.',
  },
  {
    id: 'p2',
    name: 'Wireless Headphones',
    price: 199,
    category: 'electronics',
    stock: 42,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    description:
      'Premium noise-canceling wireless headphones with 30-hour battery life and spatial audio support.',
  },
  {
    id: 'p3',
    name: 'Mechanical Keyboard',
    price: 149,
    category: 'accessories',
    stock: 28,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=300&fit=crop',
    description:
      'RGB mechanical keyboard with Cherry MX switches, programmable keys, and aluminum frame.',
  },
  {
    id: 'p4',
    name: 'USB-C Hub',
    price: 79,
    category: 'accessories',
    stock: 55,
    image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&h=300&fit=crop',
    description:
      '7-in-1 USB-C hub with HDMI, USB-A, SD card reader, and 100W power delivery passthrough.',
  },
  {
    id: 'p5',
    name: '4K Monitor',
    price: 449,
    category: 'electronics',
    stock: 8,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
    description:
      '27-inch 4K IPS monitor with USB-C connectivity, 99% sRGB coverage, and adjustable stand.',
  },
]

/**
 * Demo orders
 */
export let demoOrders: Order[] = [
  {
    id: 'ord-001',
    items: [
      { productId: 'p1', quantity: 1 },
      { productId: 'p3', quantity: 1 },
    ],
    total: 1148,
    status: 'delivered',
    createdAt: '2024-12-20T10:30:00Z',
  },
  {
    id: 'ord-002',
    items: [{ productId: 'p2', quantity: 2 }],
    total: 398,
    status: 'shipped',
    createdAt: '2024-12-23T14:15:00Z',
  },
]

/**
 * Demo cart state
 */
export let demoCart: Cart = {
  items: [
    { productId: 'p2', quantity: 1 },
    { productId: 'p4', quantity: 2 },
  ],
  total: 357,
}

/**
 * Calculate cart total from items
 */
function calculateTotal(items: Cart['items']): number {
  return items.reduce((sum, item) => {
    const product = demoProducts.find((p) => p.id === item.productId)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
}

/**
 * Get products for cart items
 */
function getCartProducts(): Product[] {
  return demoCart.items
    .map((item) => demoProducts.find((p) => p.id === item.productId))
    .filter((p): p is Product => p !== undefined)
}

/**
 * URL pattern matching utility
 */
function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const pathParts = path.split('?')[0].split('/')

  if (patternParts.length !== pathParts.length) {
    return null
  }

  const params: Record<string, string> = {}

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = pathPart
    } else if (patternPart !== pathPart) {
      return null
    }
  }

  return params
}

/**
 * Parse search params from URL
 */
function getSearchParams(url: string): URLSearchParams {
  const questionMark = url.indexOf('?')
  if (questionMark === -1) {
    return new URLSearchParams()
  }
  return new URLSearchParams(url.slice(questionMark + 1))
}

/**
 * Loader fixtures for GET requests
 *
 * Uses URL pattern matching to return appropriate mock data
 */
export const fixtures: Record<
  string,
  (context: { params: Record<string, string>; url: string }) => unknown
> = {
  // Products list
  '/api/products': ({ url }): ProductsResponse => {
    const searchParams = getSearchParams(url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const category = searchParams.get('category') || ''

    let filteredProducts = demoProducts

    if (search) {
      filteredProducts = filteredProducts.filter(
        (p) => p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search)
      )
    }

    if (category) {
      filteredProducts = filteredProducts.filter((p) => p.category === category)
    }

    return {
      products: filteredProducts,
      categories: ['electronics', 'accessories'],
    }
  },

  // Product detail
  '/api/products/:id': ({ params }): ProductDetailResponse => {
    const product = demoProducts.find((p) => p.id === params.id)

    if (!product) {
      throw new Error('Product not found')
    }

    // Get related products (same category, excluding current)
    const relatedProducts = demoProducts
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 3)

    return {
      product,
      relatedProducts,
    }
  },

  // Cart
  '/api/cart': (): CartResponse => {
    return {
      cart: {
        ...demoCart,
        total: calculateTotal(demoCart.items),
      },
      products: getCartProducts(),
    }
  },

  // Orders list
  '/api/orders': (): OrdersResponse => ({
    orders: demoOrders,
  }),

  // Order detail
  '/api/orders/:id': ({ params }): OrderDetailResponse => {
    const order = demoOrders.find((o) => o.id === params.id)

    if (!order) {
      throw new Error('Order not found')
    }

    const products = order.items
      .map((item) => demoProducts.find((p) => p.id === item.productId))
      .filter((p): p is Product => p !== undefined)

    return {
      order,
      products,
    }
  },
}

/**
 * Mutation fixtures for POST/PUT/DELETE requests
 */
export const mutationFixtures = {
  // Add to cart
  addToCart: ({ arg }: { arg: { productId: string; quantity?: number } }): CartMutationResponse => {
    const { productId, quantity = 1 } = arg
    const existingIndex = demoCart.items.findIndex((item) => item.productId === productId)

    if (existingIndex >= 0) {
      demoCart.items[existingIndex].quantity += quantity
    } else {
      demoCart.items.push({ productId, quantity })
    }

    demoCart.total = calculateTotal(demoCart.items)

    return {
      success: true,
      message: 'Item added to cart',
      cart: { ...demoCart },
    }
  },

  // Update cart item quantity
  updateCartItem: ({
    arg,
  }: {
    arg: { productId: string; quantity: number }
  }): CartMutationResponse => {
    const { productId, quantity } = arg
    const existingIndex = demoCart.items.findIndex((item) => item.productId === productId)

    if (existingIndex >= 0) {
      if (quantity <= 0) {
        demoCart.items.splice(existingIndex, 1)
      } else {
        demoCart.items[existingIndex].quantity = quantity
      }
    }

    demoCart.total = calculateTotal(demoCart.items)

    return {
      success: true,
      message: 'Cart updated',
      cart: { ...demoCart },
    }
  },

  // Remove from cart
  removeFromCart: ({ arg }: { arg: { productId: string } }): CartMutationResponse => {
    const { productId } = arg
    demoCart.items = demoCart.items.filter((item) => item.productId !== productId)
    demoCart.total = calculateTotal(demoCart.items)

    return {
      success: true,
      message: 'Item removed from cart',
      cart: { ...demoCart },
    }
  },

  // Clear cart
  clearCart: (): CartMutationResponse => {
    demoCart = { items: [], total: 0 }

    return {
      success: true,
      message: 'Cart cleared',
      cart: { ...demoCart },
    }
  },

  // Checkout
  checkout: ({
    arg,
  }: {
    arg: { email: string; name: string }
  }): CheckoutMutationResponse => {
    const { email, name } = arg

    if (!email || !name) {
      return {
        success: false,
        error: 'Please fill in all required fields',
      }
    }

    // Simulate order creation
    const orderId = `ord-${Date.now().toString(36)}`

    // Add to demo orders
    demoOrders.unshift({
      id: orderId,
      items: [...demoCart.items],
      total: demoCart.total,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    })

    // Clear the cart
    demoCart = { items: [], total: 0 }

    return {
      success: true,
      orderId,
    }
  },
}

/**
 * Get fixture for a URL
 */
export function getFixture(url: string): unknown {
  // Try exact match first
  if (fixtures[url]) {
    return fixtures[url]({ params: {}, url })
  }

  // Try pattern matching
  for (const pattern of Object.keys(fixtures)) {
    const params = matchPath(pattern, url.split('?')[0])
    if (params !== null) {
      return fixtures[pattern]({ params, url })
    }
  }

  return null
}

/**
 * Get mutation fixture
 */
export function getMutationFixture(
  key: keyof typeof mutationFixtures
): (typeof mutationFixtures)[typeof key] | null {
  return mutationFixtures[key] ?? null
}

/**
 * Reset demo state (useful for testing)
 */
export function resetDemoState(): void {
  demoCart = {
    items: [
      { productId: 'p2', quantity: 1 },
      { productId: 'p4', quantity: 2 },
    ],
    total: 357,
  }

  demoOrders = [
    {
      id: 'ord-001',
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p3', quantity: 1 },
      ],
      total: 1148,
      status: 'delivered',
      createdAt: '2024-12-20T10:30:00Z',
    },
    {
      id: 'ord-002',
      items: [{ productId: 'p2', quantity: 2 }],
      total: 398,
      status: 'shipped',
      createdAt: '2024-12-23T14:15:00Z',
    },
  ]
}
