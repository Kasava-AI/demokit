'use client'

import Link from 'next/link'
import { trpc } from '@/src/lib/trpc'
import { useDemoMode } from '@/app/providers'
import type { Order } from '@/app/types'

export default function OrdersPage() {
  const { isHydrated } = useDemoMode()

  // Fetch orders and products
  const { data: orders = [], isLoading: ordersLoading } = trpc.order.list.useQuery(
    undefined,
    { enabled: isHydrated }
  )
  const { data: products = [] } = trpc.product.list.useQuery(
    undefined,
    { enabled: isHydrated }
  )

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name ?? 'Unknown Product'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700'
      case 'shipped':
        return 'bg-amber-100 text-amber-700'
      case 'delivered':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const isLoading = !isHydrated || ordersLoading

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8 animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{order.id}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {getProductName(item.product_id)} x {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <hr className="mb-4" />

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {order.items.reduce((s, i) => s + i.quantity, 0)} items
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    ${order.total_amount}
                  </span>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}
