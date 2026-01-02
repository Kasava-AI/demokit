import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDemoMutation } from '@demokit-ai/tanstack-query'
import type { Order, CheckoutVariables, CheckoutResponse } from '@/types'

/**
 * API functions for orders (used when demo mode is disabled)
 */
const api = {
  getOrders: async (): Promise<Order[]> => {
    const response = await fetch('/api/orders')
    if (!response.ok) throw new Error('Failed to fetch orders')
    return response.json()
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await fetch(`/api/orders/${id}`)
    if (!response.ok) throw new Error('Failed to fetch order')
    return response.json()
  },

  checkout: async (variables: CheckoutVariables): Promise<CheckoutResponse> => {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variables),
    })
    if (!response.ok) throw new Error('Checkout failed')
    return response.json()
  },
}

/**
 * Hook to fetch all orders
 */
export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: api.getOrders,
  })
}

/**
 * Hook to fetch a single order by ID
 */
export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: () => api.getOrder(id),
    enabled: !!id,
  })
}

/**
 * Hook to complete checkout
 */
export function useCheckout() {
  const queryClient = useQueryClient()

  return useDemoMutation<CheckoutResponse, Error, CheckoutVariables>({
    mutationFn: api.checkout,
    demoName: 'checkout',
    onSuccess: () => {
      // Invalidate cart and orders queries
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
