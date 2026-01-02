import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface SearchBarProps {
  categories: string[]
}

/**
 * Search and filter bar for products
 */
export default function SearchBar({ categories }: SearchBarProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const currentSearch = searchParams.get('search') || ''
  const currentCategory = searchParams.get('category') || ''

  const [search, setSearch] = useState(currentSearch)
  const [category, setCategory] = useState(currentCategory)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)

    const queryString = params.toString()
    navigate(queryString ? `/products?${queryString}` : '/products')
  }

  const handleClear = () => {
    setSearch('')
    setCategory('')
    navigate('/products')
  }

  const hasFilters = currentSearch || currentCategory

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
      {/* Search Input */}
      <div className="relative flex-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="input w-full sm:w-48"
      >
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
      {hasFilters && (
        <button type="button" onClick={handleClear} className="btn btn-ghost">
          Clear
        </button>
      )}
    </form>
  )
}
