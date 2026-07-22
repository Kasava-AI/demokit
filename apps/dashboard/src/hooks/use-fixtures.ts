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
  /** Provenance (Phase 4 Task 8): 'ci_fill' rows are unreviewed until a human publishes. */
  source: 'dashboard' | 'ci_fill'
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
  /** Demo-system link (Phase 2) — set when this fixture was created from a demo variant. */
  demoId: string | null
  /** Variant link (Phase 2) — when set, row-0 edits are pinned onto this variant's storySpec. */
  variantId: string | null
  name: string
  description: string | null
  publishedGenerationId: string | null
  draftGenerationId: string | null
  lastExportedAt: string | null
  exportFormat: string | null
  /** Hosted API fields (spec §6) — set when the fixture's hosted API has been enabled at least once. */
  apiKey: string | null
  hostedEnabled: boolean | null
  createdAt: string
  updatedAt: string
}

export interface FixtureWithRelations extends Fixture {
  template: FixtureTemplate | null
  createdBy: FixtureUser | null
  publishedGeneration: FixtureGeneration | null
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

/**
 * Publish audit log row (spec §6) — one immutable record per publish action.
 * Rollback is just publishing an older generationId, recorded as a new row.
 */
export interface PublishRecord {
  id: string
  generationId: string
  previousGenerationId: string | null
  publishedById: string | null
  note: string | null
  publishedAt: string
}

export interface PublishLinterFinding {
  severity: 'notice' | 'warning'
  message: string
  path: string
}

/** Full response from POST .../publish (Task 6). */
export interface PublishResponse {
  publish: PublishRecord
  fixture: Fixture
  warnings: string[]
  linterFindings: PublishLinterFinding[]
}

async function fetchPublishHistory(
  projectId: string,
  fixtureId: string
): Promise<PublishRecord[]> {
  const res = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/publish`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch publish history')
  }
  return res.json()
}

async function publishGeneration({
  projectId,
  fixtureId,
  generationId,
  note,
}: {
  projectId: string
  fixtureId: string
  generationId?: string
  note?: string
}): Promise<PublishResponse> {
  const res = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generationId, note }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to publish generation')
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
      // Invalidate the fixture itself (publishedGenerationId/draftGenerationId may have changed)
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
      // Invalidate the fixture itself (draftGenerationId may have been cleared)
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
 * Hook to publish a generation for a fixture (spec §6).
 * Re-points publishedGenerationId and records an immutable publishes row;
 * rollback is just publishing an older generationId.
 */
export function usePublishGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: publishGeneration,
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
      // Invalidate the publish history (audit log)
      queryClient.invalidateQueries({
        queryKey: [
          'projects',
          variables.projectId,
          'fixtures',
          variables.fixtureId,
          'publishes',
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
 * Hook to fetch the publish audit history for a fixture (spec §6), newest first.
 */
export function usePublishHistory(
  projectId: string,
  fixtureId: string,
  options?: Omit<UseQueryOptions<PublishRecord[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['projects', projectId, 'fixtures', fixtureId, 'publishes'],
    queryFn: () => fetchPublishHistory(projectId, fixtureId),
    enabled: !!projectId && !!fixtureId,
    staleTime: 60 * 1000,
    ...options,
  })
}

/**
 * Mint a short-lived preview-session token (spec §6) for a generation. The
 * dashboard opens the customer app with `?demo-preview=<token>`; the SDK
 * (packages/react provider.tsx) reads it off the URL and the cloud serves
 * that generation instead of the published one. Only wired up against
 * DemoKit Cloud — 404s on the OSS standalone since the mint route lives in
 * the private cloud repo.
 */
async function mintPreviewToken({
  projectId,
  fixtureId,
  generationId,
}: {
  projectId: string
  fixtureId: string
  generationId: string
}): Promise<{ token: string; expiresAt: string }> {
  const res = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/preview-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generationId }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    if (res.status === 404) throw new Error('Preview sessions need DemoKit Cloud (hosted API)')
    if (res.status === 503) throw new Error('Preview sessions are not configured on this server')
    throw new Error(error.error || 'Failed to mint preview token')
  }
  return res.json()
}

/**
 * Hook to mint a preview-session token for a generation (Task 8).
 */
export function useMintPreviewToken() {
  return useMutation({ mutationFn: mintPreviewToken })
}

export type {
  Fixture,
  FixtureGeneration,
  FixtureTemplate,
  GenerationLevel,
  GenerationStatus,
  ValidationError,
}
