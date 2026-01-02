import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  fetchMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  fetchPendingInvitations,
  revokeInvitation,
  type Member,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type InviteMemberResponse,
  type InvitationResponse,
  type PendingInvitation,
} from '@/lib/api-client/members'

// Re-export types for convenience
export type { Member, InviteMemberInput, UpdateMemberRoleInput, InviteMemberResponse, InvitationResponse, PendingInvitation }

/**
 * Hook to fetch members of an organization.
 */
export function useMembers(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<Member[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: () => fetchMembers(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to invite a member to an organization.
 * Returns the result which can be either a new member or an invitation.
 */
export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: inviteMember,
    onSuccess: (result, { organizationId }) => {
      // Only add to cache if it's a direct member add (not an invitation)
      if (!result.invited) {
        queryClient.setQueryData<Member[]>(
          ['organization-members', organizationId],
          (old) => {
            if (!old) return [result]
            return [...old, result]
          }
        )
        // Invalidate to ensure sync
        queryClient.invalidateQueries({
          queryKey: ['organization-members', organizationId],
        })
      }
      // For invitations, we don't need to update the cache
      // The member will appear after they accept the invitation
    },
  })
}

/**
 * Hook to update a member's role.
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMemberRole,
    onSuccess: (updatedMember, { organizationId }) => {
      // Update the member in the cache
      queryClient.setQueryData<Member[]>(
        ['organization-members', organizationId],
        (old) => {
          if (!old) return [updatedMember]
          return old.map((m) =>
            m.userId === updatedMember.userId ? updatedMember : m
          )
        }
      )
    },
  })
}

/**
 * Hook to remove a member from an organization.
 */
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeMember,
    onSuccess: (_, { organizationId, userId }) => {
      // Remove the member from the cache
      queryClient.setQueryData<Member[]>(
        ['organization-members', organizationId],
        (old) => {
          if (!old) return []
          return old.filter((m) => m.userId !== userId)
        }
      )
    },
  })
}

/**
 * Hook to fetch pending invitations for an organization.
 */
export function usePendingInvitations(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<PendingInvitation[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['organization-invitations', organizationId],
    queryFn: () => fetchPendingInvitations(organizationId!),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

/**
 * Hook to revoke a pending invitation.
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeInvitation,
    onSuccess: (_, { organizationId, invitationId }) => {
      // Remove the invitation from the cache
      queryClient.setQueryData<PendingInvitation[]>(
        ['organization-invitations', organizationId],
        (old) => {
          if (!old) return []
          return old.filter((inv) => inv.id !== invitationId)
        }
      )
    },
  })
}
