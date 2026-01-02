import { useSearchParams } from 'react-router-dom'
import { useProducts } from '@/hooks'
import ProductList from '@/components/ProductList'
import SearchBar from '@/components/SearchBar'

/**
 * Products listing page with search and category filtering
 */
export default function Products() {
  const [searchParams] = useSearchParams()

  const currentSearch = searchParams.get('search') || ''
  const currentCategory = searchParams.get('category') || ''

  const { products, categories, isLoading } = useProducts({
    search: currentSearch,
    category: currentCategory,
  })

  const hasFilters = currentSearch || currentCategory

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="mb-8">
            <div className="mb-2 h-8 w-48 rounded bg-gray-200" />
            <div className="h-4 w-64 rounded bg-gray-200" />
          </div>
          <div className="mb-8 flex gap-4">
            <div className="h-10 flex-1 rounded bg-gray-200" />
            <div className="h-10 w-48 rounded bg-gray-200" />
            <div className="h-10 w-24 rounded bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-200" />
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
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
      <ProductList
        products={products}
        emptyMessage={
          hasFilters
            ? 'No products match your search. Try different keywords or clear filters.'
            : 'No products available at this time.'
        }
      />

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
            <h3 className="font-semibold text-blue-900">DemoKit + SWR Integration</h3>
            <p className="mt-1 text-sm text-blue-700">
              This page uses <code className="rounded bg-blue-100 px-1">useDemoSWR</code> to fetch
              product data. When demo mode is enabled, data comes from static fixtures instead of
              a real API.
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
