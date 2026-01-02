import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  fetchProjectSources,
  fetchProjectSource,
  createProjectSource,
  updateProjectSource,
  deleteProjectSource,
  analyzeProjectSource,
  type ProjectSource,
  type SourceAnalysis,
  type SourceContribution,
  type AnalyzeSourceResult,
} from '@/lib/api-client/sources'
import type { CreateSourceInput, UpdateSourceInput } from '@/lib/api/schemas'

/**
 * Hook to fetch all sources for a project.
 */
export function useSources(
  projectId: string,
  options?: Omit<UseQueryOptions<ProjectSource[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['projects', projectId, 'sources'],
    queryFn: () => fetchProjectSources(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to create a new source.
 */
export function useCreateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateSourceInput }) =>
      createProjectSource({ projectId, data }),
    onSuccess: (_, variables) => {
      // Invalidate sources query
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'sources'],
      })
      // Also invalidate the project query to refresh sources in project data
      queryClient.invalidateQueries({
        queryKey: ['project', variables.projectId],
      })
    },
  })
}

/**
 * Hook to update a source.
 */
export function useUpdateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      sourceId,
      data,
    }: {
      projectId: string
      sourceId: string
      data: UpdateSourceInput
    }) => updateProjectSource({ projectId, sourceId, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'sources'],
      })
      queryClient.invalidateQueries({
        queryKey: ['project', variables.projectId],
      })
    },
  })
}

/**
 * Hook to delete a source.
 */
export function useDeleteSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, sourceId }: { projectId: string; sourceId: string }) =>
      deleteProjectSource({ projectId, sourceId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'sources'],
      })
      queryClient.invalidateQueries({
        queryKey: ['project', variables.projectId],
      })
    },
  })
}

/**
 * Hook to fetch a single source with optional contributions.
 */
export function useSource(
  projectId: string,
  sourceId: string,
  options?: {
    includeContributions?: boolean
  } & Omit<UseQueryOptions<ProjectSource, Error>, 'queryKey' | 'queryFn'>
) {
  const { includeContributions = false, ...queryOptions } = options || {}

  return useQuery({
    queryKey: ['projects', projectId, 'sources', sourceId, { includeContributions }],
    queryFn: () => fetchProjectSource({ projectId, sourceId, includeContributions }),
    enabled: !!projectId && !!sourceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...queryOptions,
  })
}

/**
 * Hook to analyze a source with AI.
 */
export function useAnalyzeSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      sourceId,
      refetch = false,
    }: {
      projectId: string
      sourceId: string
      refetch?: boolean
    }) => analyzeProjectSource({ projectId, sourceId, refetch }),
    onSuccess: (result, variables) => {
      // Invalidate sources queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'sources'],
      })
      queryClient.invalidateQueries({
        queryKey: ['project', variables.projectId],
      })
      // Update specific source cache with the new data
      queryClient.setQueryData(
        ['projects', variables.projectId, 'sources', variables.sourceId, { includeContributions: true }],
        result.source
      )
    },
  })
}

export type { ProjectSource, SourceAnalysis, SourceContribution, AnalyzeSourceResult }
