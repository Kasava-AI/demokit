import { Link } from 'react-router-dom'
import type { Product } from '@/types'
import { useAddToCart, useCart } from '@/hooks'

interface ProductCardProps {
  product: Product
}

/**
 * Product card component for the product grid
 */
export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, isAdding } = useAddToCart()
  const { mutate } = useCart()

  const handleAddToCart = async () => {
    await addToCart({ product_id: product.id, quantity: 1 })
    // Revalidate cart after adding
    mutate()
  }

  return (
    <div className="card group overflow-hidden">
      {/* Product Image */}
      <Link to={`/products/${product.id}`} className="block aspect-[4/3] overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Link
            to={`/products/${product.id}`}
            className="font-semibold text-gray-900 hover:text-blue-600"
          >
            {product.name}
          </Link>
          <span className="badge badge-primary capitalize">{product.category}</span>
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-gray-600">{product.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">${product.price}</span>

          <button
            onClick={handleAddToCart}
            disabled={isAdding || product.stock === 0}
            className="btn btn-primary btn-sm"
          >
            {isAdding ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : product.stock === 0 ? (
              'Out of Stock'
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>

        {product.stock > 0 && product.stock < 10 && (
          <p className="mt-2 text-xs text-orange-600">Only {product.stock} left in stock!</p>
        )}
      </div>
    </div>
  )
}
