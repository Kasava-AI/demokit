'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type {
  AuthProvider as IAuthProvider,
  AuthUser,
  AuthSession,
  AuthResult,
  OAuthProvider,
} from './types'

/**
 * Context value provided by AuthProvider
 */
export interface AuthContextValue {
  /**
   * The current authenticated user, or null if not authenticated
   */
  user: AuthUser | null

  /**
   * The current session, or null if not authenticated
   */
  session: AuthSession | null

  /**
   * Whether the auth state is still loading
   */
  isLoading: boolean

  /**
   * Whether the user is authenticated
   */
  isAuthenticated: boolean

  /**
   * Sign in with email and password
   */
  signIn: (email: string, password: string) => Promise<AuthResult>

  /**
   * Sign up with email and password
   */
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<AuthResult>

  /**
   * Sign out the current user
   */
  signOut: () => Promise<void>

  /**
   * Sign in with an OAuth provider
   */
  signInWithOAuth: (provider: OAuthProvider, redirectTo?: string) => Promise<void>

  /**
   * Send a password reset email
   */
  resetPasswordForEmail: (email: string, redirectTo?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

AuthContext.displayName = 'AuthContext'

/**
 * Props for the AuthProvider component
 */
export interface AuthProviderProps {
  /**
   * Child components to render
   */
  children: ReactNode

  /**
   * The auth provider implementation to use
   */
  provider: IAuthProvider
}

/**
 * Provider component that manages authentication state
 *
 * @example
 * import { AuthProvider, createSupabaseAuthProvider } from '@demokit-ai/auth'
 *
 * const authProvider = createSupabaseAuthProvider({
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 * })
 *
 * function App() {
 *   return (
 *     <AuthProvider provider={authProvider}>
 *       <YourApp />
 *     </AuthProvider>
 *   )
 * }
 */
export function AuthProvider({ children, provider }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    console.log('[AuthProvider] Initializing auth state...')

    // Get initial session
    provider
      .getSession()
      .then((session) => {
        console.log('[AuthProvider] Got session:', {
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
        })
        setSession(session)
        setUser(session?.user ?? null)
      })
      .catch((error) => {
        console.error('[AuthProvider] Error getting session:', error)
      })
      .finally(() => {
        console.log('[AuthProvider] Setting isLoading to false')
        setIsLoading(false)
      })

    // Subscribe to auth state changes
    const unsubscribe = provider.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] Auth state changed:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      })
      setSession(session)
      setUser(session?.user ?? null)
    })

    return unsubscribe
  }, [provider])

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      return provider.signIn({ email, password })
    },
    [provider]
  )

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata?: Record<string, unknown>
    ): Promise<AuthResult> => {
      return provider.signUp({ email, password, metadata })
    },
    [provider]
  )

  const signOut = useCallback(async (): Promise<void> => {
    return provider.signOut()
  }, [provider])

  const signInWithOAuth = useCallback(
    async (providerName: OAuthProvider, redirectTo?: string): Promise<void> => {
      return provider.signInWithOAuth(providerName, redirectTo)
    },
    [provider]
  )

  const resetPasswordForEmail = useCallback(
    async (email: string, redirectTo?: string): Promise<void> => {
      return provider.resetPasswordForEmail(email, redirectTo)
    },
    [provider]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
      signInWithOAuth,
      resetPasswordForEmail,
    }),
    [user, session, isLoading, signIn, signUp, signOut, signInWithOAuth, resetPasswordForEmail]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access authentication state and methods
 *
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * function LoginButton() {
 *   const { user, signIn, signOut, isLoading } = useAuth()
 *
 *   if (isLoading) return <Loading />
 *
 *   if (user) {
 *     return <button onClick={signOut}>Sign Out</button>
 *   }
 *
 *   return <button onClick={() => signIn('user@example.com', 'password')}>Sign In</button>
 * }
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

/**
 * Hook to get the current user
 * Shorthand for useAuth().user
 */
export function useUser(): AuthUser | null {
  return useAuth().user
}

/**
 * Hook to get the current session
 * Shorthand for useAuth().session
 */
export function useSession(): AuthSession | null {
  return useAuth().session
}

/**
 * Hook to check if user is authenticated
 * Shorthand for useAuth().isAuthenticated
 */
export function useIsAuthenticated(): boolean {
  return useAuth().isAuthenticated
}
