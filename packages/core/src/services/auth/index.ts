/**
 * @demokit-ai/auth
 *
 * Authentication abstraction for DemoKit.
 * Provides a clean interface for auth with Supabase as the default provider.
 *
 * @example
 * import {
 *   AuthProvider,
 *   useAuth,
 *   createSupabaseAuthProvider
 * } from '@demokit-ai/auth'
 *
 * // Create provider
 * const authProvider = createSupabaseAuthProvider({
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 * })
 *
 * // Use in app
 * function App() {
 *   return (
 *     <AuthProvider provider={authProvider}>
 *       <YourApp />
 *     </AuthProvider>
 *   )
 * }
 *
 * // In components
 * function Profile() {
 *   const { user, signOut, isLoading } = useAuth()
 *
 *   if (isLoading) return <Loading />
 *   if (!user) return <Login />
 *
 *   return <div>Welcome, {user.name}!</div>
 * }
 *
 * @packageDocumentation
 */

// React components and hooks
export {
  AuthProvider,
  useAuth,
  useUser,
  useSession,
  useIsAuthenticated,
  type AuthProviderProps,
  type AuthContextValue,
} from './react'

// Providers
export {
  createSupabaseAuthProvider,
  type SupabaseAuthConfig,
} from './providers/supabase'

export {
  createMemoryAuthProvider,
  type MemoryAuthConfig,
} from './providers/memory'

// Types
export type {
  AuthProvider as IAuthProvider,
  AuthUser,
  AuthSession,
  AuthResult,
  AuthError,
  AuthStateChangeEvent,
  AuthStateChangeCallback,
  SignInOptions,
  SignUpOptions,
  OAuthProvider,
} from './types'
