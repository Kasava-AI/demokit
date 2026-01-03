'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/src/lib/trpc'
import type { Product } from '@/app/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [added, setAdded] = useState(false)

  const utils = trpc.useUtils()

  const addToCart = trpc.cart.addItem.useMutation({
    onSuccess: () => {
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
      // Invalidate cart query to refresh cart icon
      utils.cart.get.invalidate()
    },
  })

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (addToCart.isPending) return
    addToCart.mutate({ product_id: product.id, quantity: 1 })
  }

  const isLowStock = product.stock <= 5

  return (
    <Link
      href={`/products/${product.id}`}
      className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isLowStock && (
          <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded">
            Low Stock
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          <span className="text-lg font-bold text-gray-900">
            ${product.price}
          </span>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 capitalize">
            {product.category}
          </span>

          <button
            onClick={handleAddToCart}
            disabled={addToCart.isPending || product.stock === 0}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-lg transition-all
              ${added
                ? 'bg-green-100 text-green-700'
                : product.stock === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {added ? 'Added!' : product.stock === 0 ? 'Out of Stock' : addToCart.isPending ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  )
}
