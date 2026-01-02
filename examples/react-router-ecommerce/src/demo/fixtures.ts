/**
 * Demo fixtures for the e-commerce app
 *
 * Defines loader and action fixtures that DemoKit uses
 * when demo mode is enabled.
 */

import { defineLoaderFixtures, defineActionFixtures } from '@demokit-ai/react-router'
import type {
  Product,
  Order,
  Cart,
  ProductsLoaderData,
  ProductDetailLoaderData,
  CartLoaderData,
  OrdersLoaderData,
  CartActionData,
  CheckoutActionData,
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
export const demoOrders: Order[] = [
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
let demoCart: Cart = {
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
 * Loader fixtures for all routes
 */
export const loaderFixtures = defineLoaderFixtures({
  // Products list page
  '/': (): ProductsLoaderData => ({
    products: demoProducts,
    categories: ['electronics', 'accessories'],
  }),

  // Products with search/filter
  '/products': ({ request }): ProductsLoaderData => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() || ''
    const category = url.searchParams.get('category') || ''

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

  // Product detail page
  '/products/:id': ({ params }): ProductDetailLoaderData => {
    const product = demoProducts.find((p) => p.id === params.id)

    if (!product) {
      throw new Response('Product not found', { status: 404 })
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

  // Cart page
  '/cart': (): CartLoaderData => {
    // Get products for cart items
    const cartProducts = demoCart.items
      .map((item) => demoProducts.find((p) => p.id === item.productId))
      .filter((p): p is Product => p !== undefined)

    return {
      cart: {
        ...demoCart,
        total: calculateTotal(demoCart.items),
      },
      products: cartProducts,
    }
  },

  // Checkout page
  '/checkout': (): CartLoaderData => {
    const cartProducts = demoCart.items
      .map((item) => demoProducts.find((p) => p.id === item.productId))
      .filter((p): p is Product => p !== undefined)

    return {
      cart: {
        ...demoCart,
        total: calculateTotal(demoCart.items),
      },
      products: cartProducts,
    }
  },

  // Orders page
  '/orders': (): OrdersLoaderData => ({
    orders: demoOrders,
  }),

  // Order detail page
  '/orders/:id': ({ params }) => {
    const order = demoOrders.find((o) => o.id === params.id)

    if (!order) {
      throw new Response('Order not found', { status: 404 })
    }

    const products = order.items
      .map((item) => demoProducts.find((p) => p.id === item.productId))
      .filter((p): p is Product => p !== undefined)

    return {
      order,
      products,
    }
  },
})

/**
 * Action fixtures for mutations
 */
export const actionFixtures = defineActionFixtures({
  // Cart actions (add, update, remove)
  '/cart': {
    POST: async ({ formData }): Promise<CartActionData> => {
      const action = formData?.get('action') as string
      const productId = formData?.get('productId') as string

      switch (action) {
        case 'add': {
          const quantity = Number(formData?.get('quantity') || 1)
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
        }

        case 'update': {
          const quantity = Number(formData?.get('quantity') || 0)
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
        }

        case 'remove': {
          demoCart.items = demoCart.items.filter((item) => item.productId !== productId)
          demoCart.total = calculateTotal(demoCart.items)

          return {
            success: true,
            message: 'Item removed from cart',
            cart: { ...demoCart },
          }
        }

        case 'clear': {
          demoCart = { items: [], total: 0 }

          return {
            success: true,
            message: 'Cart cleared',
            cart: { ...demoCart },
          }
        }

        default:
          return {
            success: false,
            message: 'Unknown action',
          }
      }
    },
  },

  // Checkout action
  '/checkout': {
    POST: async ({ formData }): Promise<CheckoutActionData> => {
      // Validate required fields
      const email = formData?.get('email') as string
      const name = formData?.get('name') as string

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
  },

  // Add to cart from product detail page
  '/products/:id': {
    POST: async ({ params, formData }): Promise<CartActionData> => {
      const productId = params.id
      const quantity = Number(formData?.get('quantity') || 1)

      if (!productId) {
        return {
          success: false,
          message: 'Product ID required',
        }
      }

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
  },
})
