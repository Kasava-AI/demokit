/**
 * Products data hooks
 *
 * Uses useDemoSWR to fetch product data with demo mode support
 */

import { useDemoSWR } from '@demokit-ai/swr'
import type { ProductsResponse, ProductDetailResponse } from '@/types'

/**
 * Fetch all products with optional filters
 */
export function useProducts(options?: { search?: string; category?: string }) {
  const searchParams = new URLSearchParams()

  if (options?.search) {
    searchParams.set('search', options.search)
  }
  if (options?.category) {
    searchParams.set('category', options.category)
  }

  const queryString = searchParams.toString()
  const url = queryString ? `/api/products?${queryString}` : '/api/products'

  const { data, error, isLoading, mutate } = useDemoSWR<ProductsResponse>(url)

  return {
    products: data?.products ?? [],
    categories: data?.categories ?? [],
    isLoading,
    error,
    mutate,
  }
}

/**
 * Fetch a single product by ID
 */
export function useProduct(id: string | undefined) {
  const { data, error, isLoading, mutate } = useDemoSWR<ProductDetailResponse>(
    id ? `/api/products/${id}` : null
  )

  return {
    product: data?.product,
    relatedProducts: data?.relatedProducts ?? [],
    isLoading,
    error,
    mutate,
  }
}
