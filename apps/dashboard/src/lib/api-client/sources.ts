import type { CreateSourceInput, UpdateSourceInput } from '@/lib/api/schemas'

export interface ProjectSource {
  id: string
  projectId: string
  type: 'website' | 'readme' | 'documentation'
  url: string | null
  content: string | null
  lastFetchedAt: string | null
  fetchStatus: string | null
  fetchError: string | null
  extractedContent: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  contributions?: SourceContribution[]
}

export interface SourceContribution {
  id: string
  sourceId: string
  entityType: 'feature' | 'journey'
  entityId: string
  entityName?: string
  evidence: string | null
  confidence: number | null
  createdAt: string
}

export interface SourceAnalysis {
  productName: string | null
  companyName: string | null
  targetAudience: string[]
  valuePropositions: string[]
  mentionedFeatures: string[]
  summary: string
  keyInsights: string[]
  confidence: number
  analyzedAt: string
}

export interface AnalyzeSourceResult {
  source: ProjectSource
  analysis: SourceAnalysis
  contributions: SourceContribution[]
}

/**
 * Fetch all sources for a project.
 */
export async function fetchProjectSources(projectId: string): Promise<ProjectSource[]> {
  const res = await fetch(`/api/projects/${projectId}/sources`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch sources')
  }
  return res.json()
}

/**
 * Create a new source for a project.
 */
export async function createProjectSource({
  projectId,
  data,
}: {
  projectId: string
  data: CreateSourceInput
}): Promise<ProjectSource> {
  const res = await fetch(`/api/projects/${projectId}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create source')
  }
  return res.json()
}

/**
 * Update an existing source.
 */
export async function updateProjectSource({
  projectId,
  sourceId,
  data,
}: {
  projectId: string
  sourceId: string
  data: UpdateSourceInput
}): Promise<ProjectSource> {
  const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update source')
  }
  return res.json()
}

/**
 * Delete a source.
 */
export async function deleteProjectSource({
  projectId,
  sourceId,
}: {
  projectId: string
  sourceId: string
}): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete source')
  }
}

/**
 * Fetch a single source with optional contributions.
 */
export async function fetchProjectSource({
  projectId,
  sourceId,
  includeContributions = false,
}: {
  projectId: string
  sourceId: string
  includeContributions?: boolean
}): Promise<ProjectSource> {
  const params = includeContributions ? '?include=contributions' : ''
  const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}${params}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch source')
  }
  return res.json()
}

/**
 * Analyze a source with AI.
 */
export async function analyzeProjectSource({
  projectId,
  sourceId,
  refetch = false,
}: {
  projectId: string
  sourceId: string
  refetch?: boolean
}): Promise<AnalyzeSourceResult> {
  const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refetch }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to analyze source')
  }
  return res.json()
}
