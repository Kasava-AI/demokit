'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient, isAuthEnabled } from '@/lib/supabase/client'

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
 * Default local user for OSS mode when auth is disabled.
 */
const LOCAL_USER: LocalUser = {
  id: 'local-user',
  email: 'local@demokit.local',
  user_metadata: {
    name: 'Local User',
  },
}

type AuthContextType = {
  /** The current user - Supabase user when auth is enabled, local user otherwise */
  user: User | LocalUser | null
  /** Loading state */
  loading: boolean
  /** Whether authentication is enabled */
  authEnabled: boolean
  /** Sign in with GitHub OAuth */
  signInWithGitHub: () => Promise<void>
  /** Sign in with Google OAuth */
  signInWithGoogle: () => Promise<void>
  /** Sign in with email and password */
  signInWithEmail: (email: string, password: string) => Promise<void>
  /** Sign in with magic link */
  signInWithMagicLink: (email: string) => Promise<void>
  /** Sign up with email and password */
  signUpWithEmail: (email: string, password: string) => Promise<void>
  /** Reset password */
  resetPassword: (email: string) => Promise<void>
  /** Sign out */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth provider that supports both Supabase auth (when enabled) and local mode.
 * Set NEXT_PUBLIC_USE_AUTH=false to disable authentication and use local mode.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | LocalUser | null>(null)
  const [loading, setLoading] = useState(true)
  const authEnabled = isAuthEnabled()
  const supabase = authEnabled ? createClient() : null

  useEffect(() => {
    // If auth is disabled, use local user immediately
    if (!authEnabled || !supabase) {
      console.log('[AuthContext] Auth disabled, using local user')
      setUser(LOCAL_USER)
      setLoading(false)
      return
    }

    // Initial user fetch using getUser() for security
    const fetchUser = async () => {
      try {
        console.log('[AuthContext] Fetching user...')
        // Add timeout to prevent hanging in edge cases (e.g., new tabs, network issues)
        const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Auth fetch timeout')), 5000)
        )

        const result = await Promise.race([
          supabase.auth.getUser(),
          timeoutPromise,
        ])
        console.log('[AuthContext] Got user:', {
          hasUser: !!result.data.user,
          userId: result.data.user?.id,
        })
        setUser(result.data.user)
      } catch (error) {
        console.warn('[AuthContext] Failed to fetch user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      })

      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }

      // Only set loading false after initial session is handled
      if (event !== 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authEnabled])

  const signInWithGitHub = async () => {
    if (!supabase) {
      console.log('[AuthContext] Auth disabled, ignoring signInWithGitHub')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    if (!supabase) {
      console.log('[AuthContext] Auth disabled, ignoring signInWithGoogle')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      console.log('[AuthContext] Auth disabled, ignoring signInWithEmail')
      return
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      console.log('[AuthContext] Auth disabled, ignoring signUpWithEmail')
      return
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signInWithMagicLink = async (email: string) => {
    if (!supabase) {
      console.log('[AuthContext] Auth disabled, ignoring signInWithMagicLink')
      return
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    if (!supabase) {
      console.log('[AuthContext] Auth disabled, ignoring resetPassword')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) {
      console.log('[AuthContext] Auth disabled, ignoring signOut')
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[AuthContext] Sign out error:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authEnabled,
        signInWithGitHub,
        signInWithGoogle,
        signInWithEmail,
        signInWithMagicLink,
        signUpWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
