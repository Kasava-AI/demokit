import { useMemo } from 'react'
import { useCurrentOrganization } from '@/contexts/organization-context'
import type { OrgMemberRole } from '@/lib/api-client/members'
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  isRoleAtLeast,
  canManageRole,
  canRemoveMember,
  type Permission,
  type OrgPermission,
  type ProjectPermission,
} from '@/lib/permissions'

/**
 * Hook to check user's permissions in the current organization
 */
export function usePermissions() {
  const { currentOrg } = useCurrentOrganization()
  const role = currentOrg?.role ?? 'viewer'

  return useMemo(
    () => ({
      /**
       * Current user's role in the organization
       */
      role,

      /**
       * Check if user has a specific permission
       */
      can: (permission: Permission) => hasPermission(role, permission),

      /**
       * Check if user has all of the specified permissions
       */
      canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),

      /**
       * Check if user has any of the specified permissions
       */
      canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),

      /**
       * Get all permissions for the current role
       */
      permissions: getPermissions(role),

      /**
       * Check if user's role is at least the specified role
       */
      isAtLeast: (targetRole: OrgMemberRole) => isRoleAtLeast(role, targetRole),

      /**
       * Check if user can manage (change role of) a member with the target role
       */
      canManage: (targetRole: OrgMemberRole) => canManageRole(role, targetRole),

      /**
       * Check if user can remove a member with the target role
       */
      canRemove: (targetRole: OrgMemberRole) => canRemoveMember(role, targetRole),

      // Convenience permission checks
      isOwner: role === 'owner',
      isAdmin: role === 'admin' || role === 'owner',
      isMember: role === 'member' || role === 'admin' || role === 'owner',
      isViewer: role === 'viewer',

      // Common permission shortcuts
      canViewOrg: hasPermission(role, 'org:view'),
      canUpdateOrg: hasPermission(role, 'org:update'),
      canDeleteOrg: hasPermission(role, 'org:delete'),
      canInviteMembers: hasPermission(role, 'org:members:invite'),
      canRemoveMembers: hasPermission(role, 'org:members:remove'),
      canChangeRoles: hasPermission(role, 'org:members:role'),
      canViewBilling: hasPermission(role, 'org:billing:view'),
      canManageBilling: hasPermission(role, 'org:billing:manage'),

      canViewProjects: hasPermission(role, 'project:view'),
      canCreateProjects: hasPermission(role, 'project:create'),
      canUpdateProjects: hasPermission(role, 'project:update'),
      canDeleteProjects: hasPermission(role, 'project:delete'),

      canViewFixtures: hasPermission(role, 'project:fixtures:view'),
      canCreateFixtures: hasPermission(role, 'project:fixtures:create'),
      canUpdateFixtures: hasPermission(role, 'project:fixtures:update'),
      canDeleteFixtures: hasPermission(role, 'project:fixtures:delete'),

      canViewTemplates: hasPermission(role, 'project:templates:view'),
      canCreateTemplates: hasPermission(role, 'project:templates:create'),
      canUpdateTemplates: hasPermission(role, 'project:templates:update'),
      canDeleteTemplates: hasPermission(role, 'project:templates:delete'),
    }),
    [role]
  )
}

/**
 * Hook to require a specific permission, redirecting if not met
 * @param permission - The permission to check
 * @returns Object with loading state and whether permission is granted
 */
export function useRequirePermission(permission: Permission) {
  const { currentOrg, isLoading } = useCurrentOrganization()
  const { can } = usePermissions()

  return {
    isLoading,
    hasPermission: !isLoading && !!currentOrg && can(permission),
    role: currentOrg?.role,
  }
}

// Re-export types for convenience
export type { Permission, OrgPermission, ProjectPermission }
