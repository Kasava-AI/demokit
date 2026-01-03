import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useProduct, useRelatedProducts } from '@/hooks/useProducts'
import { useAddToCart } from '@/hooks/useCart'
import ProductCard from '@/components/ProductCard'

/**
 * Product detail page with add to cart functionality
 */
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)

  const { data: product, isLoading, error } = useProduct(id!)
  const { data: relatedProducts = [] } = useRelatedProducts(id!)
  const addToCart = useAddToCart()

  const isAddingToCart = addToCart.isPending
  const addedSuccessfully = addToCart.isSuccess

  const handleAddToCart = () => {
    if (product) {
      addToCart.mutate({ product_id: product.id, quantity })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-xl bg-gray-200" />
          <div className="space-y-4">
            <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Product not found</h1>
          <p className="mb-8 text-gray-600">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/products" className="btn btn-primary">
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/products" className="hover:text-gray-900">
          Products
        </Link>
        <span>/</span>
        <span className="capitalize">{product.category}</span>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      {/* Product Detail */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <span className="badge badge-primary mb-2 w-fit capitalize">{product.category}</span>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">{product.name}</h1>

          <p className="mb-6 text-lg text-gray-600">{product.description}</p>

          <div className="mb-6 flex items-baseline gap-4">
            <span className="text-4xl font-bold text-gray-900">${product.price}</span>
            {product.stock > 0 ? (
              <span className="text-sm text-green-600">In stock ({product.stock} available)</span>
            ) : (
              <span className="text-sm text-red-600">Out of stock</span>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="btn btn-outline h-10 w-10 p-0"
              >
                -
              </button>
              <span className="w-12 text-center text-lg font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
                className="btn btn-outline h-10 w-10 p-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || product.stock === 0}
            className="btn btn-primary btn-lg mb-4"
          >
            {isAddingToCart ? (
              <>
                <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
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
                Adding...
              </>
            ) : product.stock === 0 ? (
              'Out of Stock'
            ) : (
              `Add to Cart - $${(product.price * quantity).toFixed(2)}`
            )}
          </button>

          {/* Success Message */}
          {addedSuccessfully && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Added to cart!</span>
                <Link to="/cart" className="ml-auto font-medium underline">
                  View Cart
                </Link>
              </div>
            </div>
          )}

          {/* Product Details List */}
          <div className="mt-auto rounded-lg bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold text-gray-900">Product Details</h3>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="capitalize text-gray-900">{product.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Product ID</dt>
                <dd className="font-mono text-gray-900">{product.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Availability</dt>
                <dd className="text-gray-900">{product.stock} in stock</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Related Products</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
