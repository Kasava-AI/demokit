import { Link } from '@remix-run/react'
import { useIsDemoRemixMode } from '@demokit-ai/remix'
import { demoCart } from '~/demo/data'

export function CartIcon() {
  const isDemo = useIsDemoRemixMode()

  // In demo mode, show demo cart count
  // In real mode, you would fetch this from session/server
  const itemCount = isDemo
    ? demoCart.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0

  return (
    <Link
      to="/cart"
      className="relative flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
          {itemCount}
        </span>
      )}
    </Link>
  )
}
