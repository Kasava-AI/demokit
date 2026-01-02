/**
 * Router configuration with DemoKit integration
 *
 * Uses createDemoRoutes to wrap the route configuration
 * with demo fixtures that are used when demo mode is enabled.
 */

import { createBrowserRouter, type RouteObject } from 'react-router'
import { createDemoRoutes } from '@demokit-ai/react-router'

// Layout
import Layout from '@/routes/Layout'

// Pages
import Products from '@/routes/Products'
import ProductDetail from '@/routes/ProductDetail'
import Cart from '@/routes/Cart'
import Checkout from '@/routes/Checkout'
import Orders from '@/routes/Orders'
import OrderDetail from '@/routes/OrderDetail'
import OrderConfirmation from '@/routes/OrderConfirmation'

// Demo fixtures
import { loaderFixtures, actionFixtures } from '@/demo/fixtures'

// Demo mode check
import { isDemoEnabled } from '@/lib/demo-mode'

/**
 * Base route configuration
 *
 * These routes define the real loaders and actions that
 * would fetch from your actual API in production.
 */
const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Products />,
        loader: async () => {
          // In real app: fetch from API
          throw new Error('Demo mode required - enable demo mode to see data')
        },
      },
      {
        path: 'products',
        element: <Products />,
        loader: async ({ request }) => {
          // In real app: fetch from API with search params
          console.log('Real loader called with:', request.url)
          throw new Error('Demo mode required - enable demo mode to see data')
        },
      },
      {
        path: 'products/:id',
        element: <ProductDetail />,
        loader: async ({ params }) => {
          // In real app: fetch product by ID
          console.log('Real product loader called for:', params.id)
          throw new Error('Demo mode required - enable demo mode to see data')
        },
        action: async ({ request, params }) => {
          // In real app: add to cart via API
          console.log('Real add to cart action for:', params.id)
          const formData = await request.formData()
          console.log('Form data:', Object.fromEntries(formData))
          throw new Error('Demo mode required')
        },
      },
      {
        path: 'cart',
        element: <Cart />,
        loader: async () => {
          // In real app: fetch cart from API
          throw new Error('Demo mode required - enable demo mode to see data')
        },
        action: async ({ request }) => {
          // In real app: update cart via API
          const formData = await request.formData()
          console.log('Real cart action:', Object.fromEntries(formData))
          throw new Error('Demo mode required')
        },
      },
      {
        path: 'checkout',
        element: <Checkout />,
        loader: async () => {
          // In real app: fetch cart for checkout
          throw new Error('Demo mode required - enable demo mode to see data')
        },
        action: async ({ request }) => {
          // In real app: process checkout via API
          const formData = await request.formData()
          console.log('Real checkout action:', Object.fromEntries(formData))
          throw new Error('Demo mode required')
        },
      },
      {
        path: 'order-confirmation/:orderId',
        element: <OrderConfirmation />,
      },
      {
        path: 'orders',
        element: <Orders />,
        loader: async () => {
          // In real app: fetch orders from API
          throw new Error('Demo mode required - enable demo mode to see data')
        },
      },
      {
        path: 'orders/:id',
        element: <OrderDetail />,
        loader: async ({ params }) => {
          // In real app: fetch order by ID
          console.log('Real order loader called for:', params.id)
          throw new Error('Demo mode required - enable demo mode to see data')
        },
      },
    ],
  },
]

/**
 * Create demo-aware routes
 *
 * This wraps all loaders and actions to check demo mode
 * and return fixtures when enabled.
 */
const demoRoutes = createDemoRoutes(routes, {
  isEnabled: isDemoEnabled,
  loaders: loaderFixtures,
  actions: actionFixtures,
  delay: 200, // Simulate network latency
  onMissing: (type, path) => {
    console.warn(`[DemoKit] No ${type} fixture found for: ${path}`)
  },
})

/**
 * Browser router instance
 */
export const router = createBrowserRouter(demoRoutes)
