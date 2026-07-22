/**
 * Plain `fetch` calls against `/api/*` — no data-fetching library. When demo
 * mode is on, the msw transport's Service Worker intercepts these at the
 * network layer and answers from the local store (demo/demo-config.ts).
 * When demo mode is off, they hit this Vite app's own origin, which has no
 * `/api/*` route — the fetch fails, and callers surface that as
 * "backend unreachable" rather than crashing.
 */
import type { Order, OrderStatus, Product } from './demo/demo-config'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    // Network-level failure: no server there at all. This is the expected
    // path with demo mode off, since this example ships no real backend.
    throw new ApiError('backend unreachable')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(body || `request failed (${res.status})`, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function fetchProducts(filters?: { category?: string; sort?: string }): Promise<Product[]> {
  const params = new URLSearchParams()
  if (filters?.category) params.set('category', filters.category)
  if (filters?.sort) params.set('sort', filters.sort)
  const qs = params.toString()
  return request<Product[]>(`/api/products${qs ? `?${qs}` : ''}`)
}

export function fetchProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${id}`)
}

export function fetchOrders(filters?: { status?: string }): Promise<Order[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  const qs = params.toString()
  return request<Order[]>(`/api/orders${qs ? `?${qs}` : ''}`)
}

export function createOrder(order: { status: OrderStatus; totalCents: number }): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

export function cancelOrder(id: string): Promise<void> {
  return request<void>(`/api/orders/${id}`, { method: 'DELETE' })
}
