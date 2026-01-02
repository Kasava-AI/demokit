import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type { SaveIntelligenceInput } from '@/lib/api/schemas'

interface AppIdentity {
  id: string
  projectId: string
  name: string | null
  description: string | null
  domain: string | null
  industry: string | null
  targetAudience: string | null
  valueProposition: string | null
  competitiveAdvantages: string[] | null
  confidence: number | null
  createdAt: string
  updatedAt: string
}

interface Feature {
  id: string
  projectId: string
  name: string
  description: string | null
  category: string | null
  relatedModels: string[] | null
  relatedEndpoints: string[] | null
  confidence: number | null
  createdAt: string
  updatedAt: string
}

interface UserJourney {
  id: string
  projectId: string
  name: string
  description: string | null
  persona: string | null
  steps: Array<{
    order: number
    action: string
    description?: string
    endpoint?: string
    model?: string
  }> | null
  relatedFeatures: string[] | null
  confidence: number | null
  createdAt: string
  updatedAt: string
}

interface Intelligence {
  appIdentity: AppIdentity | null
  features: Feature[]
  journeys: UserJourney[]
}

async function fetchIntelligence(projectId: string): Promise<Intelligence> {
  const res = await fetch(`/api/projects/${projectId}/intelligence`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch intelligence')
  }
  return res.json()
}

async function saveIntelligence({
  projectId,
  data,
}: {
  projectId: string
  data: SaveIntelligenceInput
}): Promise<Intelligence> {
  const res = await fetch(`/api/projects/${projectId}/intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to save intelligence')
  }
  return res.json()
}

/**
 * Hook to fetch intelligence data for a project.
 */
export function useIntelligence(
  projectId: string,
  options?: Omit<UseQueryOptions<Intelligence, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['projects', projectId, 'intelligence'],
    queryFn: () => fetchIntelligence(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to save intelligence data for a project.
 */
export function useSaveIntelligence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveIntelligence,
    onSuccess: (_, variables) => {
      // Invalidate intelligence-specific queries
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'intelligence'],
      })
      // Invalidate and refetch the project query to get fresh features/journeys/templates
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId],
        refetchType: 'all',
      })
      // Also invalidate the projects list for consistency
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        exact: false,
      })
    },
  })
}

export type { AppIdentity, Feature, UserJourney, Intelligence }
