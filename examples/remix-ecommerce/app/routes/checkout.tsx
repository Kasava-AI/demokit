import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { useLoaderData, useActionData, Form, Link, useNavigation } from '@remix-run/react'
import { createDemoLoader, createDemoAction } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'
import { getProductById, demoCart, calculateCartTotal } from '~/demo/data'
import type { Product, CartItem, Order } from '~/types'

interface CartItemWithProduct extends CartItem {
  product: Product
}

interface LoaderData {
  items: CartItemWithProduct[]
  subtotal: number
  shipping: number
  tax: number
  total: number
}

interface ActionData {
  success?: boolean
  order?: Order
  message?: string
  error?: string
}

/**
 * Checkout page loader
 */
export const loader = createDemoLoader<Response>({
  loader: async (_args: LoaderFunctionArgs) => {
    const items = demoCart.items
      .map((item) => ({
        ...item,
        product: getProductById(item.productId)!,
      }))
      .filter((item) => item.product)

    if (items.length === 0) {
      return redirect('/cart')
    }

    const subtotal = calculateCartTotal(demoCart.items)
    const shipping = subtotal > 500 ? 0 : 9.99
    const tax = subtotal * 0.08
    const total = subtotal + shipping + tax

    return json<LoaderData>({ items, subtotal, shipping, tax, total })
  },
  isEnabled: isDemoMode,
  fixture: () => {
    const items = demoCart.items
      .map((item) => ({
        ...item,
        product: getProductById(item.productId)!,
      }))
      .filter((item) => item.product)

    const subtotal = calculateCartTotal(demoCart.items)
    const shipping = subtotal > 500 ? 0 : 9.99
    const tax = subtotal * 0.08
    const total = subtotal + shipping + tax

    return json<LoaderData>({ items, subtotal, shipping, tax, total })
  },
})

/**
 * Checkout action - place order
 */
export const action = createDemoAction<Response>({
  action: async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData()

    // Validate required fields
    const email = formData.get('email') as string
    const name = formData.get('name') as string

    if (!email || !name) {
      return json<ActionData>({ error: 'Please fill in all required fields' }, { status: 400 })
    }

    // Create order
    const orderId = `ord-${Date.now().toString(36)}`
    const total = calculateCartTotal(demoCart.items)

    const order: Order = {
      id: orderId,
      items: [...demoCart.items],
      total,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }

    return json<ActionData>({
      success: true,
      order,
      message: 'Order placed successfully!',
    })
  },
  isEnabled: isDemoMode,
  fixture: {
    POST: async ({ formData }) => {
      const email = formData?.get('email') as string
      const name = formData?.get('name') as string

      if (!email || !name) {
        return json<ActionData>({ error: 'Please fill in all required fields' }, { status: 400 })
      }

      const orderId = `ord-${Date.now().toString(36)}`
      const total = calculateCartTotal(demoCart.items)

      const order: Order = {
        id: orderId,
        items: [...demoCart.items],
        total,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      }

      return json<ActionData>({
        success: true,
        order,
        message: 'Order placed successfully!',
      })
    },
  },
})

export default function Checkout() {
  const { items, subtotal, shipping, tax, total } = useLoaderData<LoaderData>()
  const actionData = useActionData<ActionData>()
  const navigation = useNavigation()

  const isSubmitting = navigation.state === 'submitting'

  // Show order confirmation
  if (actionData?.success && actionData.order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="mt-2 text-gray-600">{actionData.message}</p>

          <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 text-left">
            <div className="flex justify-between border-b border-gray-200 pb-4">
              <span className="text-gray-600">Order ID</span>
              <span className="font-mono font-medium text-gray-900">
                {actionData.order.id}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-4">
              <span className="text-gray-600">Status</span>
              <span className="capitalize text-green-600">{actionData.order.status}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-4">
              <span className="text-gray-600">Items</span>
              <span className="text-gray-900">{actionData.order.items.length} products</span>
            </div>
            <div className="flex justify-between pt-4">
              <span className="text-gray-600">Total</span>
              <span className="text-lg font-bold text-gray-900">
                ${actionData.order.total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/orders"
              className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              View Orders
            </Link>
            <Link
              to="/"
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Checkout Form */}
        <div>
          <Form method="post" className="space-y-6">
            {/* Contact Information */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    defaultValue="demo@example.com"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    defaultValue="Demo User"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-medium text-gray-900">Shipping Address</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    defaultValue="123 Demo Street"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      defaultValue="San Francisco"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      id="zip"
                      name="zip"
                      defaultValue="94102"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment (Demo) */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-medium text-gray-900">Payment</h2>
              <p className="mt-2 text-sm text-gray-500">
                This is a demo. No real payment will be processed.
              </p>

              <div className="mt-4">
                <label htmlFor="card" className="block text-sm font-medium text-gray-700">
                  Card Number
                </label>
                <input
                  type="text"
                  id="card"
                  name="card"
                  defaultValue="4242 4242 4242 4242"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Error Message */}
            {actionData?.error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-800">{actionData.error}</div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full rounded-lg py-3 font-medium text-white ${
                isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </button>
          </Form>
        </div>

        {/* Order Summary */}
        <div>
          <div className="sticky top-8 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>

            {/* Items */}
            <div className="mt-6 divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4 py-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{item.product.name}</h3>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    ${(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-4 text-lg font-medium text-gray-900">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Link
              to="/cart"
              className="mt-6 block text-center text-sm text-blue-600 hover:underline"
            >
              Edit Cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
