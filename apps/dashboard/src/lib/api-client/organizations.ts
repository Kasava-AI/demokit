import type { OrgMemberRole } from './members'

/**
 * Organization with user's role
 */
export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  ownerId: string
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
  role: OrgMemberRole
  joinedAt: string
}

/**
 * Create organization input
 */
export interface CreateOrganizationInput {
  name: string
  slug?: string
  description?: string | null
}

/**
 * Update organization input
 */
export interface UpdateOrganizationInput {
  name?: string
  description?: string | null
  settings?: Record<string, unknown>
}

/**
 * Fetch all organizations for the current user.
 */
export async function fetchOrganizations(): Promise<Organization[]> {
  const res = await fetch('/api/organization')
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch organizations')
  }
  return res.json()
}

/**
 * Create a new organization.
 */
export async function createOrganization(
  data: CreateOrganizationInput
): Promise<Organization> {
  const res = await fetch('/api/organization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create organization')
  }
  return res.json()
}

/**
 * Update an existing organization.
 */
export async function updateOrganization({
  id,
  data,
}: {
  id: string
  data: UpdateOrganizationInput
}): Promise<Organization> {
  const res = await fetch(`/api/organization/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update organization')
  }
  return res.json()
}

/**
 * Delete an organization.
 */
export async function deleteOrganization(id: string): Promise<void> {
  const res = await fetch(`/api/organization/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete organization')
  }
}
