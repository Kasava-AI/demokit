import { json } from '@remix-run/node'
import {
  createFixtureStore,
  defineRemixLoaderFixtures,
  defineRemixActionFixtures,
} from '@demokit-ai/remix'
import {
  demoProducts,
  demoCart,
  demoOrders,
  getProductById,
  getProductsByCategory,
  searchProducts,
  calculateCartTotal,
} from './data'
import type { Cart, CartItem, Order } from '~/types'

/**
 * Define all loader fixtures for the e-commerce app
 */
export const loaderFixtures = defineRemixLoaderFixtures({
  // Products list - supports category filtering and search
  '/': ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category') ?? undefined
    const query = url.searchParams.get('q')

    let products = demoProducts
    if (query) {
      products = searchProducts(query)
    } else if (category && category !== 'all') {
      products = getProductsByCategory(category)
    }

    return json({
      products,
      categories: ['all', 'electronics', 'accessories'],
      selectedCategory: category ?? 'all',
      searchQuery: query ?? '',
    })
  },

  // Single product details
  '/products/:id': ({ params }) => {
    const product = getProductById(params.id!)
    if (!product) {
      throw json({ error: 'Product not found' }, { status: 404 })
    }
    return json({ product })
  },

  // Cart page
  '/cart': () => {
    const items = demoCart.items.map((item) => ({
      ...item,
      product: getProductById(item.productId)!,
    }))
    const total = calculateCartTotal(demoCart.items)
    return json({ items, total, itemCount: demoCart.items.length })
  },

  // Checkout page
  '/checkout': () => {
    const items = demoCart.items.map((item) => ({
      ...item,
      product: getProductById(item.productId)!,
    }))
    const subtotal = calculateCartTotal(demoCart.items)
    const shipping = subtotal > 500 ? 0 : 9.99
    const tax = subtotal * 0.08
    const total = subtotal + shipping + tax
    return json({ items, subtotal, shipping, tax, total })
  },

  // Order history
  '/orders': () => {
    const ordersWithProducts = demoOrders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: getProductById(item.productId)!,
      })),
    }))
    return json({ orders: ordersWithProducts })
  },
})

/**
 * In-memory cart state for demo actions
 * This simulates session-based cart storage
 */
let sessionCart: Cart = { ...demoCart }

/**
 * Define all action fixtures for the e-commerce app
 */
export const actionFixtures = defineRemixActionFixtures({
  // Add to cart
  '/cart/add': {
    POST: async ({ formData }) => {
      const productId = formData?.get('productId') as string
      const quantity = parseInt(formData?.get('quantity') as string) || 1

      const product = getProductById(productId)
      if (!product) {
        return json({ error: 'Product not found' }, { status: 404 })
      }

      const existingItem = sessionCart.items.find((i) => i.productId === productId)
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        sessionCart.items.push({ productId, quantity })
      }
      sessionCart.updatedAt = new Date().toISOString()

      return json({
        success: true,
        message: `Added ${product.name} to cart`,
        cart: sessionCart,
      })
    },
  },

  // Update cart item quantity
  '/cart/update': {
    POST: async ({ formData }) => {
      const productId = formData?.get('productId') as string
      const quantity = parseInt(formData?.get('quantity') as string) || 1

      const itemIndex = sessionCart.items.findIndex((i) => i.productId === productId)
      if (itemIndex === -1) {
        return json({ error: 'Item not in cart' }, { status: 404 })
      }

      if (quantity <= 0) {
        sessionCart.items.splice(itemIndex, 1)
      } else {
        sessionCart.items[itemIndex].quantity = quantity
      }
      sessionCart.updatedAt = new Date().toISOString()

      return json({ success: true, cart: sessionCart })
    },
  },

  // Remove from cart
  '/cart/remove': {
    POST: async ({ formData }) => {
      const productId = formData?.get('productId') as string

      sessionCart.items = sessionCart.items.filter((i) => i.productId !== productId)
      sessionCart.updatedAt = new Date().toISOString()

      return json({ success: true, cart: sessionCart })
    },
  },

  // Checkout / place order
  '/checkout': {
    POST: async () => {
      const orderId = `ord-${Date.now().toString(36)}`
      const total = calculateCartTotal(sessionCart.items)

      const newOrder: Order = {
        id: orderId,
        items: [...sessionCart.items],
        total,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      }

      // Clear cart after checkout
      sessionCart = { items: [], updatedAt: new Date().toISOString() }

      return json({
        success: true,
        order: newOrder,
        message: 'Order placed successfully!',
      })
    },
  },
})

/**
 * Create the centralized fixture store
 */
export const fixtureStore = createFixtureStore({
  loaders: loaderFixtures,
  actions: actionFixtures,
})

/**
 * Reset cart to initial demo state (useful for testing)
 */
export function resetDemoCart(): void {
  sessionCart = { ...demoCart, items: [...demoCart.items] }
}
