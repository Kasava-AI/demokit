import { Link, useFetcher } from '@remix-run/react'
import type { Product } from '~/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const fetcher = useFetcher()
  const isAdding = fetcher.state === 'submitting'

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg">
      {/* Product Image */}
      <Link
        to={`/products/${product.id}`}
        className="block aspect-square overflow-hidden bg-gray-100"
      >
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-2">
          <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-600">
            {product.category}
          </span>
        </div>

        <Link
          to={`/products/${product.id}`}
          className="block font-medium text-gray-900 hover:text-blue-600"
        >
          {product.name}
        </Link>

        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{product.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            ${product.price.toLocaleString()}
          </span>

          {product.stock > 0 ? (
            <span className="text-xs text-green-600">{product.stock} in stock</span>
          ) : (
            <span className="text-xs text-red-600">Out of stock</span>
          )}
        </div>

        {/* Add to Cart */}
        <fetcher.Form action={`/products/${product.id}`} method="post" className="mt-4">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="quantity" value="1" />
          <button
            type="submit"
            disabled={isAdding || product.stock === 0}
            className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
              product.stock === 0
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : isAdding
                  ? 'bg-blue-400 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </button>
        </fetcher.Form>
      </div>
    </div>
  )
}
