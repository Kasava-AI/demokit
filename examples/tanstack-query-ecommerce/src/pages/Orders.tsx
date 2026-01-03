import { Link } from 'react-router-dom'
import { useOrders } from '@/hooks/useOrders'
import { useProducts } from '@/hooks/useProducts'

/**
 * Order history page
 */
export default function Orders() {
  const { data: orders = [], isLoading, error } = useOrders()
  const { data: products = [] } = useProducts()

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'badge-primary'
      case 'shipped':
        return 'badge-warning'
      case 'delivered':
        return 'badge-success'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="border-b bg-gray-50 p-4">
                <div className="h-4 w-32 rounded bg-gray-200" />
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-gray-200" />
                    <div className="h-3 w-16 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Error loading orders</h1>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <svg
            className="mx-auto mb-6 h-24 w-24 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">No orders yet</h1>
          <p className="mb-8 text-gray-600">
            Start shopping to see your order history here.
          </p>
          <Link to="/products" className="btn btn-primary btn-lg">
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Order History</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="card overflow-hidden">
            {/* Order Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="font-mono font-medium text-gray-900">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-medium text-gray-900">${order.total_amount.toFixed(2)}</p>
                </div>
              </div>
              <span className={`badge capitalize ${getStatusBadgeClass(order.status)}`}>
                {order.status}
              </span>
            </div>

            {/* Order Items */}
            <div className="divide-y p-4">
              {order.items.map((item) => {
                const product = products.find((p) => p.id === item.product_id)
                if (!product) return null
                return (
                  <div key={item.product_id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <Link
                        to={`/products/${product.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {product.name}
                      </Link>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      ${(product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Order Actions */}
            <div className="flex justify-end gap-4 border-t bg-gray-50 p-4">
              <Link
                to={`/orders/${order.id}`}
                className="btn btn-outline btn-sm"
              >
                View Details
              </Link>
              {order.status === 'delivered' && (
                <button className="btn btn-primary btn-sm">Reorder</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
