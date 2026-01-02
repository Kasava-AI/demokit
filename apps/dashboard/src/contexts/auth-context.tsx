'use client'

import { createContext, useContext } from 'react'

/**
 * Local user type for OSS single-user mode.
 * Mirrors the essential fields from Supabase User type.
 */
export interface LocalUser {
  id: string
  email: string
  user_metadata: {
    name?: string
    avatar_url?: string
  }
}

/**
 * Default local user for OSS mode.
 * In OSS, there is no authentication - just a single local user.
 */
const LOCAL_USER: LocalUser = {
  id: 'local-user',
  email: 'local@demokit.local',
  user_metadata: {
    name: 'Local User',
  },
}

type AuthContextType = {
  /** The current user - always the local user in OSS mode */
  user: LocalUser
  /** Loading state - always false in OSS mode */
  loading: boolean
  /** Sign out is a no-op in OSS mode */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth provider for OSS mode.
 * Always provides a local user without requiring authentication.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const signOut = async () => {
    // No-op in OSS mode - there's no authentication to sign out of
    console.log('[AuthContext] Sign out called - OSS mode, no-op')
  }

  return (
    <AuthContext.Provider value={{ user: LOCAL_USER, loading: false, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context.
 * In OSS mode, always returns the local user.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
