import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

interface SearchBarProps {
  categories: string[]
}

/**
 * Search and filter form for products
 */
export default function SearchBar({ categories }: SearchBarProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')

  // Sync local state with URL params
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setCategory(searchParams.get('category') || '')
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters(search, category)
  }

  const updateFilters = (newSearch: string, newCategory: string) => {
    const params = new URLSearchParams()
    if (newSearch) params.set('search', newSearch)
    if (newCategory) params.set('category', newCategory)

    navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    updateFilters(search, newCategory)
  }

  const clearFilters = () => {
    setSearch('')
    setCategory('')
    navigate('/products')
  }

  const hasFilters = search || category

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-4">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
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
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="input pl-10"
        />
      </div>

      {/* Category Select */}
      <select
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="input w-auto"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </option>
        ))}
      </select>

      {/* Search Button */}
      <button type="submit" className="btn btn-primary">
        Search
      </button>

      {/* Clear Filters */}
      {hasFilters && (
        <button type="button" onClick={clearFilters} className="btn btn-ghost text-gray-600">
          Clear
        </button>
      )}
    </form>
  )
}
