/**
 * Demo fixtures for Remix e-commerce example
 *
 * Provides loader and action fixtures for demo mode
 */

import { json } from '@remix-run/node'
import { demoProducts, demoCart, demoOrders, getProductById, calculateCartTotal } from './data'

/**
 * Loader fixtures for demo mode
 */
export const loaderFixtures: Record<string, () => Response> = {
  '/': () => {
    return json({
      products: demoProducts,
      categories: ['all', 'electronics', 'accessories'],
      selectedCategory: 'all',
      searchQuery: '',
    })
  },
}

/**
 * Action fixtures for demo mode
 */
export const actionFixtures: Record<string, { POST?: (args: { formData?: FormData }) => Response }> = {
  '/products/:id': {
    POST: ({ formData }) => {
      const productId = formData?.get('product_id') as string
      const quantity = parseInt(formData?.get('quantity') as string) || 1

      const existingIndex = demoCart.items.findIndex((item) => item.product_id === productId)
      if (existingIndex >= 0) {
        demoCart.items[existingIndex].quantity += quantity
      } else {
        demoCart.items.push({ product_id: productId, quantity })
      }
      demoCart.total = calculateCartTotal(demoCart.items)

      return json({ success: true, message: 'Added to cart' })
    },
  },
  '/cart': {
    POST: ({ formData }) => {
      const intent = formData?.get('intent')
      const productId = formData?.get('product_id') as string

      if (intent === 'update') {
        const quantity = parseInt(formData?.get('quantity') as string) || 1
        const existingIndex = demoCart.items.findIndex((item) => item.product_id === productId)
        if (existingIndex >= 0) {
          if (quantity <= 0) {
            demoCart.items.splice(existingIndex, 1)
          } else {
            demoCart.items[existingIndex].quantity = quantity
          }
        }
      } else if (intent === 'remove') {
        demoCart.items = demoCart.items.filter((item) => item.product_id !== productId)
      }

      demoCart.total = calculateCartTotal(demoCart.items)
      return json({ success: true, action: intent })
    },
  },
  '/checkout': {
    POST: ({ formData }) => {
      const email = formData?.get('email') as string
      const name = formData?.get('name') as string

      if (!email || !name) {
        return json({ error: 'Please fill in all required fields' }, { status: 400 })
      }

      const orderId = `ord-${Date.now().toString(36)}`
      const total = calculateCartTotal(demoCart.items)

      return json({
        success: true,
        order: {
          id: orderId,
          items: [...demoCart.items],
          total_amount: total,
          status: 'confirmed',
          created_at: new Date().toISOString(),
        },
        message: 'Order placed successfully!',
      })
    },
  },
}
