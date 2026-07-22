import { useEffect, useState } from 'react'
import { useDemoMode } from '@demokit-ai/react'
import { ApiError, cancelOrder, fetchOrders } from '../api'
import { ORDER_STATUSES, type Order, type OrderStatus } from '../demo/demo-config'

export function Orders() {
  const { isDemoMode, isHydrated } = useDemoMode()
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!isHydrated) return
    let cancelled = false
    setError(null)
    fetchOrders(status ? { status } : undefined)
      .then((data) => {
        if (!cancelled) setOrders(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setOrders(null)
        setError(err instanceof ApiError ? err.message : 'unexpected error')
      })
    return () => {
      cancelled = true
    }
  }, [status, isDemoMode, isHydrated, reloadToken])

  async function handleCancel(id: string) {
    setCancellingId(id)
    try {
      await cancelOrder(id)
      setReloadToken((n) => n + 1)
    } catch {
      // Surfaced through the shared error state below on next load, or —
      // with demo mode off — as the same "backend unreachable" hint.
      setError('backend unreachable')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <section>
      <div className="page-header">
        <h2>Orders</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="hint">
          <strong>Backend unreachable</strong>
          Turn on Demo Mode above — this example ships no real server, so /api/orders only
          resolves while demo mode is on.
        </div>
      )}

      {!error && orders === null && <p>Loading orders…</p>}

      {!error && orders !== null && orders.length === 0 && (
        <div className="empty">No orders match that filter.</div>
      )}

      {!error && orders !== null && orders.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>
                  <span className="status-pill">{order.status}</span>
                </td>
                <td>${(order.totalCents / 100).toFixed(2)}</td>
                <td>
                  <button
                    className="danger"
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                  >
                    {cancellingId === order.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
