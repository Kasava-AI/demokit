/**
 * Cart data hooks
 *
 * Uses useDemoSWR and useDemoSWRMutation for cart operations
 */

import { useDemoSWR, useDemoSWRMutation } from '@demokit-ai/swr'
import type { CartResponse, CartMutationResponse } from '@/types'

/**
 * Fetch cart data
 */
export function useCart() {
  const { data, error, isLoading, mutate } = useDemoSWR<CartResponse>('/api/cart')

  return {
    cart: data?.cart ?? { items: [], total: 0 },
    products: data?.products ?? [],
    isLoading,
    error,
    mutate,
  }
}

/**
 * Add item to cart mutation
 */
export function useAddToCart() {
  const { trigger, isMutating, error } = useDemoSWRMutation<
    CartMutationResponse,
    { productId: string; quantity?: number }
  >('addToCart', '/api/cart')

  return {
    addToCart: trigger,
    isAdding: isMutating,
    error,
  }
}

/**
 * Update cart item quantity mutation
 */
export function useUpdateCartItem() {
  const { trigger, isMutating, error } = useDemoSWRMutation<
    CartMutationResponse,
    { productId: string; quantity: number }
  >('updateCartItem', '/api/cart')

  return {
    updateItem: trigger,
    isUpdating: isMutating,
    error,
  }
}

/**
 * Remove item from cart mutation
 */
export function useRemoveFromCart() {
  const { trigger, isMutating, error } = useDemoSWRMutation<
    CartMutationResponse,
    { productId: string }
  >('removeFromCart', '/api/cart')

  return {
    removeItem: trigger,
    isRemoving: isMutating,
    error,
  }
}

/**
 * Clear cart mutation
 */
export function useClearCart() {
  const { trigger, isMutating, error } = useDemoSWRMutation<CartMutationResponse, void>(
    'clearCart',
    '/api/cart'
  )

  return {
    clearCart: trigger,
    isClearing: isMutating,
    error,
  }
}
