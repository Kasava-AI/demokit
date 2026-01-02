/**
 * Session state management for DemoKit
 *
 * Provides in-memory storage for mutable state during a demo session.
 * State persists across requests but resets on page refresh.
 */

/**
 * Session state interface for storing and retrieving demo session data
 *
 * @example
 * ```typescript
 * // In a fixture handler
 * 'POST /api/users': ({ body, session }) => {
 *   const users = session.get<User[]>('users') || []
 *   const newUser = { id: crypto.randomUUID(), ...body }
 *   session.set('users', [...users, newUser])
 *   return newUser
 * }
 *
 * 'GET /api/users': ({ session }) => {
 *   return session.get<User[]>('users') || []
 * }
 * ```
 */
export interface SessionState {
  /**
   * Get a value from the session state
   * @param key - The key to retrieve
   * @returns The value if it exists, undefined otherwise
   */
  get<T>(key: string): T | undefined

  /**
   * Set a value in the session state
   * @param key - The key to set
   * @param value - The value to store
   */
  set<T>(key: string, value: T): void

  /**
   * Delete a value from the session state
   * @param key - The key to delete
   */
  delete(key: string): void

  /**
   * Clear all session state
   */
  clear(): void

  /**
   * Get all keys in the session state
   * @returns Array of all keys
   */
  keys(): string[]

  /**
   * Check if a key exists in the session state
   * @param key - The key to check
   * @returns True if the key exists
   */
  has(key: string): boolean

  /**
   * Get the number of items in the session state
   * @returns The number of items
   */
  size(): number
}

/**
 * Create a new session state instance
 *
 * Session state is purely in-memory and resets when the page is refreshed.
 * This is intentional - demo sessions should start fresh each time.
 *
 * @returns A new SessionState instance
 *
 * @example
 * ```typescript
 * const session = createSessionState()
 *
 * session.set('cart', [{ id: '1', quantity: 2 }])
 * const cart = session.get<CartItem[]>('cart')
 *
 * session.clear() // Reset all state
 * ```
 */
export function createSessionState(): SessionState {
  const store = new Map<string, unknown>()

  return {
    get<T>(key: string): T | undefined {
      return store.get(key) as T | undefined
    },

    set<T>(key: string, value: T): void {
      store.set(key, value)
    },

    delete(key: string): void {
      store.delete(key)
    },

    clear(): void {
      store.clear()
    },

    keys(): string[] {
      return Array.from(store.keys())
    },

    has(key: string): boolean {
      return store.has(key)
    },

    size(): number {
      return store.size
    },
  }
}
