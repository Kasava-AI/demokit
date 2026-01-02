import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  setActiveFixture,
  type Project,
  type ProjectWithRelations,
} from '@/lib/api-client/projects'

// Re-export types for convenience
export type { Project, ProjectWithRelations }

/**
 * Hook to fetch all projects for the specified organization.
 * If no organizationId is provided, uses the user's default organization.
 *
 * @param organizationId - Optional organization ID to fetch projects for
 * @param options - React Query options
 */
export function useProjects(
  organizationId?: string,
  options?: Omit<UseQueryOptions<Project[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: () => fetchProjects(organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to fetch a single project with all related data.
 */
export function useProject(
  id: string,
  options?: Omit<
    UseQueryOptions<ProjectWithRelations, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: 'always', // Always refetch when component mounts to get latest data
    ...options,
  })
}

/**
 * Hook to create a new project.
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

/**
 * Hook to update a project.
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] })
    },
  })
}

/**
 * Hook to delete a project.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

/**
 * Hook to set the active fixture for a project.
 * The active fixture is used as the default for API calls in demo mode.
 */
export function useSetActiveFixture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setActiveFixture,
    onSuccess: (_, variables) => {
      // Invalidate project queries to refetch with updated activeFixture
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] })
    },
  })
}
