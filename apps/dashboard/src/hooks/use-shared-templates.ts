import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchSharedTemplates,
  fetchSharedTemplate,
  createSharedTemplate,
  updateSharedTemplate,
  deleteSharedTemplate,
  saveTemplate,
  unsaveTemplate,
  applyTemplateToProject,
  type SharedTemplate,
  type SharedTemplateFilters,
  type CreateSharedTemplateInput,
  type UpdateSharedTemplateInput,
} from '@/lib/api-client/shared-templates'

/**
 * Query key factory for shared templates
 */
export const sharedTemplateKeys = {
  all: ['shared-templates'] as const,
  lists: () => [...sharedTemplateKeys.all, 'list'] as const,
  list: (orgId: string, filters?: SharedTemplateFilters) =>
    [...sharedTemplateKeys.lists(), orgId, filters] as const,
  details: () => [...sharedTemplateKeys.all, 'detail'] as const,
  detail: (orgId: string, id: string) =>
    [...sharedTemplateKeys.details(), orgId, id] as const,
}

/**
 * Hook to fetch all shared templates for an organization
 */
export function useSharedTemplates(
  organizationId: string | undefined,
  filters?: SharedTemplateFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: sharedTemplateKeys.list(organizationId ?? '', filters),
    queryFn: () => fetchSharedTemplates(organizationId!, filters),
    enabled: !!organizationId && (options?.enabled ?? true),
  })
}

/**
 * Hook to fetch a single shared template
 */
export function useSharedTemplate(
  organizationId: string | undefined,
  templateId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: sharedTemplateKeys.detail(organizationId ?? '', templateId ?? ''),
    queryFn: () => fetchSharedTemplate(organizationId!, templateId!),
    enabled: !!organizationId && !!templateId && (options?.enabled ?? true),
  })
}

/**
 * Hook to create a new shared template
 */
export function useCreateSharedTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSharedTemplate,
    onSuccess: (data, variables) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: sharedTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Hook to update a shared template
 */
export function useUpdateSharedTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSharedTemplate,
    onSuccess: (data, variables) => {
      // Update the cache directly
      queryClient.setQueryData(
        sharedTemplateKeys.detail(variables.organizationId, variables.templateId),
        data
      )
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: sharedTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Hook to delete a shared template
 */
export function useDeleteSharedTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSharedTemplate,
    onSuccess: (_, variables) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: sharedTemplateKeys.detail(variables.organizationId, variables.templateId),
      })
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: sharedTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Hook to save/favorite a template
 */
export function useSaveTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveTemplate,
    onSuccess: (_, variables) => {
      // Update the template in cache to show as saved
      queryClient.setQueryData<SharedTemplate>(
        sharedTemplateKeys.detail(variables.organizationId, variables.templateId),
        (old) => (old ? { ...old, isSaved: true } : old)
      )
      // Invalidate list queries to update saved status
      queryClient.invalidateQueries({
        queryKey: sharedTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Hook to unsave/unfavorite a template
 */
export function useUnsaveTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unsaveTemplate,
    onSuccess: (_, variables) => {
      // Update the template in cache to show as not saved
      queryClient.setQueryData<SharedTemplate>(
        sharedTemplateKeys.detail(variables.organizationId, variables.templateId),
        (old) => (old ? { ...old, isSaved: false } : old)
      )
      // Invalidate list queries to update saved status
      queryClient.invalidateQueries({
        queryKey: sharedTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Hook to apply a template to a project
 */
export function useApplyTemplateToProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applyTemplateToProject,
    onSuccess: (data, variables) => {
      // Invalidate project templates query
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'templates'],
      })
      // Update usage count in cache
      queryClient.setQueryData<SharedTemplate>(
        sharedTemplateKeys.detail(variables.organizationId, variables.templateId),
        (old) =>
          old ? { ...old, usageCount: (old.usageCount || 0) + 1 } : old
      )
    },
  })
}

// Re-export types for convenience
export type {
  SharedTemplate,
  SharedTemplateFilters,
  CreateSharedTemplateInput,
  UpdateSharedTemplateInput,
}
