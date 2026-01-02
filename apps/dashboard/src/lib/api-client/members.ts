/**
 * Organization member role type
 */
export type OrgMemberRole = 'owner' | 'admin' | 'member' | 'viewer'

/**
 * Organization member with user info
 */
export interface Member {
  id: string
  userId: string
  role: OrgMemberRole
  joinedAt: string
  user: {
    id: string
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
}

/**
 * Assignable roles (excludes owner which is only for the org creator)
 */
export type AssignableRole = 'admin' | 'member' | 'viewer'

/**
 * Invite member input
 */
export interface InviteMemberInput {
  email: string
  role?: AssignableRole
}

/**
 * Update member role input
 */
export interface UpdateMemberRoleInput {
  role: AssignableRole
}

/**
 * Invitation response (when user doesn't exist)
 */
export interface InvitationResponse {
  id: string
  email: string
  role: AssignableRole
  status: 'pending'
  expiresAt: string
  invited: true
}

/**
 * Response from invite member - can be either a new member or an invitation
 */
export type InviteMemberResponse = (Member & { invited: false }) | InvitationResponse

/**
 * Fetch all members of an organization.
 */
export async function fetchMembers(organizationId: string): Promise<Member[]> {
  const res = await fetch(`/api/organization/${organizationId}/members`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch members')
  }
  return res.json()
}

/**
 * Invite a new member to an organization.
 * If the user exists, they are added directly.
 * If not, an invitation email is sent.
 */
export async function inviteMember({
  organizationId,
  data,
}: {
  organizationId: string
  data: InviteMemberInput
}): Promise<InviteMemberResponse> {
  const res = await fetch(`/api/organization/${organizationId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || error.message || 'Failed to invite member')
  }
  return res.json()
}

/**
 * Update a member's role.
 */
export async function updateMemberRole({
  organizationId,
  userId,
  data,
}: {
  organizationId: string
  userId: string
  data: UpdateMemberRoleInput
}): Promise<Member> {
  const res = await fetch(
    `/api/organization/${organizationId}/members/${userId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update member role')
  }
  return res.json()
}

/**
 * Remove a member from an organization.
 */
export async function removeMember({
  organizationId,
  userId,
}: {
  organizationId: string
  userId: string
}): Promise<void> {
  const res = await fetch(
    `/api/organization/${organizationId}/members/${userId}`,
    {
      method: 'DELETE',
    }
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to remove member')
  }
}

/**
 * Pending invitation with inviter info
 */
export interface PendingInvitation {
  id: string
  email: string
  role: AssignableRole
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: string
  createdAt: string
  invitedBy: {
    id: string
    email: string
    fullName: string | null
  }
}

/**
 * Fetch all pending invitations for an organization.
 */
export async function fetchPendingInvitations(
  organizationId: string
): Promise<PendingInvitation[]> {
  const res = await fetch(`/api/organization/${organizationId}/invitations`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch invitations')
  }
  return res.json()
}

/**
 * Revoke a pending invitation.
 */
export async function revokeInvitation({
  organizationId,
  invitationId,
}: {
  organizationId: string
  invitationId: string
}): Promise<void> {
  const res = await fetch(
    `/api/organization/${organizationId}/invitations?invitationId=${invitationId}`,
    {
      method: 'DELETE',
    }
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to revoke invitation')
  }
}
