import { Link } from 'react-router'
import { useState, useEffect } from 'react'
import { getCartItemCount } from '@/lib/cart-storage'
import { isDemoEnabled } from '@/lib/demo-mode'

/**
 * Cart icon with item count badge
 */
export default function CartIcon() {
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    // In demo mode, we use a fixed count (synced with fixtures)
    // In real mode, we'd fetch from API or use cart storage
    if (isDemoEnabled()) {
      // Demo cart has 3 items (1 headphones + 2 USB-C hubs)
      setItemCount(3)
    } else {
      setItemCount(getCartItemCount())
    }

    // Listen for cart updates
    const handleStorageChange = () => {
      if (!isDemoEnabled()) {
        setItemCount(getCartItemCount())
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <Link to="/cart" className="relative p-2 text-gray-600 hover:text-gray-900">
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>

      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}
