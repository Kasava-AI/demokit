'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useIsDemoMode, useIsHydrated } from '@demokit-ai/next/client'
import type { Cart } from '@/app/types'

export function CartIcon() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isDemoMode = useIsDemoMode()
  const isHydrated = useIsHydrated()

  useEffect(() => {
    if (!isHydrated) return

    // Only fetch cart data in demo mode - there's no real API
    if (!isDemoMode) {
      setCart({ items: [], total: 0 })
      setIsLoading(false)
      return
    }

    async function fetchCart() {
      try {
        const response = await fetch('/cart')
        if (response.ok) {
          const data = await response.json()
          setCart(data)
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCart()
  }, [isHydrated, isDemoMode])

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  return (
    <Link
      href="/cart"
      className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      {!isLoading && itemCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </Link>
  )
}
