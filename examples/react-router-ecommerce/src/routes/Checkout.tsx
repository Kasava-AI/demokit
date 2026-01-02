import { useLoaderData, Form, useActionData, useNavigation, Link, useNavigate } from 'react-router'
import { useEffect } from 'react'
import type { CartLoaderData, CheckoutActionData } from '@/types'

/**
 * Checkout page with form and order summary
 */
export default function Checkout() {
  const { cart, products } = useLoaderData() as CartLoaderData
  const actionData = useActionData() as CheckoutActionData | undefined
  const navigation = useNavigation()
  const navigate = useNavigate()

  const isSubmitting = navigation.state === 'submitting'

  // Redirect to confirmation page on success
  useEffect(() => {
    if (actionData?.success && actionData.orderId) {
      navigate(`/order-confirmation/${actionData.orderId}`)
    }
  }, [actionData, navigate])

  // Calculate totals
  const subtotal = cart.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
  const shipping = subtotal > 100 ? 0 : 9.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Your cart is empty</h1>
          <p className="mb-8 text-gray-600">Add some products before checking out.</p>
          <Link to="/products" className="btn btn-primary btn-lg">
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Checkout Form */}
        <div>
          <Form method="post" className="space-y-6">
            {/* Contact Information */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    className="input"
                    defaultValue="demo@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="John Doe"
                    className="input"
                    defaultValue="Demo User"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Shipping Address</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    required
                    placeholder="123 Main St"
                    className="input"
                    defaultValue="123 Demo Street"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      required
                      placeholder="San Francisco"
                      className="input"
                      defaultValue="Demo City"
                    />
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="mb-1 block text-sm font-medium text-gray-700">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      required
                      placeholder="94102"
                      className="input"
                      defaultValue="12345"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="cardNumber" className="mb-1 block text-sm font-medium text-gray-700">
                    Card Number
                  </label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    placeholder="4242 4242 4242 4242"
                    className="input"
                    defaultValue="4242 4242 4242 4242"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiry" className="mb-1 block text-sm font-medium text-gray-700">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      id="expiry"
                      name="expiry"
                      placeholder="MM/YY"
                      className="input"
                      defaultValue="12/25"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvc" className="mb-1 block text-sm font-medium text-gray-700">
                      CVC
                    </label>
                    <input
                      type="text"
                      id="cvc"
                      name="cvc"
                      placeholder="123"
                      className="input"
                      defaultValue="123"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                <strong>Demo Mode:</strong> No real payment will be processed. Use any test values.
              </div>
            </div>

            {/* Error Message */}
            {actionData?.error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-800">
                <p>{actionData.error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg w-full"
            >
              {isSubmitting ? (
                <>
                  <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                `Pay $${total.toFixed(2)}`
              )}
            </button>
          </Form>
        </div>

        {/* Order Summary */}
        <div>
          <div className="card sticky top-24 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>

            {/* Cart Items */}
            <div className="mb-6 max-h-64 space-y-4 overflow-y-auto">
              {cart.items.map((item) => {
                const product = products.find((p) => p.id === item.productId)
                if (!product) return null
                return (
                  <div key={item.productId} className="flex gap-4">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      ${(product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Totals */}
            <dl className="space-y-3 border-t pt-4 text-sm">
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
                <dt className="text-gray-600">Tax (8%)</dt>
                <dd className="font-medium text-gray-900">${tax.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="font-bold text-gray-900">${total.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
