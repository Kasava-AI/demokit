import type { CreateProjectInput, UpdateProjectInput } from '@/lib/api/schemas'

// Types inferred from database schema
export interface Project {
  id: string
  organizationId: string
  name: string
  description: string | null
  status: 'pending' | 'analyzing' | 'ready' | 'error'
  schema: Record<string, unknown> | null
  schemaVersion: string | null
  confidenceScore: number | null
  activeFixtureId: string | null
  settings: Record<string, unknown> | null
  analyzedAt: string | null
  createdAt: string
  updatedAt: string
}

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
}

export interface ProjectWithRelations extends Project {
  appIdentity: {
    id: string
    name: string | null
    description: string | null
    domain: string | null
    industry: string | null
    targetAudience: string | null
    valueProposition: string | null
    confidence: number | null
  } | null
  features: Array<{
    id: string
    name: string
    description: string | null
    category: string | null
    relatedModels: string[] | null
    confidence: number | null
  }>
  userJourneys: Array<{
    id: string
    name: string
    description: string | null
    persona: string | null
    steps: unknown[] | null
    confidence: number | null
  }>
  templates: Array<{
    id: string
    name: string
    description: string | null
    category: string | null
    relevanceScore: number | null
    narrative: {
      scenario: string
      keyPoints: string[]
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
    isDefault: boolean | null
    metadata: Record<string, unknown> | null
  }>
  fixtures: Array<{
    id: string
    name: string
    templateId: string | null
    status: string | null
    recordCount: number | null
    createdAt: string
  }>
  activeFixture: {
    id: string
    name: string
    description: string | null
    recordCount: number | null
    activeGeneration: {
      id: string
      data: Record<string, unknown[]> | null
      recordCount: number | null
      recordsByModel: Record<string, number> | null
    } | null
  } | null
  sources: ProjectSource[]
}

/**
 * Fetch all projects for the specified organization.
 * If no organizationId is provided, uses the user's default organization.
 */
export async function fetchProjects(organizationId?: string): Promise<Project[]> {
  const url = organizationId
    ? `/api/projects?organizationId=${organizationId}`
    : '/api/projects'
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch projects')
  }
  return res.json()
}

/**
 * Fetch a single project with all related data.
 */
export async function fetchProject(id: string): Promise<ProjectWithRelations> {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch project')
  }
  return res.json()
}

/**
 * Create a new project.
 */
export async function createProject(
  data: CreateProjectInput & { organizationId?: string }
): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create project')
  }
  return res.json()
}

/**
 * Update an existing project.
 */
export async function updateProject({
  id,
  data,
}: {
  id: string
  data: UpdateProjectInput
}): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update project')
  }
  return res.json()
}

/**
 * Delete a project.
 */
export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete project')
  }
}

/**
 * Set the active fixture for a project.
 * The active fixture is used as the default for API calls in demo mode.
 */
export async function setActiveFixture({
  projectId,
  fixtureId,
}: {
  projectId: string
  fixtureId: string | null
}): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeFixtureId: fixtureId }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to set active fixture')
  }
  return res.json()
}
