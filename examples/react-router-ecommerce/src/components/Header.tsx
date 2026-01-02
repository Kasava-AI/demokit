import { Link, useNavigation } from 'react-router'
import CartIcon from './CartIcon'
import DemoToggle from './DemoToggle'

/**
 * Main navigation header
 */
export default function Header() {
  const navigation = useNavigation()
  const isLoading = navigation.state === 'loading'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <svg
            className="h-8 w-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <span className="text-xl font-bold text-gray-900">DemoKit Store</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/products" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Products
          </Link>
          <Link
            to="/products?category=electronics"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Electronics
          </Link>
          <Link
            to="/products?category=accessories"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Accessories
          </Link>
          <Link to="/orders" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Orders
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <DemoToggle />
          <CartIcon />
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden bg-gray-100">
          <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] bg-blue-600" />
        </div>
      )}

      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </header>
  )
}
