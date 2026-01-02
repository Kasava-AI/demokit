/**
 * Permission checks for API routes - OSS Mode
 *
 * In OSS mode, there is no authentication or multi-user support.
 * The single local user has full "owner" permissions to everything.
 */

import { getDb } from './db'
import { projects } from '@db'
import { eq } from 'drizzle-orm'
import type { OrgPermission, ProjectPermission } from '@/lib/permissions'

type OrgMemberRole = 'owner' | 'admin' | 'member' | 'viewer'

/**
 * Local user ID for OSS mode
 */
const LOCAL_USER_ID = 'local-user'

/**
 * Local organization ID for OSS mode
 */
const LOCAL_ORG_ID = 'local-org'

interface MembershipInfo {
  userId: string
  organizationId: string
  role: OrgMemberRole
}

interface ProjectAccessResult {
  project: typeof projects.$inferSelect | null
  membership: MembershipInfo | null
  error: 'not_found' | 'forbidden' | null
}

/**
 * Get organization membership for a user.
 * In OSS mode, always returns owner membership for the local user.
 */
export async function getOrganizationMembership(
  _organizationId: string,
  _userId: string
): Promise<MembershipInfo | null> {
  // In OSS mode, the local user is always an owner
  return {
    userId: LOCAL_USER_ID,
    organizationId: LOCAL_ORG_ID,
    role: 'owner',
  }
}

/**
 * Verify user has access to a project.
 * In OSS mode, the local user has access to all projects.
 */
export async function verifyProjectAccess(
  projectId: string,
  _userId: string
): Promise<ProjectAccessResult> {
  const db = getDb()

  // Get the project
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })

  if (!project) {
    return { project: null, membership: null, error: 'not_found' }
  }

  // In OSS mode, local user has owner access to all projects
  return {
    project,
    membership: {
      userId: LOCAL_USER_ID,
      organizationId: project.organizationId || LOCAL_ORG_ID,
      role: 'owner',
    },
    error: null,
  }
}

/**
 * Check if a user has a specific permission in an organization.
 * In OSS mode, always returns true (local user has all permissions).
 */
export async function checkOrgPermission(
  _organizationId: string,
  _userId: string,
  _permission: OrgPermission
): Promise<boolean> {
  // In OSS mode, local user has all permissions
  return true
}

/**
 * Check if a user has a specific permission for a project.
 * In OSS mode, always returns true for existing projects.
 */
export async function checkProjectPermission(
  projectId: string,
  _userId: string,
  _permission: ProjectPermission
): Promise<{ hasPermission: boolean; project: typeof projects.$inferSelect | null }> {
  const db = getDb()

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })

  // In OSS mode, local user has all permissions for existing projects
  return {
    hasPermission: project !== null,
    project: project ?? null,
  }
}

/**
 * Verify user has a specific permission for a project.
 * In OSS mode, returns success for all existing projects.
 */
export async function requireProjectPermission(
  projectId: string,
  _userId: string,
  _permission: ProjectPermission
): Promise<{
  project: typeof projects.$inferSelect
  membership: MembershipInfo
} | {
  error: 'not_found' | 'forbidden' | 'permission_denied'
  message: string
}> {
  const db = getDb()

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })

  if (!project) {
    return { error: 'not_found', message: 'Project not found' }
  }

  // In OSS mode, local user has owner access
  return {
    project,
    membership: {
      userId: LOCAL_USER_ID,
      organizationId: project.organizationId || LOCAL_ORG_ID,
      role: 'owner',
    },
  }
}

/**
 * Verify user has a specific permission in an organization.
 * In OSS mode, always returns success.
 */
export async function requireOrgPermission(
  _organizationId: string,
  _userId: string,
  _permission: OrgPermission
): Promise<{
  membership: MembershipInfo
} | {
  error: 'not_found' | 'permission_denied'
  message: string
}> {
  // In OSS mode, local user has owner access
  return {
    membership: {
      userId: LOCAL_USER_ID,
      organizationId: LOCAL_ORG_ID,
      role: 'owner',
    },
  }
}

/**
 * Helper to determine the appropriate HTTP error response for a permission check result
 */
export function getPermissionErrorStatus(error: 'not_found' | 'forbidden' | 'permission_denied'): number {
  switch (error) {
    case 'not_found':
      return 404
    case 'forbidden':
    case 'permission_denied':
      return 403
  }
}
