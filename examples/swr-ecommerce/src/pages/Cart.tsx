import { Link } from 'react-router-dom'
import { useCart, useClearCart } from '@/hooks'
import CartItem from '@/components/CartItem'

/**
 * Shopping cart page with item management
 */
export default function Cart() {
  const { cart, products, isLoading, mutate } = useCart()
  const { clearCart, isClearing } = useClearCart()

  const handleClearCart = async () => {
    await clearCart()
    mutate()
  }

  // Calculate totals
  const subtotal = cart.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.product_id)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
  const shipping = subtotal > 100 ? 0 : 9.99
  const total = subtotal + shipping

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="mb-8 flex items-center justify-between">
            <div className="h-8 w-40 rounded bg-gray-200" />
            <div className="h-8 w-24 rounded bg-gray-200" />
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4 border-b py-4">
                  <div className="h-24 w-24 rounded bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/2 rounded bg-gray-200" />
                    <div className="h-4 w-1/3 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-64 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
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
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Your cart is empty</h1>
          <p className="mb-8 text-gray-600">
            Looks like you haven't added any products yet. Start shopping to fill your cart!
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
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <button
          onClick={handleClearCart}
          disabled={isClearing}
          className="btn btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          {isClearing ? 'Clearing...' : 'Clear Cart'}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="card divide-y">
            <div className="p-4">
              {cart.items.map((item) => {
                const product = products.find((p) => p.id === item.product_id)
                if (!product) return null
                return <CartItem key={item.product_id} item={item} product={product} />
              })}
            </div>
          </div>

          <Link
            to="/products"
            className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Continue Shopping
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">
                  Subtotal ({cart.items.reduce((s, i) => s + i.quantity, 0)} items)
                </dt>
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
              {subtotal < 100 && (
                <p className="text-xs text-gray-500">
                  Add ${(100 - subtotal).toFixed(2)} more for free shipping!
                </p>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <dt className="font-semibold text-gray-900">Total</dt>
                  <dd className="font-bold text-gray-900">${total.toFixed(2)}</dd>
                </div>
              </div>
            </dl>

            <Link to="/checkout" className="btn btn-primary btn-lg mt-6 w-full">
              Proceed to Checkout
            </Link>

            <p className="mt-4 text-center text-xs text-gray-500">
              Secure checkout powered by DemoKit
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
