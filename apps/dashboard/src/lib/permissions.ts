/**
 * Permission System for DemoKit OSS
 *
 * Defines role-based access control (RBAC) for organizations and projects.
 * In OSS mode, this provides a foundation for future multi-user support.
 */

import type { OrgMemberRole } from '@/lib/api-client/members'

// Organization-level permissions
export type OrgPermission =
  | 'org:view'
  | 'org:update'
  | 'org:delete'
  | 'org:members:view'
  | 'org:members:invite'
  | 'org:members:remove'
  | 'org:members:role'
  | 'org:billing:view'
  | 'org:billing:manage'
  | 'org:api-keys:view'
  | 'org:api-keys:create'
  | 'org:api-keys:delete'

// Project-level permissions
export type ProjectPermission =
  | 'project:view'
  | 'project:create'
  | 'project:update'
  | 'project:delete'
  | 'project:fixtures:view'
  | 'project:fixtures:create'
  | 'project:fixtures:update'
  | 'project:fixtures:delete'
  | 'project:templates:view'
  | 'project:templates:create'
  | 'project:templates:update'
  | 'project:templates:delete'
  | 'project:schema:view'
  | 'project:schema:update'
  | 'project:sources:view'
  | 'project:sources:create'
  | 'project:sources:update'
  | 'project:sources:delete'

// Combined permission type
export type Permission = OrgPermission | ProjectPermission

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY: OrgMemberRole[] = ['viewer', 'member', 'admin', 'owner']

// Permission mapping by role
const ROLE_PERMISSIONS: Record<OrgMemberRole, Permission[]> = {
  viewer: [
    'org:view',
    'project:view',
    'project:fixtures:view',
    'project:templates:view',
    'project:schema:view',
    'project:sources:view',
  ],
  member: [
    // Inherits viewer permissions plus:
    'org:view',
    'project:view',
    'project:create',
    'project:update',
    'project:fixtures:view',
    'project:fixtures:create',
    'project:fixtures:update',
    'project:templates:view',
    'project:templates:create',
    'project:templates:update',
    'project:schema:view',
    'project:schema:update',
    'project:sources:view',
    'project:sources:create',
    'project:sources:update',
  ],
  admin: [
    // Inherits member permissions plus:
    'org:view',
    'org:update',
    'org:members:view',
    'org:members:invite',
    'org:members:remove',
    'org:members:role',
    'org:billing:view',
    'org:api-keys:view',
    'org:api-keys:create',
    'org:api-keys:delete',
    'project:view',
    'project:create',
    'project:update',
    'project:delete',
    'project:fixtures:view',
    'project:fixtures:create',
    'project:fixtures:update',
    'project:fixtures:delete',
    'project:templates:view',
    'project:templates:create',
    'project:templates:update',
    'project:templates:delete',
    'project:schema:view',
    'project:schema:update',
    'project:sources:view',
    'project:sources:create',
    'project:sources:update',
    'project:sources:delete',
  ],
  owner: [
    // Full permissions
    'org:view',
    'org:update',
    'org:delete',
    'org:members:view',
    'org:members:invite',
    'org:members:remove',
    'org:members:role',
    'org:billing:view',
    'org:billing:manage',
    'org:api-keys:view',
    'org:api-keys:create',
    'org:api-keys:delete',
    'project:view',
    'project:create',
    'project:update',
    'project:delete',
    'project:fixtures:view',
    'project:fixtures:create',
    'project:fixtures:update',
    'project:fixtures:delete',
    'project:templates:view',
    'project:templates:create',
    'project:templates:update',
    'project:templates:delete',
    'project:schema:view',
    'project:schema:update',
    'project:sources:view',
    'project:sources:create',
    'project:sources:update',
    'project:sources:delete',
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrgMemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: OrgMemberRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: OrgMemberRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: OrgMemberRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Check if a role is at least as privileged as the target role
 */
export function isRoleAtLeast(role: OrgMemberRole, targetRole: OrgMemberRole): boolean {
  const roleIndex = ROLE_HIERARCHY.indexOf(role)
  const targetIndex = ROLE_HIERARCHY.indexOf(targetRole)
  return roleIndex >= targetIndex
}

/**
 * Check if a user with the given role can manage (change role of) a member with the target role
 * Owners can manage anyone. Admins can manage members and viewers.
 */
export function canManageRole(userRole: OrgMemberRole, targetRole: OrgMemberRole): boolean {
  if (userRole === 'owner') return true
  if (userRole === 'admin') {
    return targetRole === 'member' || targetRole === 'viewer'
  }
  return false
}

/**
 * Check if a user with the given role can remove a member with the target role
 * Same rules as canManageRole, but also allows self-removal (handled separately)
 */
export function canRemoveMember(userRole: OrgMemberRole, targetRole: OrgMemberRole): boolean {
  return canManageRole(userRole, targetRole)
}

/**
 * Get the role hierarchy index (higher = more privileged)
 */
export function getRoleLevel(role: OrgMemberRole): number {
  return ROLE_HIERARCHY.indexOf(role)
}

/**
 * Get all roles that a user with the given role can assign to others
 */
export function getAssignableRoles(userRole: OrgMemberRole): OrgMemberRole[] {
  if (userRole === 'owner') {
    return ['viewer', 'member', 'admin', 'owner']
  }
  if (userRole === 'admin') {
    return ['viewer', 'member']
  }
  return []
}
