import { useMutation } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'

/**
 * Input schema for cost estimation request.
 */
interface EstimateInput {
  schema: {
    models: Array<{
      name: string
      fields: Array<{ name: string; type: string; isOptional?: boolean }>
    }>
  }
  narrative?: {
    scenario?: string
    keyPoints?: string[]
  }
  counts: Record<string, number>
  fixtureId?: string
}

/**
 * Cost estimate response from the API.
 */
interface CostEstimate {
  quoteId: string
  estimate: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    credits: number
    costUsd: number
    costFormatted: string
  }
  breakdown: {
    systemPrompt: number
    schemaContext: number
    narrativePrompt: number
    toolOverhead: number
    outputEstimate: number
    retryBuffer: number
  }
  expiresAt: string
}

/**
 * Fetch cost estimate from the API.
 */
async function fetchCostEstimate(
  projectId: string,
  input: EstimateInput
): Promise<CostEstimate> {
  const response = await fetch(`/api/projects/${projectId}/estimate-cost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to estimate cost')
  }

  return response.json()
}

/**
 * Hook for estimating costs before AI-powered fixture generation.
 *
 * Provides:
 * - `estimate`: Mutation function to request a new cost estimate
 * - `estimateAsync`: Async version of the mutation function
 * - `isEstimating`: Loading state while estimate is being calculated
 * - `currentQuote`: The current valid quote (null if expired)
 * - `isQuoteValid`: Whether the current quote is still valid
 * - `clearQuote`: Function to manually clear the current quote
 * - `error`: Any error from the last estimation attempt
 *
 * Quotes automatically expire after 15 minutes and are cleared from state.
 *
 * @param projectId - The project ID to estimate costs for
 *
 * @example
 * ```tsx
 * const { estimate, currentQuote, isEstimating } = useCostEstimate(projectId)
 *
 * // Request an estimate
 * estimate({
 *   schema: { models: [{ name: 'User', fields: [...] }] },
 *   counts: { User: 10 },
 * })
 *
 * // Display the estimate
 * if (currentQuote) {
 *   return <div>Estimated cost: {currentQuote.estimate.costFormatted}</div>
 * }
 * ```
 */
export function useCostEstimate(projectId: string) {
  const [currentQuote, setCurrentQuote] = useState<CostEstimate | null>(null)

  const estimateMutation = useMutation({
    mutationFn: (input: EstimateInput) => fetchCostEstimate(projectId, input),
    onSuccess: (data) => {
      setCurrentQuote(data)
    },
  })

  // Check if quote is valid (not expired)
  const isQuoteValid = currentQuote
    ? new Date(currentQuote.expiresAt) > new Date()
    : false

  // Auto-clear expired quotes
  useEffect(() => {
    if (!currentQuote) return

    const expiresAt = new Date(currentQuote.expiresAt)
    const now = new Date()
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()

    if (timeUntilExpiry <= 0) {
      setCurrentQuote(null)
      return
    }

    const timer = setTimeout(() => {
      setCurrentQuote(null)
    }, timeUntilExpiry)

    return () => clearTimeout(timer)
  }, [currentQuote])

  const clearQuote = useCallback(() => {
    setCurrentQuote(null)
  }, [])

  return {
    /** Request a new cost estimate */
    estimate: estimateMutation.mutate,
    /** Request a new cost estimate (async version) */
    estimateAsync: estimateMutation.mutateAsync,
    /** Whether an estimate request is in progress */
    isEstimating: estimateMutation.isPending,
    /** The current valid quote (null if expired or not yet requested) */
    currentQuote: isQuoteValid ? currentQuote : null,
    /** Whether the current quote is still valid */
    isQuoteValid,
    /** Manually clear the current quote */
    clearQuote,
    /** Error from the last estimation attempt */
    error: estimateMutation.error,
  }
}

export type { EstimateInput, CostEstimate }
