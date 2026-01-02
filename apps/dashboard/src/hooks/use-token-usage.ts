import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Token usage response from API
 */
export interface TokenUsage {
  /** Total tokens used in the current month */
  totalTokens: number
  /** Number of L3 generations in the current month */
  generationCount: number
  /** Start of the current billing period */
  periodStart: string
  /** End of the current billing period */
  periodEnd: string
}

async function fetchTokenUsage(organizationId: string): Promise<TokenUsage> {
  const res = await fetch(`/api/user/token-usage?organizationId=${organizationId}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch token usage')
  }
  return res.json()
}

/**
 * Hook to fetch token usage for an organization in the current month.
 *
 * @param organizationId - The organization ID to fetch usage for
 * @param options - Additional query options
 *
 * @example
 * ```tsx
 * const { currentOrg } = useOrganizationContext()
 * const { data: usage } = useTokenUsage(currentOrg?.id)
 *
 * return <div>Tokens used: {usage?.totalTokens.toLocaleString()}</div>
 * ```
 */
export function useTokenUsage(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<TokenUsage, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['token-usage', organizationId],
    queryFn: () => fetchTokenUsage(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}
