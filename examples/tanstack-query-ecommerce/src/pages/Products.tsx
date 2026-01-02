import { useSearchParams } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import ProductList from '@/components/ProductList'
import SearchBar from '@/components/SearchBar'

/**
 * Products listing page with search and category filtering
 */
export default function Products() {
  const [searchParams] = useSearchParams()

  const currentSearch = searchParams.get('search') || ''
  const currentCategory = searchParams.get('category') || ''

  // Build filters object
  const filters: { category?: string; search?: string } = {}
  if (currentCategory) filters.category = currentCategory
  if (currentSearch) filters.search = currentSearch

  const { data: products = [], isLoading, error } = useProducts(
    Object.keys(filters).length > 0 ? filters : undefined
  )

  const hasFilters = currentSearch || currentCategory
  const categories = ['electronics', 'accessories']

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-red-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Error loading products</h1>
          <p className="text-gray-600">
            {error.message || 'Please try again later.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {currentCategory
            ? `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}`
            : 'All Products'}
        </h1>
        <p className="text-gray-600">
          {hasFilters
            ? `Showing ${products.length} result${products.length !== 1 ? 's' : ''}`
            : 'Browse our collection of premium tech products'}
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8">
        <SearchBar categories={categories} />
      </div>

      {/* Products Grid */}
      <div className={`transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ProductList
            products={products}
            emptyMessage={
              hasFilters
                ? 'No products match your search. Try different keywords or clear filters.'
                : 'No products available at this time.'
            }
          />
        )}
      </div>

      {/* Demo Mode Indicator */}
      <div className="mt-12 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-blue-100 p-2">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">DemoKit TanStack Query Integration</h3>
            <p className="mt-1 text-sm text-blue-700">
              This page uses <code className="rounded bg-blue-100 px-1">DemoQueryProvider</code> with
              query fixtures. When demo mode is enabled, product data comes from
              static fixtures instead of a real API.
            </p>
            <p className="mt-2 text-sm text-blue-700">
              Toggle demo mode using the button in the header to see the difference.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
