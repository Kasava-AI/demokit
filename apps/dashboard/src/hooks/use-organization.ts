import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  fetchOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  type Organization,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from '@/lib/api-client/organizations'

// Re-export types for convenience
export type { Organization, CreateOrganizationInput, UpdateOrganizationInput }

/**
 * Hook to fetch the current user's organizations.
 */
export function useOrganizations(
  options?: Omit<UseQueryOptions<Organization[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to get the primary organization (first one the user belongs to).
 * @deprecated Use useOrganizationContext().currentOrg instead
 */
export function usePrimaryOrganization(
  options?: Omit<UseQueryOptions<Organization[], Error>, 'queryKey' | 'queryFn'>
) {
  const query = useOrganizations(options)
  return {
    ...query,
    data: query.data?.[0] ?? null,
  }
}

/**
 * Hook to create a new organization.
 * The creator becomes the owner automatically.
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: (newOrg) => {
      // Add the new org to the cache
      queryClient.setQueryData<Organization[]>(['organizations'], (old) => {
        if (!old) return [newOrg]
        return [...old, newOrg]
      })
      // Also invalidate to ensure sync
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

/**
 * Hook to update an organization.
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

/**
 * Hook to delete an organization.
 * Only the owner can delete an organization.
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}
