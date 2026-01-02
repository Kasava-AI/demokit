/**
 * Template visibility type
 */
export type TemplateVisibility = 'private' | 'organization' | 'public'

/**
 * Template category type (matches template_category enum)
 */
export type TemplateCategory =
  | 'demo'
  | 'happyPath'
  | 'edgeCase'
  | 'onboarding'
  | 'migration'
  | 'recovery'
  | 'growth'
  | 'decline'
  | 'comparison'
  | 'training'

/**
 * Shared template data structure
 */
export interface SharedTemplate {
  id: string
  organizationId: string
  createdById: string
  name: string
  description: string | null
  category: TemplateCategory
  visibility: TemplateVisibility
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
  preview: Record<string, unknown> | null
  tags: string[]
  industry: string | null
  domain: string | null
  usageCount: number
  rating: number | null
  ratingCount: number
  isDefault: boolean
  isFeatured: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  // Joined data
  createdBy?: {
    id: string
    email: string
    fullName: string | null
  }
  isSaved?: boolean
}

/**
 * Create shared template input
 */
export interface CreateSharedTemplateInput {
  name: string
  description?: string | null
  category?: TemplateCategory
  visibility?: TemplateVisibility
  narrative?: SharedTemplate['narrative']
  instructions?: SharedTemplate['instructions']
  preview?: Record<string, unknown>
  tags?: string[]
  industry?: string
  domain?: string
}

/**
 * Update shared template input
 */
export interface UpdateSharedTemplateInput {
  name?: string
  description?: string | null
  category?: TemplateCategory
  visibility?: TemplateVisibility
  narrative?: SharedTemplate['narrative']
  instructions?: SharedTemplate['instructions']
  preview?: Record<string, unknown>
  tags?: string[]
  industry?: string
  domain?: string
  isFeatured?: boolean
}

/**
 * Template filter options
 */
export interface SharedTemplateFilters {
  category?: TemplateCategory
  visibility?: TemplateVisibility
  search?: string
  tags?: string[]
  savedOnly?: boolean
}

/**
 * Fetch all shared templates for the current organization
 */
export async function fetchSharedTemplates(
  organizationId: string,
  filters?: SharedTemplateFilters
): Promise<SharedTemplate[]> {
  const params = new URLSearchParams()
  if (filters?.category) params.set('category', filters.category)
  if (filters?.visibility) params.set('visibility', filters.visibility)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.tags?.length) params.set('tags', filters.tags.join(','))
  if (filters?.savedOnly) params.set('savedOnly', 'true')

  const queryString = params.toString()
  const url = `/api/organization/${organizationId}/shared-templates${queryString ? `?${queryString}` : ''}`

  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch shared templates')
  }
  return res.json()
}

/**
 * Fetch a single shared template
 */
export async function fetchSharedTemplate(
  organizationId: string,
  templateId: string
): Promise<SharedTemplate> {
  const res = await fetch(`/api/organization/${organizationId}/shared-templates/${templateId}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch shared template')
  }
  return res.json()
}

/**
 * Create a new shared template
 */
export async function createSharedTemplate({
  organizationId,
  data,
}: {
  organizationId: string
  data: CreateSharedTemplateInput
}): Promise<SharedTemplate> {
  const res = await fetch(`/api/organization/${organizationId}/shared-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create shared template')
  }
  return res.json()
}

/**
 * Update a shared template
 */
export async function updateSharedTemplate({
  organizationId,
  templateId,
  data,
}: {
  organizationId: string
  templateId: string
  data: UpdateSharedTemplateInput
}): Promise<SharedTemplate> {
  const res = await fetch(`/api/organization/${organizationId}/shared-templates/${templateId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update shared template')
  }
  return res.json()
}

/**
 * Delete a shared template
 */
export async function deleteSharedTemplate({
  organizationId,
  templateId,
}: {
  organizationId: string
  templateId: string
}): Promise<void> {
  const res = await fetch(`/api/organization/${organizationId}/shared-templates/${templateId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete shared template')
  }
}

/**
 * Save a shared template to favorites
 */
export async function saveTemplate({
  organizationId,
  templateId,
}: {
  organizationId: string
  templateId: string
}): Promise<void> {
  const res = await fetch(`/api/organization/${organizationId}/shared-templates/${templateId}/save`, {
    method: 'POST',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to save template')
  }
}

/**
 * Unsave a shared template from favorites
 */
export async function unsaveTemplate({
  organizationId,
  templateId,
}: {
  organizationId: string
  templateId: string
}): Promise<void> {
  const res = await fetch(`/api/organization/${organizationId}/shared-templates/${templateId}/save`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to unsave template')
  }
}

/**
 * Apply a shared template to a project (creates a project-specific template)
 */
export async function applyTemplateToProject({
  organizationId,
  templateId,
  projectId,
}: {
  organizationId: string
  templateId: string
  projectId: string
}): Promise<{ templateId: string }> {
  const res = await fetch(`/api/organization/${organizationId}/shared-templates/${templateId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to apply template to project')
  }
  return res.json()
}
