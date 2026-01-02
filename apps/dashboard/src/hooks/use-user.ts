import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'

/**
 * Generation level type (local definition to avoid circular imports)
 * This matches the GenerationLevel exported from use-fixtures.ts
 */
type GenerationLevel = 'schema-valid' | 'relationship-valid' | 'narrative-driven'

/**
 * User preferences schema
 */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  defaultExportFormat?: 'json' | 'sql' | 'csv' | 'typescript'
  notifications?: {
    email?: boolean
    generationComplete?: boolean
  }
  /** AI-powered (L3) generation settings */
  aiGeneration?: {
    /** Whether AI generation is enabled for this user */
    enabled?: boolean
    /** Default generation level when creating fixtures */
    defaultLevel?: GenerationLevel
  }
}

/**
 * User profile from database
 */
export interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

/**
 * Update user input
 */
export interface UpdateUserInput {
  fullName?: string
  avatarUrl?: string | null
  preferences?: Partial<UserPreferences>
}

async function fetchUser(): Promise<User> {
  const res = await fetch('/api/user')
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch user')
  }
  return res.json()
}

async function updateUser(data: UpdateUserInput): Promise<User> {
  const res = await fetch('/api/user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update user')
  }
  return res.json()
}

async function deleteUser(): Promise<void> {
  const res = await fetch('/api/user', { method: 'DELETE' })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete account')
  }
}

/**
 * Hook to fetch the current user's profile from the database.
 */
export function useUser(
  options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to update the current user's profile.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data)
    },
  })
}

/**
 * Hook to update only the user's preferences.
 * Convenience wrapper around useUpdateUser.
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (preferences: Partial<UserPreferences>) =>
      updateUser({ preferences }),
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data)
    },
  })
}

/**
 * Hook to delete the current user's account.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
