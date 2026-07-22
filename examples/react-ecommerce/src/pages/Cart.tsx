import { useState } from 'react'
import { ApiError, createOrder } from '../api'
import type { Product } from '../demo/demo-config'

export interface CartLine {
  product: Product
  qty: number
}

interface CartProps {
  lines: CartLine[]
  onChangeQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  onCheckedOut: () => void
}

export function Cart({ lines, onChangeQty, onRemove, onCheckedOut }: CartProps) {
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalCents = lines.reduce((sum, line) => sum + line.product.priceCents * line.qty, 0)

  async function checkout() {
    setPlacing(true)
    setError(null)
    try {
      await createOrder({ status: 'Pending', totalCents })
      onCheckedOut()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'unexpected error')
    } finally {
      setPlacing(false)
    }
  }

  if (lines.length === 0) {
    return (
      <section>
        <div className="page-header">
          <h2>Cart</h2>
        </div>
        <div className="empty">Your cart is empty. Add something from the Catalog.</div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-header">
        <h2>Cart</h2>
      </div>

      {lines.map((line) => (
        <div className="cart-row" key={line.product.id}>
          <div>
            <div className="name">{line.product.name}</div>
            <div className="price">${(line.product.priceCents / 100).toFixed(2)} each</div>
          </div>
          <div className="cart-qty">
            <button
              className="secondary"
              onClick={() => onChangeQty(line.product.id, Math.max(1, line.qty - 1))}
              aria-label={`Decrease quantity of ${line.product.name}`}
            >
              −
            </button>
            <span>{line.qty}</span>
            <button
              className="secondary"
              onClick={() => onChangeQty(line.product.id, line.qty + 1)}
              aria-label={`Increase quantity of ${line.product.name}`}
            >
              +
            </button>
            <button className="danger" onClick={() => onRemove(line.product.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="cart-total">
        <span>Total</span>
        <span>${(totalCents / 100).toFixed(2)}</span>
      </div>

      {error && (
        <div className="hint" style={{ marginTop: 16 }}>
          <strong>Checkout failed</strong>
          {error === 'backend unreachable'
            ? 'Demo mode is off, so POST /api/orders has no real backend to reach — the blocked-mutation guard only protects requests while demo mode is on. Turn on Demo Mode to complete checkout.'
            : error}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="primary" onClick={checkout} disabled={placing}>
          {placing ? 'Placing order…' : 'Checkout'}
        </button>
      </div>
    </section>
  )
}
