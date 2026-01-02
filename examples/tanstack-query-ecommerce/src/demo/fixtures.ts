/**
 * Demo fixtures for the e-commerce app
 *
 * Defines query and mutation fixtures that DemoKit uses
 * when demo mode is enabled with TanStack Query.
 */

import type {
  Product,
  Order,
  Cart,
  CartItem,
  AddToCartVariables,
  UpdateCartItemVariables,
  RemoveFromCartVariables,
  CheckoutVariables,
  CartMutationResponse,
  CheckoutResponse,
} from '@/types'
import type { QueryFixtureMapObject, MutationFixtureMapObject } from '@demokit-ai/tanstack-query'

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
 * Demo cart state - mutable for demo purposes
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
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const product = demoProducts.find((p) => p.id === item.productId)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
}

/**
 * Get current cart state
 */
export function getCart(): Cart {
  return {
    ...demoCart,
    total: calculateTotal(demoCart.items),
  }
}

/**
 * Reset cart to initial state
 */
export function resetCart(): void {
  demoCart = {
    items: [
      { productId: 'p2', quantity: 1 },
      { productId: 'p4', quantity: 2 },
    ],
    total: 357,
  }
}

/**
 * Query fixtures for TanStack Query
 *
 * Uses query key pattern matching:
 * - '["products"]' - all products
 * - '["products", { category: ":category" }]' - filtered by category
 * - '["products", ":id"]' - single product by ID
 * - '["cart"]' - current cart
 * - '["orders"]' - all orders
 * - '["orders", ":id"]' - single order by ID
 */
export const queryFixtures: QueryFixtureMapObject = {
  // All products
  '["products"]': () => demoProducts,

  // Products filtered by category
  '["products", { "category": ":category" }]': ({ params }) => {
    const category = params.category as string
    return demoProducts.filter((p) => p.category === category)
  },

  // Products filtered by search
  '["products", { "search": ":search" }]': ({ params }) => {
    const search = (params.search as string).toLowerCase()
    return demoProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
    )
  },

  // Products filtered by both category and search
  '["products", { "category": ":category", "search": ":search" }]': ({ params }) => {
    const category = params.category as string
    const search = (params.search as string).toLowerCase()
    return demoProducts.filter(
      (p) =>
        p.category === category &&
        (p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search))
    )
  },

  // Single product by ID
  '["products", ":id"]': ({ params }) => {
    const product = demoProducts.find((p) => p.id === params.id)
    if (!product) {
      throw new Error('Product not found')
    }
    return product
  },

  // Related products (same category, excluding current)
  '["products", ":id", "related"]': ({ params }) => {
    const product = demoProducts.find((p) => p.id === params.id)
    if (!product) return []
    return demoProducts
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 3)
  },

  // Current cart
  '["cart"]': () => getCart(),

  // All orders
  '["orders"]': () => demoOrders,

  // Single order by ID
  '["orders", ":id"]': ({ params }) => {
    const order = demoOrders.find((o) => o.id === params.id)
    if (!order) {
      throw new Error('Order not found')
    }
    return order
  },
}

/**
 * Mutation fixtures for TanStack Query
 *
 * Each mutation fixture receives { variables, queryClient }
 * and should return the mutation result.
 */
export const mutationFixtures: MutationFixtureMapObject = {
  // Add item to cart
  addToCart: ({ variables, queryClient }) => {
    const { productId, quantity } = variables as AddToCartVariables
    const existingIndex = demoCart.items.findIndex((item) => item.productId === productId)

    if (existingIndex >= 0) {
      demoCart.items[existingIndex].quantity += quantity
    } else {
      demoCart.items.push({ productId, quantity })
    }

    demoCart.total = calculateTotal(demoCart.items)

    // Invalidate cart query
    queryClient.invalidateQueries({ queryKey: ['cart'] })

    return {
      success: true,
      message: 'Item added to cart',
      cart: { ...demoCart },
    } as CartMutationResponse
  },

  // Update cart item quantity
  updateCartItem: ({ variables, queryClient }) => {
    const { productId, quantity } = variables as UpdateCartItemVariables
    const existingIndex = demoCart.items.findIndex((item) => item.productId === productId)

    if (existingIndex >= 0) {
      if (quantity <= 0) {
        demoCart.items.splice(existingIndex, 1)
      } else {
        demoCart.items[existingIndex].quantity = quantity
      }
    }

    demoCart.total = calculateTotal(demoCart.items)

    // Invalidate cart query
    queryClient.invalidateQueries({ queryKey: ['cart'] })

    return {
      success: true,
      message: 'Cart updated',
      cart: { ...demoCart },
    } as CartMutationResponse
  },

  // Remove item from cart
  removeFromCart: ({ variables, queryClient }) => {
    const { productId } = variables as RemoveFromCartVariables
    demoCart.items = demoCart.items.filter((item) => item.productId !== productId)
    demoCart.total = calculateTotal(demoCart.items)

    // Invalidate cart query
    queryClient.invalidateQueries({ queryKey: ['cart'] })

    return {
      success: true,
      message: 'Item removed from cart',
      cart: { ...demoCart },
    } as CartMutationResponse
  },

  // Clear entire cart
  clearCart: ({ queryClient }) => {
    demoCart = { items: [], total: 0 }

    // Invalidate cart query
    queryClient.invalidateQueries({ queryKey: ['cart'] })

    return {
      success: true,
      message: 'Cart cleared',
      cart: { ...demoCart },
    } as CartMutationResponse
  },

  // Complete checkout
  checkout: ({ variables, queryClient }) => {
    const checkoutData = variables as CheckoutVariables

    if (!checkoutData.email || !checkoutData.name) {
      return {
        success: false,
        error: 'Please fill in all required fields',
      } as CheckoutResponse
    }

    if (demoCart.items.length === 0) {
      return {
        success: false,
        error: 'Your cart is empty',
      } as CheckoutResponse
    }

    // Create new order
    const orderId = `ord-${Date.now().toString(36)}`
    const newOrder: Order = {
      id: orderId,
      items: [...demoCart.items],
      total: demoCart.total,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }

    // Add to orders
    demoOrders = [newOrder, ...demoOrders]

    // Clear the cart
    demoCart = { items: [], total: 0 }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['cart'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })

    return {
      success: true,
      orderId,
    } as CheckoutResponse
  },
}
