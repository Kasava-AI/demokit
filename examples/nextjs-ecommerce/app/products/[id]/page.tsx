'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useIsDemoMode, useIsHydrated } from '@demokit-ai/next/client'
import type { Product } from '@/app/types'

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const isDemoMode = useIsDemoMode()
  const isHydrated = useIsHydrated()

  useEffect(() => {
    if (!isHydrated) return

    async function fetchProduct() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/products/${productId}`)
        if (!response.ok) {
          throw new Error('Product not found')
        }
        setProduct(await response.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [productId, isHydrated, isDemoMode])

  const handleAddToCart = async () => {
    if (!product || isAdding) return

    setIsAdding(true)
    try {
      const response = await fetch('/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, quantity }),
      })

      if (response.ok) {
        setAdded(true)
        window.dispatchEvent(new CustomEvent('cart-updated'))
        setTimeout(() => setAdded(false), 3000)
      }
    } finally {
      setIsAdding(false)
    }
  }

  if (!isHydrated || isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
            <div className="h-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
        <p className="text-gray-500 mb-6">{error || 'The product you are looking for does not exist.'}</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Products
        </Link>
      </div>
    )
  }

  const isLowStock = product.stock <= 5
  const isOutOfStock = product.stock === 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Products
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="relative">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full aspect-square object-cover rounded-xl"
          />
          {isLowStock && !isOutOfStock && (
            <span className="absolute top-4 right-4 bg-amber-500 text-white text-sm font-medium px-3 py-1 rounded-lg">
              Only {product.stock} left
            </span>
          )}
          {isOutOfStock && (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-sm font-medium px-3 py-1 rounded-lg">
              Out of Stock
            </span>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <span className="text-sm text-blue-600 font-medium uppercase">
              {product.category}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              {product.name}
            </h1>
          </div>

          <p className="text-2xl font-bold text-gray-900">
            ${product.price}
          </p>

          <p className="text-gray-600 leading-relaxed">
            {product.description}
          </p>

          {/* Stock info */}
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-green-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isOutOfStock
                ? 'Out of stock'
                : isLowStock
                  ? `Low stock - only ${product.stock} left`
                  : `${product.stock} in stock`}
            </span>
          </div>

          {/* Quantity selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  -
                </button>
                <span className="px-4 py-2 min-w-[50px] text-center font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding}
            className={`
              w-full py-4 text-lg font-semibold rounded-xl transition-all
              ${added
                ? 'bg-green-600 text-white'
                : isOutOfStock
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {added ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Added to Cart!
              </span>
            ) : isOutOfStock ? (
              'Out of Stock'
            ) : isAdding ? (
              'Adding...'
            ) : (
              `Add to Cart - $${product.price * quantity}`
            )}
          </button>

          {/* Back link */}
          <Link
            href="/"
            className="block text-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
