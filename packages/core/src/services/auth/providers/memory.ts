import type {
  AuthProvider,
  AuthUser,
  AuthSession,
  AuthResult,
  AuthStateChangeCallback,
  SignInOptions,
  SignUpOptions,
  OAuthProvider,
} from '../types'

/**
 * Configuration for the memory auth provider
 */
export interface MemoryAuthConfig {
  /**
   * Pre-populated users for testing
   */
  users?: Map<string, { password: string; user: AuthUser }>

  /**
   * Initial session (for testing authenticated state)
   */
  initialSession?: AuthSession | null

  /**
   * Delay in ms to simulate network latency
   * @default 0
   */
  delay?: number
}

/**
 * Create an in-memory auth provider for testing
 *
 * This provider stores all data in memory and resets on page refresh.
 * Useful for unit tests and local development without a real auth backend.
 *
 * @example
 * const authProvider = createMemoryAuthProvider({
 *   users: new Map([
 *     ['test@example.com', {
 *       password: 'password123',
 *       user: { id: '1', email: 'test@example.com', name: 'Test User' }
 *     }]
 *   ])
 * })
 */
export function createMemoryAuthProvider(config: MemoryAuthConfig = {}): AuthProvider {
  const { users = new Map(), initialSession = null, delay = 0 } = config

  let currentSession: AuthSession | null = initialSession
  const listeners = new Set<AuthStateChangeCallback>()

  async function simulateDelay(): Promise<void> {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  function notifyListeners(
    event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED',
    session: AuthSession | null
  ): void {
    listeners.forEach((callback) => callback(event, session))
  }

  function generateToken(): string {
    return `mem_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  }

  return {
    async getSession(): Promise<AuthSession | null> {
      await simulateDelay()
      return currentSession
    },

    async getUser(): Promise<AuthUser | null> {
      await simulateDelay()
      return currentSession?.user ?? null
    },

    async signIn({ email, password }: SignInOptions): Promise<AuthResult> {
      await simulateDelay()

      const userData = users.get(email)

      if (!userData) {
        return {
          user: null,
          session: null,
          error: { code: 'user_not_found', message: 'User not found' },
        }
      }

      if (userData.password !== password) {
        return {
          user: null,
          session: null,
          error: { code: 'invalid_credentials', message: 'Invalid password' },
        }
      }

      const session: AuthSession = {
        accessToken: generateToken(),
        refreshToken: generateToken(),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        user: userData.user,
      }

      currentSession = session
      notifyListeners('SIGNED_IN', session)

      return { user: userData.user, session, error: null }
    },

    async signUp({ email, password, metadata }: SignUpOptions): Promise<AuthResult> {
      await simulateDelay()

      if (users.has(email)) {
        return {
          user: null,
          session: null,
          error: { code: 'user_exists', message: 'User already exists' },
        }
      }

      const newUser: AuthUser = {
        id: `user_${Date.now()}`,
        email,
        name: metadata?.name as string | undefined,
        avatarUrl: null,
        metadata,
      }

      users.set(email, { password, user: newUser })

      const session: AuthSession = {
        accessToken: generateToken(),
        refreshToken: generateToken(),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        user: newUser,
      }

      currentSession = session
      notifyListeners('SIGNED_IN', session)

      return { user: newUser, session, error: null }
    },

    async signOut(): Promise<void> {
      await simulateDelay()
      currentSession = null
      notifyListeners('SIGNED_OUT', null)
    },

    async signInWithOAuth(_provider: OAuthProvider, _redirectTo?: string): Promise<void> {
      await simulateDelay()
      // In memory provider, OAuth is simulated by creating a mock user
      const mockUser: AuthUser = {
        id: `oauth_${Date.now()}`,
        email: 'oauth@example.com',
        name: 'OAuth User',
        avatarUrl: null,
        metadata: { provider: _provider },
      }

      const session: AuthSession = {
        accessToken: generateToken(),
        refreshToken: generateToken(),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        user: mockUser,
      }

      currentSession = session
      notifyListeners('SIGNED_IN', session)
    },

    async resetPasswordForEmail(_email: string, _redirectTo?: string): Promise<void> {
      await simulateDelay()
      // No-op in memory provider
    },

    async updatePassword(newPassword: string): Promise<void> {
      await simulateDelay()

      if (!currentSession) {
        throw new Error('Not authenticated')
      }

      const email = currentSession.user.email
      if (!email) {
        throw new Error('User has no email')
      }

      const userData = users.get(email)
      if (userData) {
        users.set(email, { ...userData, password: newPassword })
      }
    },

    onAuthStateChange(callback: AuthStateChangeCallback): () => void {
      listeners.add(callback)

      // Emit initial session event
      if (currentSession) {
        callback('INITIAL_SESSION', currentSession)
      }

      return () => {
        listeners.delete(callback)
      }
    },
  }
}
