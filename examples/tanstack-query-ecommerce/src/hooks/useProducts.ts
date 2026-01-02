import { useQuery } from '@tanstack/react-query'
import type { Product } from '@/types'

/**
 * API functions for products (used when demo mode is disabled)
 */
const api = {
  getProducts: async (filters?: { category?: string; search?: string }): Promise<Product[]> => {
    const params = new URLSearchParams()
    if (filters?.category) params.set('category', filters.category)
    if (filters?.search) params.set('search', filters.search)

    const response = await fetch(`/api/products?${params.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch products')
    return response.json()
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await fetch(`/api/products/${id}`)
    if (!response.ok) throw new Error('Failed to fetch product')
    return response.json()
  },

  getRelatedProducts: async (id: string): Promise<Product[]> => {
    const response = await fetch(`/api/products/${id}/related`)
    if (!response.ok) throw new Error('Failed to fetch related products')
    return response.json()
  },
}

/**
 * Hook to fetch all products with optional filtering
 */
export function useProducts(filters?: { category?: string; search?: string }) {
  // Build query key based on filters
  let queryKey: unknown[]
  if (filters?.category && filters?.search) {
    queryKey = ['products', { category: filters.category, search: filters.search }]
  } else if (filters?.category) {
    queryKey = ['products', { category: filters.category }]
  } else if (filters?.search) {
    queryKey = ['products', { search: filters.search }]
  } else {
    queryKey = ['products']
  }

  return useQuery<Product[]>({
    queryKey,
    queryFn: () => api.getProducts(filters),
  })
}

/**
 * Hook to fetch a single product by ID
 */
export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['products', id],
    queryFn: () => api.getProduct(id),
    enabled: !!id,
  })
}

/**
 * Hook to fetch related products for a given product ID
 */
export function useRelatedProducts(id: string) {
  return useQuery<Product[]>({
    queryKey: ['products', id, 'related'],
    queryFn: () => api.getRelatedProducts(id),
    enabled: !!id,
  })
}
