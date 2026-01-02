import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type {
  CreateDemoInput,
  UpdateDemoInput,
  CreateDemoVariantInput,
  UpdateDemoVariantInput,
  CreateDemoSetInput,
  UpdateDemoSetInput,
} from '@/lib/api/schemas'

// ============================================================================
// Types
// ============================================================================

interface UserJourney {
  id: string
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
}

interface DemoVariant {
  id: string
  demoId: string
  name: string
  slug: string
  description: string | null
  isDefault: boolean
  isPublished: boolean
  generationParams: {
    recordCounts?: Record<string, number>
    constraints?: Record<string, unknown>
  } | null
  createdAt: string
  updatedAt: string
}

interface DemoVariantWithFixtures extends DemoVariant {
  fixtures: Array<{
    id: string
    name: string
    activeGeneration: {
      id: string
      data: Record<string, unknown[]> | null
    } | null
  }>
}

interface Demo {
  id: string
  projectId: string
  name: string
  slug: string
  description: string | null
  selectedFeatureIds: string[] | null
  baseJourneyId: string | null
  customSteps: Array<{
    order: number
    action: string
    description?: string
    endpoint?: string
    model?: string
    featuresUsed?: string[]
  }> | null
  persona: string | null
  goal: string | null
  constraints: string[] | null
  storyNotes: string | null
  narrative: string | null
  tags: string[] | null
  category: string | null
  isPublished: boolean
  defaultVariantId: string | null
  createdAt: string
  updatedAt: string
}

export interface DemoWithRelations extends Demo {
  baseJourney: UserJourney | null
  variants: DemoVariant[]
  defaultVariant: DemoVariant | null
}

interface DemoSet {
  id: string
  projectId: string
  name: string
  slug: string
  description: string | null
  demos: Array<{
    demoId: string
    variantSlug?: string
    loadOrder: number
  }>
  tags: string[] | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Demo API Functions
// ============================================================================

async function fetchDemos(projectId: string): Promise<DemoWithRelations[]> {
  const res = await fetch(`/api/projects/${projectId}/demos`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch demos')
  }
  return res.json()
}

async function fetchDemo(
  projectId: string,
  demoId: string
): Promise<DemoWithRelations> {
  const res = await fetch(`/api/projects/${projectId}/demos/${demoId}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch demo')
  }
  return res.json()
}

async function createDemo({
  projectId,
  data,
}: {
  projectId: string
  data: CreateDemoInput
}): Promise<Demo> {
  const res = await fetch(`/api/projects/${projectId}/demos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create demo')
  }
  return res.json()
}

async function updateDemo({
  projectId,
  demoId,
  data,
}: {
  projectId: string
  demoId: string
  data: UpdateDemoInput
}): Promise<Demo> {
  const res = await fetch(`/api/projects/${projectId}/demos/${demoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update demo')
  }
  return res.json()
}

async function deleteDemo({
  projectId,
  demoId,
}: {
  projectId: string
  demoId: string
}): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/demos/${demoId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete demo')
  }
}

// ============================================================================
// Demo Hooks
// ============================================================================

/**
 * Hook to fetch all demos for a project.
 */
export function useDemos(
  projectId: string,
  options?: Omit<
    UseQueryOptions<DemoWithRelations[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['projects', projectId, 'demos'],
    queryFn: () => fetchDemos(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

/**
 * Hook to fetch a single demo with variants.
 */
export function useDemo(
  projectId: string,
  demoId: string,
  options?: Omit<
    UseQueryOptions<DemoWithRelations, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['projects', projectId, 'demos', demoId],
    queryFn: () => fetchDemo(projectId, demoId),
    enabled: !!projectId && !!demoId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  })
}

/**
 * Hook to create a new demo.
 */
export function useCreateDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDemo,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos'],
      })
    },
  })
}

/**
 * Hook to update a demo.
 */
export function useUpdateDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDemo,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ['projects', variables.projectId, 'demos'],
      })
      await queryClient.cancelQueries({
        queryKey: ['projects', variables.projectId, 'demos', variables.demoId],
      })

      const previousDemos = queryClient.getQueryData<DemoWithRelations[]>([
        'projects',
        variables.projectId,
        'demos',
      ])
      const previousDemo = queryClient.getQueryData<DemoWithRelations>([
        'projects',
        variables.projectId,
        'demos',
        variables.demoId,
      ])

      if (previousDemos) {
        queryClient.setQueryData<DemoWithRelations[]>(
          ['projects', variables.projectId, 'demos'],
          previousDemos.map((d) =>
            d.id === variables.demoId ? { ...d, ...variables.data } : d
          )
        )
      }

      if (previousDemo) {
        queryClient.setQueryData<DemoWithRelations>(
          ['projects', variables.projectId, 'demos', variables.demoId],
          { ...previousDemo, ...variables.data }
        )
      }

      return { previousDemos, previousDemo }
    },
    onError: (_, variables, context) => {
      if (context?.previousDemos) {
        queryClient.setQueryData(
          ['projects', variables.projectId, 'demos'],
          context.previousDemos
        )
      }
      if (context?.previousDemo) {
        queryClient.setQueryData(
          ['projects', variables.projectId, 'demos', variables.demoId],
          context.previousDemo
        )
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos'],
      })
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos', variables.demoId],
      })
    },
  })
}

/**
 * Hook to delete a demo.
 */
export function useDeleteDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDemo,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos'],
      })
    },
  })
}

// ============================================================================
// Variant API Functions
// ============================================================================

async function fetchVariants(
  projectId: string,
  demoId: string
): Promise<DemoVariantWithFixtures[]> {
  const res = await fetch(`/api/projects/${projectId}/demos/${demoId}/variants`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch variants')
  }
  return res.json()
}

async function fetchVariant(
  projectId: string,
  demoId: string,
  variantId: string
): Promise<DemoVariantWithFixtures> {
  const res = await fetch(
    `/api/projects/${projectId}/demos/${demoId}/variants/${variantId}`
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch variant')
  }
  return res.json()
}

async function createVariant({
  projectId,
  demoId,
  data,
}: {
  projectId: string
  demoId: string
  data: CreateDemoVariantInput
}): Promise<DemoVariant> {
  const res = await fetch(`/api/projects/${projectId}/demos/${demoId}/variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create variant')
  }
  return res.json()
}

async function updateVariant({
  projectId,
  demoId,
  variantId,
  data,
}: {
  projectId: string
  demoId: string
  variantId: string
  data: UpdateDemoVariantInput
}): Promise<DemoVariant> {
  const res = await fetch(
    `/api/projects/${projectId}/demos/${demoId}/variants/${variantId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update variant')
  }
  return res.json()
}

async function deleteVariant({
  projectId,
  demoId,
  variantId,
}: {
  projectId: string
  demoId: string
  variantId: string
}): Promise<void> {
  const res = await fetch(
    `/api/projects/${projectId}/demos/${demoId}/variants/${variantId}`,
    {
      method: 'DELETE',
    }
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete variant')
  }
}

// ============================================================================
// Variant Hooks
// ============================================================================

/**
 * Hook to fetch all variants for a demo.
 */
export function useDemoVariants(
  projectId: string,
  demoId: string,
  options?: Omit<
    UseQueryOptions<DemoVariantWithFixtures[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['projects', projectId, 'demos', demoId, 'variants'],
    queryFn: () => fetchVariants(projectId, demoId),
    enabled: !!projectId && !!demoId,
    staleTime: 1 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to fetch a single variant with fixtures.
 */
export function useDemoVariant(
  projectId: string,
  demoId: string,
  variantId: string,
  options?: Omit<
    UseQueryOptions<DemoVariantWithFixtures, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['projects', projectId, 'demos', demoId, 'variants', variantId],
    queryFn: () => fetchVariant(projectId, demoId, variantId),
    enabled: !!projectId && !!demoId && !!variantId,
    staleTime: 1 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to create a new variant.
 */
export function useCreateDemoVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createVariant,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos', variables.demoId, 'variants'],
      })
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos', variables.demoId],
      })
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos'],
      })
    },
  })
}

/**
 * Hook to update a variant.
 */
export function useUpdateDemoVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateVariant,
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos', variables.demoId, 'variants'],
      })
      queryClient.invalidateQueries({
        queryKey: [
          'projects',
          variables.projectId,
          'demos',
          variables.demoId,
          'variants',
          variables.variantId,
        ],
      })
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos', variables.demoId],
      })
    },
  })
}

/**
 * Hook to delete a variant.
 */
export function useDeleteDemoVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteVariant,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos', variables.demoId, 'variants'],
      })
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos', variables.demoId],
      })
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demos'],
      })
    },
  })
}

// ============================================================================
// Demo Set API Functions
// ============================================================================

async function fetchDemoSets(projectId: string): Promise<DemoSet[]> {
  const res = await fetch(`/api/projects/${projectId}/demo-sets`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch demo sets')
  }
  return res.json()
}

async function fetchDemoSet(
  projectId: string,
  slug: string
): Promise<DemoSet> {
  const res = await fetch(`/api/projects/${projectId}/demo-sets/${slug}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch demo set')
  }
  return res.json()
}

async function createDemoSet({
  projectId,
  data,
}: {
  projectId: string
  data: CreateDemoSetInput
}): Promise<DemoSet> {
  const res = await fetch(`/api/projects/${projectId}/demo-sets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create demo set')
  }
  return res.json()
}

async function updateDemoSet({
  projectId,
  slug,
  data,
}: {
  projectId: string
  slug: string
  data: UpdateDemoSetInput
}): Promise<DemoSet> {
  const res = await fetch(`/api/projects/${projectId}/demo-sets/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update demo set')
  }
  return res.json()
}

async function deleteDemoSet({
  projectId,
  slug,
}: {
  projectId: string
  slug: string
}): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/demo-sets/${slug}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete demo set')
  }
}

// ============================================================================
// Demo Set Hooks
// ============================================================================

/**
 * Hook to fetch all demo sets for a project.
 */
export function useDemoSets(
  projectId: string,
  options?: Omit<UseQueryOptions<DemoSet[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['projects', projectId, 'demo-sets'],
    queryFn: () => fetchDemoSets(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to fetch a single demo set.
 */
export function useDemoSet(
  projectId: string,
  slug: string,
  options?: Omit<UseQueryOptions<DemoSet, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['projects', projectId, 'demo-sets', slug],
    queryFn: () => fetchDemoSet(projectId, slug),
    enabled: !!projectId && !!slug,
    staleTime: 1 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to create a new demo set.
 */
export function useCreateDemoSet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDemoSet,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demo-sets'],
      })
    },
  })
}

/**
 * Hook to update a demo set.
 */
export function useUpdateDemoSet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDemoSet,
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demo-sets'],
      })
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demo-sets', variables.slug],
      })
    },
  })
}

/**
 * Hook to delete a demo set.
 */
export function useDeleteDemoSet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDemoSet,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'demo-sets'],
      })
    },
  })
}

// ============================================================================
// Type exports
// ============================================================================

export type {
  Demo,
  DemoVariant,
  DemoVariantWithFixtures,
  DemoSet,
}
