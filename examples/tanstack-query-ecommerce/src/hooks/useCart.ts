import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDemoMutation } from '@demokit-ai/tanstack-query'
import type {
  Cart,
  AddToCartVariables,
  UpdateCartItemVariables,
  RemoveFromCartVariables,
  CartMutationResponse,
} from '@/types'

/**
 * API functions for cart (used when demo mode is disabled)
 */
const api = {
  getCart: async (): Promise<Cart> => {
    const response = await fetch('/api/cart')
    if (!response.ok) throw new Error('Failed to fetch cart')
    return response.json()
  },

  addToCart: async (variables: AddToCartVariables): Promise<CartMutationResponse> => {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', ...variables }),
    })
    if (!response.ok) throw new Error('Failed to add to cart')
    return response.json()
  },

  updateCartItem: async (variables: UpdateCartItemVariables): Promise<CartMutationResponse> => {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ...variables }),
    })
    if (!response.ok) throw new Error('Failed to update cart')
    return response.json()
  },

  removeFromCart: async (variables: RemoveFromCartVariables): Promise<CartMutationResponse> => {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', ...variables }),
    })
    if (!response.ok) throw new Error('Failed to remove from cart')
    return response.json()
  },

  clearCart: async (): Promise<CartMutationResponse> => {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    })
    if (!response.ok) throw new Error('Failed to clear cart')
    return response.json()
  },
}

/**
 * Hook to fetch the current cart
 */
export function useCart() {
  return useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: api.getCart,
  })
}

/**
 * Hook to add an item to the cart
 */
export function useAddToCart() {
  const queryClient = useQueryClient()

  return useDemoMutation<CartMutationResponse, Error, AddToCartVariables>({
    mutationFn: api.addToCart,
    demoName: 'addToCart',
    onSuccess: () => {
      // Invalidate cart query to refetch
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

/**
 * Hook to update cart item quantity
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useDemoMutation<CartMutationResponse, Error, UpdateCartItemVariables>({
    mutationFn: api.updateCartItem,
    demoName: 'updateCartItem',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

/**
 * Hook to remove an item from the cart
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient()

  return useDemoMutation<CartMutationResponse, Error, RemoveFromCartVariables>({
    mutationFn: api.removeFromCart,
    demoName: 'removeFromCart',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

/**
 * Hook to clear the entire cart
 */
export function useClearCart() {
  const queryClient = useQueryClient()

  return useDemoMutation<CartMutationResponse, Error, void>({
    mutationFn: api.clearCart,
    demoName: 'clearCart',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
