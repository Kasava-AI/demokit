'use client'

import Link from 'next/link'
import { CartIcon } from './CartIcon'
import { DemoToggle } from './DemoToggle'

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">TechShop</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
              tRPC
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Products
            </Link>
            <Link
              href="/orders"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Orders
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <DemoToggle />
            <CartIcon />
          </div>
        </div>
      </div>
    </header>
  )
}
