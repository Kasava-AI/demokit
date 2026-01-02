/**
 * Represents an authenticated user
 */
export interface AuthUser {
  /**
   * Unique identifier for the user
   */
  id: string

  /**
   * User's email address
   */
  email: string | null

  /**
   * User's display name
   */
  name?: string | null

  /**
   * URL to user's avatar image
   */
  avatarUrl?: string | null

  /**
   * Additional user metadata
   */
  metadata?: Record<string, unknown>
}

/**
 * Represents an authenticated session
 */
export interface AuthSession {
  /**
   * Access token for API requests
   */
  accessToken: string

  /**
   * Refresh token for obtaining new access tokens
   */
  refreshToken?: string

  /**
   * Unix timestamp when the access token expires
   */
  expiresAt?: number

  /**
   * The authenticated user
   */
  user: AuthUser
}

/**
 * Supported OAuth providers
 */
export type OAuthProvider = 'github' | 'google' | 'gitlab'

/**
 * Options for email/password sign in
 */
export interface SignInOptions {
  email: string
  password: string
}

/**
 * Options for email/password sign up
 */
export interface SignUpOptions {
  email: string
  password: string
  metadata?: Record<string, unknown>
}

/**
 * Result of an authentication operation
 */
export interface AuthResult {
  /**
   * The authenticated user, if successful
   */
  user: AuthUser | null

  /**
   * The session, if successful
   */
  session: AuthSession | null

  /**
   * Error details, if the operation failed
   */
  error: AuthError | null
}

/**
 * Authentication error details
 */
export interface AuthError {
  /**
   * Error code for programmatic handling
   */
  code: string

  /**
   * Human-readable error message
   */
  message: string
}

/**
 * Events emitted by the auth state change listener
 */
export type AuthStateChangeEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'INITIAL_SESSION'

/**
 * Callback for auth state changes
 */
export type AuthStateChangeCallback = (
  event: AuthStateChangeEvent,
  session: AuthSession | null
) => void

/**
 * Abstract authentication provider interface
 *
 * Implement this interface to add support for different auth providers.
 * The default implementation uses Supabase Auth.
 */
export interface AuthProvider {
  /**
   * Get the current session, if any
   */
  getSession(): Promise<AuthSession | null>

  /**
   * Get the current user, if authenticated
   */
  getUser(): Promise<AuthUser | null>

  /**
   * Sign in with email and password
   */
  signIn(options: SignInOptions): Promise<AuthResult>

  /**
   * Sign up with email and password
   */
  signUp(options: SignUpOptions): Promise<AuthResult>

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>

  /**
   * Sign in with an OAuth provider
   * This will redirect to the provider's login page
   */
  signInWithOAuth(provider: OAuthProvider, redirectTo?: string): Promise<void>

  /**
   * Send a password reset email
   */
  resetPasswordForEmail(email: string, redirectTo?: string): Promise<void>

  /**
   * Update the current user's password
   */
  updatePassword(newPassword: string): Promise<void>

  /**
   * Subscribe to auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void
}
