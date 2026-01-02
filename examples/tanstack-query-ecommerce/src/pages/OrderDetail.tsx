import { useParams, Link } from 'react-router-dom'
import { useOrder } from '@/hooks/useOrders'
import { useProducts } from '@/hooks/useProducts'

/**
 * Single order detail page
 */
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, error } = useOrder(id!)
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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="card p-6">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-20 w-20 animate-pulse rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Order not found</h1>
          <p className="mb-8 text-gray-600">
            The order you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/orders" className="btn btn-primary">
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  // Calculate subtotal
  const subtotal = order.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
  const shipping = subtotal > 100 ? 0 : 9.99
  const tax = subtotal * 0.08

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/orders" className="hover:text-gray-900">
          Orders
        </Link>
        <span>/</span>
        <span className="text-gray-900">{order.id}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Order Details */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order {order.id}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Placed on {formatDate(order.createdAt)}
                </p>
              </div>
              <span className={`badge capitalize ${getStatusBadgeClass(order.status)}`}>
                {order.status}
              </span>
            </div>

            {/* Order Items */}
            <div className="divide-y p-6">
              <h2 className="mb-4 font-semibold text-gray-900">Items</h2>
              {order.items.map((item) => {
                const product = products.find((p) => p.id === item.productId)
                if (!product) return null
                return (
                  <div key={item.productId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={product.image}
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
                      <p className="mt-1 text-sm text-gray-500">
                        ${product.price} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      ${(product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Order Timeline */}
            <div className="border-t p-6">
              <h2 className="mb-4 font-semibold text-gray-900">Order Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Order Confirmed</p>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>

                {(order.status === 'shipped' || order.status === 'delivered') && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Shipped</p>
                      <p className="text-sm text-gray-500">Package is on its way</p>
                    </div>
                  </div>
                )}

                {order.status === 'delivered' && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Delivered</p>
                      <p className="text-sm text-gray-500">Package has been delivered</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="font-medium text-gray-900">${subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Shipping</dt>
                <dd className="font-medium text-gray-900">
                  {shipping === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Tax</dt>
                <dd className="font-medium text-gray-900">${tax.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="font-bold text-gray-900">${order.total.toFixed(2)}</dd>
              </div>
            </dl>

            <div className="mt-6 space-y-3">
              <Link to="/orders" className="btn btn-outline w-full">
                Back to Orders
              </Link>
              <Link to="/products" className="btn btn-primary w-full">
                Shop Again
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
