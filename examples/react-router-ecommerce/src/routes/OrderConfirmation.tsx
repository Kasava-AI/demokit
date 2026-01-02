import { useParams, Link } from 'react-router'

/**
 * Order confirmation page shown after successful checkout
 */
export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>()

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-lg text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-3xl font-bold text-gray-900">Order Confirmed!</h1>

        <p className="mb-2 text-lg text-gray-600">Thank you for your purchase.</p>

        <p className="mb-8 text-gray-500">
          Your order <span className="font-mono font-medium text-gray-900">{orderId}</span> has been
          placed successfully.
        </p>

        {/* Order Details Card */}
        <div className="card mb-8 p-6 text-left">
          <h2 className="mb-4 font-semibold text-gray-900">What's Next?</h2>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                1
              </div>
              <span>You'll receive an order confirmation email shortly.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                2
              </div>
              <span>We'll notify you when your order ships with tracking information.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                3
              </div>
              <span>Expected delivery within 3-5 business days.</span>
            </li>
          </ul>
        </div>

        {/* Demo Notice */}
        <div className="mb-8 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>Demo Mode:</strong> This is a simulated order. No real transaction occurred.
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link to="/orders" className="btn btn-primary">
            View Orders
          </Link>
          <Link to="/products" className="btn btn-secondary">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
