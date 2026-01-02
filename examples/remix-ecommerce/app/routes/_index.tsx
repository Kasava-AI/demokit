import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, useSearchParams } from '@remix-run/react'
import { createDemoLoader } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'
import { ProductList } from '~/components/ProductList'
import { loaderFixtures } from '~/demo/fixtures'
import { demoProducts, getProductsByCategory, searchProducts } from '~/demo/data'
import type { Product } from '~/types'

interface LoaderData {
  products: Product[]
  categories: string[]
  selectedCategory: string
  searchQuery: string
}

/**
 * Products home page loader
 * Uses createDemoLoader to wrap real loader with demo fixtures
 */
export const loader = createDemoLoader<Response>({
  loader: async ({ request }: LoaderFunctionArgs) => {
    // In a real app, this would fetch from a database/API
    const url = new URL(request.url)
    const category = url.searchParams.get('category') ?? undefined
    const query = url.searchParams.get('q')

    let products = demoProducts
    if (query) {
      products = searchProducts(query)
    } else if (category && category !== 'all') {
      products = getProductsByCategory(category)
    }

    return json<LoaderData>({
      products,
      categories: ['all', 'electronics', 'accessories'],
      selectedCategory: category ?? 'all',
      searchQuery: query ?? '',
    })
  },
  isEnabled: isDemoMode,
  fixture: loaderFixtures['/'],
  delay: 100, // Simulate network latency in demo mode
})

export default function Index() {
  const { products, categories, selectedCategory, searchQuery } =
    useLoaderData<LoaderData>()
  const [searchParams, setSearchParams] = useSearchParams()

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams)
    if (category === 'all') {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    params.delete('q')
    setSearchParams(params)
  }

  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams)
    if (query) {
      params.set('q', query)
      params.delete('category')
    } else {
      params.delete('q')
    }
    setSearchParams(params)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to TechShop</h1>
        <p className="mt-2 text-gray-600">
          Discover our curated selection of premium tech products
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results info */}
      {searchQuery && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {products.length} result{products.length !== 1 ? 's' : ''} for "{searchQuery}"
            <button
              onClick={() => handleSearch('')}
              className="ml-2 text-blue-600 hover:underline"
            >
              Clear
            </button>
          </p>
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 ? (
        <ProductList products={products} />
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-500">No products found.</p>
        </div>
      )}
    </div>
  )
}
