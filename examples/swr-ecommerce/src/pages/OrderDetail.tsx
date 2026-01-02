import { useParams, Link } from 'react-router-dom'
import { useOrder } from '@/hooks'

/**
 * Order detail page
 */
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { order, products, isLoading, error } = useOrder(id)

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="mb-6 flex gap-2">
            <div className="h-4 w-16 rounded bg-gray-200" />
            <div className="h-4 w-4 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
          <div className="mb-8 flex items-center justify-between">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-6 w-20 rounded bg-gray-200" />
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 rounded-lg bg-gray-200" />
              <div className="h-48 rounded-lg bg-gray-200" />
            </div>
            <div className="h-64 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Order Not Found</h1>
        <p className="mb-8 text-gray-600">The order you're looking for doesn't exist.</p>
        <Link to="/orders" className="btn btn-primary">
          View Orders
        </Link>
      </div>
    )
  }

  // Calculate totals
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

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order {order.id}</h1>
          <p className="mt-1 text-gray-600">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <span className={`badge text-sm capitalize ${getStatusBadgeClass(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="border-b p-4">
              <h2 className="font-semibold text-gray-900">
                Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <div className="divide-y p-4">
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
                      <p className="mt-1 text-sm text-gray-500">{product.description}</p>
                      <p className="mt-2 text-sm text-gray-600">
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
          </div>

          {/* Order Timeline */}
          <div className="card mt-6 p-6">
            <h2 className="mb-4 font-semibold text-gray-900">Order Timeline</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="h-full w-px bg-gray-200" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order Confirmed</p>
                  <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
              </div>

              {(order.status === 'shipped' || order.status === 'delivered') && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="h-full w-px bg-gray-200" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Shipped</p>
                    <p className="text-sm text-gray-500">Package is on its way</p>
                  </div>
                </div>
              )}

              {order.status === 'delivered' && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
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

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24 p-6">
            <h2 className="mb-4 font-semibold text-gray-900">Order Summary</h2>

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
              <button className="btn btn-primary w-full">Reorder</button>
              <Link to="/orders" className="btn btn-outline w-full">
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
