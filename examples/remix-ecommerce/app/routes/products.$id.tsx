import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, useFetcher, Link } from '@remix-run/react'
import { createDemoLoader, createDemoAction } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'
import { getProductById } from '~/demo/data'
import type { Product } from '~/types'

interface LoaderData {
  product: Product
}

/**
 * Product detail page loader
 */
export const loader = createDemoLoader<Response>({
  loader: async ({ params }: LoaderFunctionArgs) => {
    const product = getProductById(params.id!)
    if (!product) {
      throw json({ error: 'Product not found' }, { status: 404 })
    }
    return json<LoaderData>({ product })
  },
  isEnabled: isDemoMode,
  fixture: ({ params }) => {
    const product = getProductById(params.id!)
    if (!product) {
      throw json({ error: 'Product not found' }, { status: 404 })
    }
    return json<LoaderData>({ product })
  },
})

/**
 * Add to cart action for the product detail page
 */
export const action = createDemoAction<Response>({
  action: async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData()
    const productId = formData.get('productId') as string
    const quantity = parseInt(formData.get('quantity') as string) || 1

    // In a real app, this would add to a session-based cart
    const product = getProductById(productId)
    if (!product) {
      return json({ error: 'Product not found' }, { status: 404 })
    }

    return json({
      success: true,
      message: `Added ${quantity}x ${product.name} to cart`,
    })
  },
  isEnabled: isDemoMode,
  fixture: {
    POST: async ({ formData }) => {
      const productId = formData?.get('productId') as string
      const quantity = parseInt(formData?.get('quantity') as string) || 1

      const product = getProductById(productId)
      if (!product) {
        return json({ error: 'Product not found' }, { status: 404 })
      }

      return json({
        success: true,
        message: `Added ${quantity}x ${product.name} to cart`,
      })
    },
  },
})

export default function ProductDetail() {
  const { product } = useLoaderData<LoaderData>()
  const fetcher = useFetcher()

  const isAdding = fetcher.state === 'submitting'
  const actionData = fetcher.data as { success?: boolean; message?: string } | undefined

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link to="/" className="hover:text-gray-700">
              Home
            </Link>
          </li>
          <li>/</li>
          <li className="capitalize text-gray-900">{product.category}</li>
          <li>/</li>
          <li className="text-gray-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium capitalize text-blue-800">
              {product.category}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

          <div className="mt-4 flex items-center gap-4">
            <span className="text-3xl font-bold text-gray-900">
              ${product.price.toLocaleString()}
            </span>
            {product.stock > 0 ? (
              <span className="text-sm text-green-600">
                {product.stock} in stock
              </span>
            ) : (
              <span className="text-sm text-red-600">Out of stock</span>
            )}
          </div>

          <p className="mt-6 text-gray-600">{product.description}</p>

          {/* Add to Cart Form */}
          <fetcher.Form method="post" className="mt-8">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value="1" />

            <button
              type="submit"
              disabled={isAdding || product.stock === 0}
              className={`w-full rounded-lg px-6 py-3 text-lg font-medium text-white transition-colors ${
                product.stock === 0
                  ? 'cursor-not-allowed bg-gray-400'
                  : isAdding
                    ? 'bg-blue-400'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isAdding ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </fetcher.Form>

          {/* Success Message */}
          {actionData?.success && (
            <div className="mt-4 rounded-lg bg-green-50 p-4 text-green-800">
              {actionData.message}
              <Link to="/cart" className="ml-2 font-medium underline">
                View Cart
              </Link>
            </div>
          )}

          {/* Product Features */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium text-gray-900">Features</h3>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Free shipping on orders over $500
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                30-day return policy
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                1-year warranty included
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
