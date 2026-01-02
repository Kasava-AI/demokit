/**
 * Orders data hooks
 *
 * Uses useDemoSWR to fetch order data with demo mode support
 */

import { useDemoSWR, useDemoSWRMutation } from '@demokit-ai/swr'
import type { OrdersResponse, OrderDetailResponse, CheckoutMutationResponse } from '@/types'

/**
 * Fetch all orders
 */
export function useOrders() {
  const { data, error, isLoading, mutate } = useDemoSWR<OrdersResponse>('/api/orders')

  return {
    orders: data?.orders ?? [],
    isLoading,
    error,
    mutate,
  }
}

/**
 * Fetch a single order by ID
 */
export function useOrder(id: string | undefined) {
  const { data, error, isLoading, mutate } = useDemoSWR<OrderDetailResponse>(
    id ? `/api/orders/${id}` : null
  )

  return {
    order: data?.order,
    products: data?.products ?? [],
    isLoading,
    error,
    mutate,
  }
}

/**
 * Checkout mutation
 */
export function useCheckout() {
  const { trigger, isMutating, error, data } = useDemoSWRMutation<
    CheckoutMutationResponse,
    { email: string; name: string; address: string; city: string; zipCode: string }
  >('checkout', '/api/checkout')

  return {
    checkout: trigger,
    isSubmitting: isMutating,
    error,
    result: data,
  }
}
