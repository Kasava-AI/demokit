import { Link } from '@remix-run/react'
import { CartIcon } from './CartIcon'
import { DemoToggle } from './DemoToggle'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-xl font-bold text-gray-900">TechShop</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Products
            </Link>
            <Link to="/orders" className="text-gray-600 hover:text-gray-900">
              Orders
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <DemoToggle />
            <CartIcon />
          </div>
        </div>
      </div>
    </header>
  )
}
