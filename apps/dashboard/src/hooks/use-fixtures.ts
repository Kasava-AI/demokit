import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type { CreateFixtureInput, UpdateFixtureInput, CreateGenerationInput } from '@/lib/api/schemas'

interface FixtureUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

interface FixtureTemplate {
  id: string
  name: string
  description: string | null
  category: string | null
}

type GenerationLevel = 'schema-valid' | 'relationship-valid' | 'narrative-driven'
type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed'

interface ValidationError {
  type: string
  model: string
  field?: string
  message: string
}

interface FixtureGeneration {
  id: string
  fixtureId: string
  label: string | null
  level: GenerationLevel
  data: Record<string, unknown[]> | null
  code: string | null
  validationValid: boolean | null
  validationErrorCount: number
  validationWarningCount: number
  validationErrors: ValidationError[] | null
  recordCount: number | null
  recordsByModel: Record<string, number> | null
  inputParameters: Record<string, unknown> | null
  status: GenerationStatus | null
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  errorDetails: Record<string, unknown> | null
  durationMs: number | null
  tokensUsed: number | null
  createdAt: string
}

interface Fixture {
  id: string
  projectId: string
  templateId: string | null
  createdById: string | null
  name: string
  description: string | null
  activeGenerationId: string | null
  lastExportedAt: string | null
  exportFormat: string | null
  createdAt: string
  updatedAt: string
}

export interface FixtureWithRelations extends Fixture {
  template: FixtureTemplate | null
  createdBy: FixtureUser | null
  activeGeneration: FixtureGeneration | null
  generations?: FixtureGeneration[]
}

async function fetchFixtures(projectId: string): Promise<FixtureWithRelations[]> {
  const res = await fetch(`/api/projects/${projectId}/fixtures`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch fixtures')
  }
  return res.json()
}

async function fetchFixture(
  projectId: string,
  fixtureId: string
): Promise<FixtureWithRelations> {
  const res = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch fixture')
  }
  return res.json()
}

async function createFixture({
  projectId,
  data,
}: {
  projectId: string
  data: CreateFixtureInput
}): Promise<Fixture> {
  const res = await fetch(`/api/projects/${projectId}/fixtures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create fixture')
  }
  return res.json()
}

async function updateFixture({
  projectId,
  fixtureId,
  data,
}: {
  projectId: string
  fixtureId: string
  data: UpdateFixtureInput
}): Promise<Fixture> {
  const res = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update fixture')
  }
  return res.json()
}

async function deleteFixture({
  projectId,
  fixtureId,
}: {
  projectId: string
  fixtureId: string
}): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete fixture')
  }
}

/**
 * Hook to fetch all fixtures for a project.
 */
export function useFixtures(
  projectId: string,
  options?: Omit<
    UseQueryOptions<FixtureWithRelations[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['projects', projectId, 'fixtures'],
    queryFn: () => fetchFixtures(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

/**
 * Hook to fetch a single fixture with generations history.
 */
export function useFixture(
  projectId: string,
  fixtureId: string,
  options?: Omit<
    UseQueryOptions<FixtureWithRelations, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['projects', projectId, 'fixtures', fixtureId],
    queryFn: () => fetchFixture(projectId, fixtureId),
    enabled: !!projectId && !!fixtureId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  })
}

/**
 * Hook to create a new fixture.
 */
export function useCreateFixture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createFixture,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'fixtures'],
      })
    },
  })
}

/**
 * Hook to update a fixture.
 */
export function useUpdateFixture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateFixture,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['projects', variables.projectId, 'fixtures'],
      })
      await queryClient.cancelQueries({
        queryKey: ['projects', variables.projectId, 'fixtures', variables.fixtureId],
      })

      // Snapshot the previous values
      const previousFixtures = queryClient.getQueryData<FixtureWithRelations[]>([
        'projects',
        variables.projectId,
        'fixtures',
      ])
      const previousFixture = queryClient.getQueryData<FixtureWithRelations>([
        'projects',
        variables.projectId,
        'fixtures',
        variables.fixtureId,
      ])

      // Optimistically update the fixtures list
      if (previousFixtures) {
        queryClient.setQueryData<FixtureWithRelations[]>(
          ['projects', variables.projectId, 'fixtures'],
          previousFixtures.map((f) =>
            f.id === variables.fixtureId ? { ...f, ...variables.data } : f
          )
        )
      }

      // Optimistically update the single fixture
      if (previousFixture) {
        queryClient.setQueryData<FixtureWithRelations>(
          ['projects', variables.projectId, 'fixtures', variables.fixtureId],
          { ...previousFixture, ...variables.data }
        )
      }

      return { previousFixtures, previousFixture }
    },
    onError: (_, variables, context) => {
      // Rollback on error
      if (context?.previousFixtures) {
        queryClient.setQueryData(
          ['projects', variables.projectId, 'fixtures'],
          context.previousFixtures
        )
      }
      if (context?.previousFixture) {
        queryClient.setQueryData(
          ['projects', variables.projectId, 'fixtures', variables.fixtureId],
          context.previousFixture
        )
      }
    },
    onSettled: (_, __, variables) => {
      // Refetch after mutation settles to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'fixtures'],
      })
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'fixtures', variables.fixtureId],
      })
    },
  })
}

/**
 * Hook to delete a fixture.
 */
export function useDeleteFixture() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteFixture,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'fixtures'],
      })
    },
  })
}

// ============================================================================
// Generation Hooks
// ============================================================================

async function fetchGenerations(
  projectId: string,
  fixtureId: string
): Promise<FixtureGeneration[]> {
  const res = await fetch(
    `/api/projects/${projectId}/fixtures/${fixtureId}/generations`
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch generations')
  }
  return res.json()
}

async function fetchGeneration(
  projectId: string,
  fixtureId: string,
  generationId: string
): Promise<FixtureGeneration> {
  const res = await fetch(
    `/api/projects/${projectId}/fixtures/${fixtureId}/generations/${generationId}`
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch generation')
  }
  return res.json()
}

async function createGeneration({
  projectId,
  fixtureId,
  data,
}: {
  projectId: string
  fixtureId: string
  data: CreateGenerationInput
}): Promise<FixtureGeneration> {
  const res = await fetch(
    `/api/projects/${projectId}/fixtures/${fixtureId}/generations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create generation')
  }
  return res.json()
}

async function deleteGeneration({
  projectId,
  fixtureId,
  generationId,
}: {
  projectId: string
  fixtureId: string
  generationId: string
}): Promise<void> {
  const res = await fetch(
    `/api/projects/${projectId}/fixtures/${fixtureId}/generations/${generationId}`,
    {
      method: 'DELETE',
    }
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete generation')
  }
}

async function setActiveGeneration({
  projectId,
  fixtureId,
  generationId,
}: {
  projectId: string
  fixtureId: string
  generationId: string | null
}): Promise<Fixture> {
  const res = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeGenerationId: generationId }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to set active generation')
  }
  return res.json()
}

/**
 * Hook to fetch all generations for a fixture.
 */
export function useFixtureGenerations(
  projectId: string,
  fixtureId: string,
  options?: Omit<
    UseQueryOptions<FixtureGeneration[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: ['projects', projectId, 'fixtures', fixtureId, 'generations'],
    queryFn: () => fetchGenerations(projectId, fixtureId),
    enabled: !!projectId && !!fixtureId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  })
}

/**
 * Hook to fetch a single generation.
 */
export function useGeneration(
  projectId: string,
  fixtureId: string,
  generationId: string,
  options?: Omit<UseQueryOptions<FixtureGeneration, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [
      'projects',
      projectId,
      'fixtures',
      fixtureId,
      'generations',
      generationId,
    ],
    queryFn: () => fetchGeneration(projectId, fixtureId, generationId),
    enabled: !!projectId && !!fixtureId && !!generationId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  })
}

/**
 * Hook to create a new generation for a fixture.
 */
export function useCreateGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGeneration,
    onSuccess: (newGeneration, variables) => {
      // Invalidate generations list
      queryClient.invalidateQueries({
        queryKey: [
          'projects',
          variables.projectId,
          'fixtures',
          variables.fixtureId,
          'generations',
        ],
      })
      // Invalidate the fixture itself (activeGenerationId may have changed)
      queryClient.invalidateQueries({
        queryKey: [
          'projects',
          variables.projectId,
          'fixtures',
          variables.fixtureId,
        ],
      })
      // Invalidate fixtures list
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'fixtures'],
      })
    },
  })
}

/**
 * Hook to delete a generation.
 */
export function useDeleteGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGeneration,
    onSuccess: (_, variables) => {
      // Invalidate generations list
      queryClient.invalidateQueries({
        queryKey: [
          'projects',
          variables.projectId,
          'fixtures',
          variables.fixtureId,
          'generations',
        ],
      })
      // Invalidate the fixture itself (activeGenerationId may have been cleared)
      queryClient.invalidateQueries({
        queryKey: [
          'projects',
          variables.projectId,
          'fixtures',
          variables.fixtureId,
        ],
      })
      // Invalidate fixtures list
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'fixtures'],
      })
    },
  })
}

/**
 * Hook to set the active generation for a fixture.
 * This allows switching between different generation versions.
 */
export function useSetActiveGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setActiveGeneration,
    onSuccess: (_, variables) => {
      // Invalidate the fixture
      queryClient.invalidateQueries({
        queryKey: [
          'projects',
          variables.projectId,
          'fixtures',
          variables.fixtureId,
        ],
      })
      // Invalidate fixtures list
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'fixtures'],
      })
    },
  })
}

export type {
  Fixture,
  FixtureGeneration,
  FixtureTemplate,
  GenerationLevel,
  GenerationStatus,
  ValidationError,
}
