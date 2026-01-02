import { Form, useSearchParams } from 'react-router'

interface SearchBarProps {
  categories: string[]
}

/**
 * Search and filter bar for products
 */
export default function SearchBar({ categories }: SearchBarProps) {
  const [searchParams] = useSearchParams()
  const currentSearch = searchParams.get('search') || ''
  const currentCategory = searchParams.get('category') || ''

  return (
    <Form method="get" className="flex flex-col gap-4 sm:flex-row">
      {/* Search Input */}
      <div className="relative flex-1">
        <input
          type="text"
          name="search"
          defaultValue={currentSearch}
          placeholder="Search products..."
          className="input pl-10"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
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
      <select name="category" defaultValue={currentCategory} className="input w-full sm:w-48">
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </option>
        ))}
      </select>

      {/* Submit Button */}
      <button type="submit" className="btn btn-primary">
        Search
      </button>

      {/* Clear Filters */}
      {(currentSearch || currentCategory) && (
        <a href="/products" className="btn btn-ghost">
          Clear
        </a>
      )}
    </Form>
  )
}
