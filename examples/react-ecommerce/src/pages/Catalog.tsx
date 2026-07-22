import { useEffect, useState } from 'react'
import { useDemoMode } from '@demokit-ai/react'
import { ApiError, fetchProducts } from '../api'
import { CATEGORIES, type Category, type Product } from '../demo/demo-config'

interface CatalogProps {
  onAddToCart: (product: Product) => void
}

export function Catalog({ onAddToCart }: CatalogProps) {
  const { isDemoMode, isHydrated } = useDemoMode()
  const [category, setCategory] = useState<Category | ''>('')
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isHydrated) return
    let cancelled = false
    setError(null)
    fetchProducts(category ? { category } : undefined)
      .then((data) => {
        if (!cancelled) setProducts(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setProducts(null)
        setError(err instanceof ApiError ? err.message : 'unexpected error')
      })
    return () => {
      cancelled = true
    }
  }, [category, isDemoMode, isHydrated])

  return (
    <section>
      <div className="page-header">
        <h2>Catalog</h2>
        <select value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="hint">
          <strong>Backend unreachable</strong>
          Turn on Demo Mode above to load the catalog from the local store — this example ships
          no real server, so GET /api/products only resolves while demo mode is on.
        </div>
      )}

      {!error && products === null && <p>Loading products…</p>}

      {!error && products !== null && products.length === 0 && (
        <div className="empty">No products match that filter.</div>
      )}

      {!error && products !== null && products.length > 0 && (
        <div className="grid">
          {products.map((product) => (
            <div className="card" key={product.id}>
              <span className="category">{product.category}</span>
              <span className="name">{product.name}</span>
              <span className="price">${(product.priceCents / 100).toFixed(2)}</span>
              <button className="primary" onClick={() => onAddToCart(product)}>
                Add to cart
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
