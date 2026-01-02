import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type { CreateTemplateInput } from '@/lib/api/schemas'
import type { TemplateCategory } from '@intelligence'

interface Template {
  id: string
  projectId: string
  name: string
  description: string | null
  category: TemplateCategory | null
  narrative: {
    scenario?: string
    keyPoints?: string[]
    tone?: string
    targetAudience?: string
  } | null
  instructions: {
    recordCounts?: Record<string, number>
    constraints?: Record<string, unknown>
    relationships?: Array<{
      from: string
      to: string
      type: string
    }>
  } | null
  preview: Record<string, unknown> | null
  relevanceScore: number | null
  isDefault: string | null
  createdAt: string
  updatedAt: string
}

async function fetchTemplates(projectId: string): Promise<Template[]> {
  const res = await fetch(`/api/projects/${projectId}/templates`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch templates')
  }
  return res.json()
}

async function createTemplate({
  projectId,
  data,
}: {
  projectId: string
  data: CreateTemplateInput
}): Promise<Template> {
  const res = await fetch(`/api/projects/${projectId}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create template')
  }
  return res.json()
}

/**
 * Hook to fetch all templates for a project.
 */
export function useTemplates(
  projectId: string,
  options?: Omit<UseQueryOptions<Template[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['projects', projectId, 'templates'],
    queryFn: () => fetchTemplates(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to create a new template.
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'templates'],
      })
    },
  })
}

export type { Template }
