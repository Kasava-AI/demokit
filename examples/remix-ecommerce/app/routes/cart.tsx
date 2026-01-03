import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, useFetcher, Link } from '@remix-run/react'
import { createDemoLoader, createDemoAction } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'
import { getProductById, demoCart, calculateCartTotal } from '~/demo/data'
import type { Product, CartItem } from '~/types'

interface CartItemWithProduct extends CartItem {
  product: Product
}

interface LoaderData {
  items: CartItemWithProduct[]
  total: number
  itemCount: number
}

/**
 * Cart page loader
 */
export const loader = createDemoLoader<Response>({
  loader: async (_args: LoaderFunctionArgs) => {
    // In a real app, this would load from session/database
    const items = demoCart.items
      .map((item) => ({
        ...item,
        product: getProductById(item.product_id)!,
      }))
      .filter((item) => item.product)
    const total = calculateCartTotal(demoCart.items)
    return json<LoaderData>({ items, total, itemCount: items.length })
  },
  isEnabled: isDemoMode,
  fixture: () => {
    const items = demoCart.items
      .map((item) => ({
        ...item,
        product: getProductById(item.product_id)!,
      }))
      .filter((item) => item.product)
    const total = calculateCartTotal(demoCart.items)
    return json<LoaderData>({ items, total, itemCount: items.length })
  },
})

/**
 * Cart actions: update quantity, remove item
 */
export const action = createDemoAction<Response>({
  action: async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData()
    const intent = formData.get('intent')

    if (intent === 'update') {
      const product_id = formData.get('product_id') as string
      const quantity = parseInt(formData.get('quantity') as string) || 1
      return json({ success: true, action: 'updated', product_id, quantity })
    }

    if (intent === 'remove') {
      const product_id = formData.get('product_id') as string
      return json({ success: true, action: 'removed', product_id })
    }

    return json({ error: 'Invalid action' }, { status: 400 })
  },
  isEnabled: isDemoMode,
  fixture: {
    POST: async ({ formData }) => {
      const intent = formData?.get('intent')
      const product_id = formData?.get('product_id') as string

      if (intent === 'update') {
        const quantity = parseInt(formData?.get('quantity') as string) || 1
        return json({ success: true, action: 'updated', product_id, quantity })
      }

      if (intent === 'remove') {
        return json({ success: true, action: 'removed', product_id })
      }

      return json({ error: 'Invalid action' }, { status: 400 })
    },
  },
})

export default function Cart() {
  const { items, total, itemCount } = useLoaderData<LoaderData>()
  const fetcher = useFetcher()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Your cart is empty</h2>
          <p className="mt-2 text-gray-600">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
      <p className="mt-2 text-gray-600">
        {itemCount} item{itemCount !== 1 ? 's' : ''} in your cart
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {items.map((item) => (
              <div key={item.product_id} className="flex gap-4 p-4">
                {/* Product Image */}
                <Link
                  to={`/products/${item.product_id}`}
                  className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100"
                >
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                </Link>

                {/* Product Info */}
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between">
                    <div>
                      <Link
                        to={`/products/${item.product_id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {item.product.name}
                      </Link>
                      <p className="mt-1 text-sm capitalize text-gray-500">
                        {item.product.category}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900">
                      ${(item.product.price * item.quantity).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    {/* Quantity Controls */}
                    <fetcher.Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="product_id" value={item.product_id} />
                      <button
                        type="submit"
                        name="quantity"
                        value={Math.max(1, item.quantity - 1)}
                        className="rounded-lg border border-gray-300 p-1 hover:bg-gray-100"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        type="submit"
                        name="quantity"
                        value={item.quantity + 1}
                        className="rounded-lg border border-gray-300 p-1 hover:bg-gray-100"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </fetcher.Form>

                    {/* Remove Button */}
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="remove" />
                      <input type="hidden" name="product_id" value={item.product_id} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </fetcher.Form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{total > 500 ? 'Free' : '$9.99'}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (estimated)</span>
                <span>${(total * 0.08).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg font-medium text-gray-900">
                  <span>Total</span>
                  <span>
                    $
                    {(total + (total > 500 ? 0 : 9.99) + total * 0.08).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/checkout"
              className="mt-6 block w-full rounded-lg bg-blue-600 py-3 text-center font-medium text-white hover:bg-blue-700"
            >
              Proceed to Checkout
            </Link>

            <Link
              to="/"
              className="mt-4 block text-center text-sm text-blue-600 hover:underline"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
