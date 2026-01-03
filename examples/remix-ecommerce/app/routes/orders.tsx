import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { createDemoLoader } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'
import { demoOrders, getProductById } from '~/demo/data'
import type { Product, CartItem, Order } from '~/types'

interface OrderItemWithProduct extends CartItem {
  product: Product
}

interface OrderWithProducts extends Omit<Order, 'items'> {
  items: OrderItemWithProduct[]
}

interface LoaderData {
  orders: OrderWithProducts[]
}

/**
 * Orders history page loader
 */
export const loader = createDemoLoader<Response>({
  loader: async (_args: LoaderFunctionArgs) => {
    // In a real app, this would load from database with user filtering
    const ordersWithProducts = demoOrders.map((order) => ({
      ...order,
      items: order.items
        .map((item) => ({
          ...item,
          product: getProductById(item.product_id)!,
        }))
        .filter((item) => item.product),
    }))
    return json<LoaderData>({ orders: ordersWithProducts })
  },
  isEnabled: isDemoMode,
  fixture: () => {
    const ordersWithProducts = demoOrders.map((order) => ({
      ...order,
      items: order.items
        .map((item) => ({
          ...item,
          product: getProductById(item.product_id)!,
        }))
        .filter((item) => item.product),
    }))
    return json<LoaderData>({ orders: ordersWithProducts })
  },
})

function getStatusColor(status: Order['status']) {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-100 text-blue-800'
    case 'shipped':
      return 'bg-yellow-100 text-yellow-800'
    case 'delivered':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function Orders() {
  const { orders } = useLoaderData<LoaderData>()

  if (orders.length === 0) {
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">No orders yet</h2>
          <p className="mt-2 text-gray-600">
            Start shopping to see your orders here.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
      <p className="mt-2 text-gray-600">
        {orders.length} order{orders.length !== 1 ? 's' : ''}
      </p>

      <div className="mt-8 space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            {/* Order Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <span className="text-sm text-gray-500">Order ID</span>
                  <p className="font-mono font-medium text-gray-900">{order.id}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Date</span>
                  <p className="font-medium text-gray-900">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Total</span>
                  <p className="font-medium text-gray-900">
                    ${order.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusColor(order.status)}`}
              >
                {order.status}
              </span>
            </div>

            {/* Order Items */}
            <div className="divide-y divide-gray-200 px-6">
              {order.items.map((item) => (
                <div key={item.product_id} className="flex gap-4 py-4">
                  <Link
                    to={`/products/${item.product_id}`}
                    className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex-1">
                    <Link
                      to={`/products/${item.product_id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {item.product.name}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500">Qty: {item.quantity}</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      ${(item.product.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Footer */}
            <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
              <span className="text-sm text-gray-500">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
              {order.status === 'delivered' && (
                <button className="text-sm text-blue-600 hover:underline">
                  Buy Again
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
