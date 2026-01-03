'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/src/lib/trpc'
import { useDemoMode } from '@/app/providers'
import type { Order, CartItemWithProduct } from '@/app/types'

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string

  const { isHydrated } = useDemoMode()

  // Fetch order and products
  const { data: order, isLoading: orderLoading, error } = trpc.order.get.useQuery(
    { id: orderId },
    { enabled: isHydrated }
  )
  const { data: products = [] } = trpc.product.list.useQuery(
    undefined,
    { enabled: isHydrated }
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const isLoading = !isHydrated || orderLoading

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
        <p className="text-gray-500 mb-6">The order you are looking for does not exist.</p>
        <Link
          href="/orders"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Orders
        </Link>
      </div>
    )
  }

  const orderItems: CartItemWithProduct[] = order.items
    .map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.product_id)!,
    }))
    .filter((item) => item.product)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/orders" className="hover:text-gray-900 transition-colors">
              Orders
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">{order.id}</li>
        </ol>
      </nav>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{order.id}</h1>
              <p className="text-gray-500 mt-1">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <span
              className={`px-4 py-2 text-sm font-medium rounded-full capitalize ${getStatusColor(order.status)}`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {orderItems.map((item) => (
              <div key={item.product_id} className="flex gap-4">
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <Link
                    href={`/products/${item.product.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    ${item.product.price} x {item.quantity}
                  </p>
                </div>
                <span className="font-medium text-gray-900">
                  ${item.product.price * item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 bg-gray-50">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${order.total_amount}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <hr className="my-3 border-gray-200" />
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>${order.total_amount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <Link
          href="/orders"
          className="flex-1 py-3 text-center text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to Orders
        </Link>
        <Link
          href="/"
          className="flex-1 py-3 text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
