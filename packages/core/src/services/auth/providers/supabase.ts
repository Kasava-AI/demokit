import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js'
import type {
  AuthProvider,
  AuthUser,
  AuthSession,
  AuthResult,
  AuthStateChangeEvent,
  AuthStateChangeCallback,
  SignInOptions,
  SignUpOptions,
  OAuthProvider,
} from '../types'

/**
 * Configuration for the Supabase auth provider
 */
export interface SupabaseAuthConfig {
  /**
   * Supabase project URL
   */
  supabaseUrl: string

  /**
   * Supabase anonymous/public key
   */
  supabaseAnonKey: string

  /**
   * Optional: existing Supabase client instance
   * If provided, supabaseUrl and supabaseAnonKey are ignored
   */
  client?: SupabaseClient
}

/**
 * Map Supabase user to AuthUser
 */
function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    metadata: user.user_metadata,
  }
}

/**
 * Map Supabase session to AuthSession
 */
function mapSession(session: Session): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: mapUser(session.user),
  }
}

/**
 * Map Supabase auth event to AuthStateChangeEvent
 */
function mapEvent(event: string): AuthStateChangeEvent {
  const eventMap: Record<string, AuthStateChangeEvent> = {
    SIGNED_IN: 'SIGNED_IN',
    SIGNED_OUT: 'SIGNED_OUT',
    TOKEN_REFRESHED: 'TOKEN_REFRESHED',
    USER_UPDATED: 'USER_UPDATED',
    PASSWORD_RECOVERY: 'PASSWORD_RECOVERY',
    INITIAL_SESSION: 'INITIAL_SESSION',
  }
  return eventMap[event] ?? 'SIGNED_IN'
}

/**
 * Create an auth provider using Supabase Auth
 *
 * @example
 * const authProvider = createSupabaseAuthProvider({
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 * })
 *
 * // Use in AuthProvider
 * <AuthProvider provider={authProvider}>
 *   <App />
 * </AuthProvider>
 */
export function createSupabaseAuthProvider(config: SupabaseAuthConfig): AuthProvider {
  const supabase =
    config.client ?? createClient(config.supabaseUrl, config.supabaseAnonKey)

  return {
    async getSession(): Promise<AuthSession | null> {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        return null
      }

      return mapSession(session)
    },

    async getUser(): Promise<AuthUser | null> {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        return null
      }

      return mapUser(user)
    },

    async signIn({ email, password }: SignInOptions): Promise<AuthResult> {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return {
        user: data.user ? mapUser(data.user) : null,
        session: data.session ? mapSession(data.session) : null,
        error: error ? { code: error.name, message: error.message } : null,
      }
    },

    async signUp({ email, password, metadata }: SignUpOptions): Promise<AuthResult> {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      })

      return {
        user: data.user ? mapUser(data.user) : null,
        session: data.session ? mapSession(data.session) : null,
        error: error ? { code: error.name, message: error.message } : null,
      }
    },

    async signOut(): Promise<void> {
      await supabase.auth.signOut()
    },

    async signInWithOAuth(provider: OAuthProvider, redirectTo?: string): Promise<void> {
      await supabase.auth.signInWithOAuth({
        provider,
        options: redirectTo ? { redirectTo } : undefined,
      })
    },

    async resetPasswordForEmail(email: string, redirectTo?: string): Promise<void> {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
    },

    async updatePassword(newPassword: string): Promise<void> {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw new Error(error.message)
      }
    },

    onAuthStateChange(callback: AuthStateChangeCallback): () => void {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        callback(mapEvent(event), session ? mapSession(session) : null)
      })

      return () => subscription.unsubscribe()
    },
  }
}
