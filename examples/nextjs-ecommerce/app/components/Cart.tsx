'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useIsDemoMode, useIsHydrated } from '@demokit-ai/next/client'
import type { Cart as CartType, Product } from '@/app/types'

interface CartItemWithProduct {
  product_id: string
  quantity: number
  product: Product
}

export function Cart() {
  const [cart, setCart] = useState<CartType | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const isDemoMode = useIsDemoMode()
  const isHydrated = useIsHydrated()

  // Fetch cart and products
  useEffect(() => {
    if (!isHydrated) return

    // Only fetch data in demo mode - there's no real API
    if (!isDemoMode) {
      setCart({ items: [], total: 0 })
      setProducts([])
      setIsLoading(false)
      return
    }

    async function fetchData() {
      setIsLoading(true)
      try {
        const [cartRes, productsRes] = await Promise.all([
          fetch('/cart'),
          fetch('/products'),
        ])

        if (cartRes.ok) {
          setCart(await cartRes.json())
        }
        if (productsRes.ok) {
          setProducts(await productsRes.json())
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isHydrated, isDemoMode])

  const updateQuantity = async (productId: string, quantity: number) => {
    setUpdating(productId)
    try {
      const response = await fetch(`/cart/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })

      if (response.ok) {
        setCart(await response.json())
        window.dispatchEvent(new CustomEvent('cart-updated'))
      }
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (productId: string) => {
    setUpdating(productId)
    try {
      const response = await fetch(`/cart/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCart(await response.json())
        window.dispatchEvent(new CustomEvent('cart-updated'))
      }
    } finally {
      setUpdating(null)
    }
  }

  const clearCart = async () => {
    try {
      const response = await fetch('/cart', {
        method: 'DELETE',
      })

      if (response.ok) {
        setCart(await response.json())
        window.dispatchEvent(new CustomEvent('cart-updated'))
      }
    } catch (error) {
      console.error('Failed to clear cart:', error)
    }
  }

  if (!isHydrated || isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="w-24 h-24 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add some products to get started!</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    )
  }

  const cartItems: CartItemWithProduct[] = cart.items
    .map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.product_id)!,
    }))
    .filter((item) => item.product)

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Cart items */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Cart Items ({cart.items.reduce((sum, i) => sum + i.quantity, 0)})
          </h2>
          <button
            onClick={clearCart}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear Cart
          </button>
        </div>

        {cartItems.map((item) => (
          <div
            key={item.product_id}
            className={`flex gap-4 p-4 bg-white rounded-lg border border-gray-200 ${
              updating === item.product_id ? 'opacity-50' : ''
            }`}
          >
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="w-24 h-24 object-cover rounded-lg"
            />

            <div className="flex-1">
              <Link
                href={`/products/${item.product.id}`}
                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {item.product.name}
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                ${item.product.price} each
              </p>

              <div className="flex items-center gap-4 mt-3">
                {/* Quantity controls */}
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    disabled={updating === item.product_id}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 min-w-[40px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    disabled={updating === item.product_id}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.product_id)}
                  disabled={updating === item.product_id}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="text-right">
              <span className="font-bold text-gray-900">
                ${item.product.price * item.quantity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Order Summary
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${cart.total}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <hr />
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>${cart.total}</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="block w-full py-3 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Proceed to Checkout
          </Link>

          <Link
            href="/"
            className="block w-full py-3 mt-3 text-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
