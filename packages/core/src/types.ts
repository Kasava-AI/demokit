import type { SessionState } from './session'

/**
 * Configuration for creating a demo interceptor
 */
export interface DemoKitConfig {
  /**
   * Map of URL patterns to fixture handlers
   * Patterns support :param syntax for URL parameters and * for wildcards
   * @example
   * {
   *   'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
   *   'GET /api/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
   *   'POST /api/users': ({ body }) => ({ id: 'new', ...body }),
   * }
   */
  fixtures: FixtureMap

  /**
   * localStorage key for persisting demo mode state
   * @default 'demokit-mode'
   */
  storageKey?: string

  /**
   * Callback invoked when demo mode is enabled
   */
  onEnable?: () => void

  /**
   * Callback invoked when demo mode is disabled
   */
  onDisable?: () => void

  /**
   * Whether to start with demo mode enabled
   * If not provided, will read from localStorage
   * @default false
   */
  initialEnabled?: boolean

  /**
   * Base URL to use for relative URL parsing
   * @default 'http://localhost'
   */
  baseUrl?: string
}

/**
 * Map of URL patterns to fixture handlers
 * Pattern format: "METHOD /path/:param"
 */
export type FixtureMap = Record<string, FixtureHandler>

/**
 * A fixture handler can be:
 * - A static value (object, array, primitive)
 * - A function that receives request context and returns a value
 * - An async function for dynamic fixtures
 */
export type FixtureHandler =
  | unknown
  | ((context: RequestContext) => unknown)
  | ((context: RequestContext) => Promise<unknown>)

/**
 * Context provided to fixture handler functions
 */
export interface RequestContext {
  /**
   * The full URL of the request
   */
  url: string

  /**
   * HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
   */
  method: string

  /**
   * URL parameters extracted from the pattern
   * @example For pattern 'GET /api/users/:id' and URL '/api/users/123',
   * params would be { id: '123' }
   */
  params: Record<string, string>

  /**
   * Query string parameters
   */
  searchParams: URLSearchParams

  /**
   * Parsed request body (for POST, PUT, PATCH requests)
   */
  body?: unknown

  /**
   * Request headers
   */
  headers: Headers

  /**
   * Session state for storing mutable data across requests
   * Resets when the page is refreshed
   *
   * @example
   * ```typescript
   * // Store data in a POST handler
   * 'POST /api/users': ({ body, session }) => {
   *   const users = session.get<User[]>('users') || []
   *   const newUser = { id: crypto.randomUUID(), ...body }
   *   session.set('users', [...users, newUser])
   *   return newUser
   * }
   *
   * // Retrieve data in a GET handler
   * 'GET /api/users': ({ session }) => {
   *   return session.get<User[]>('users') || []
   * }
   * ```
   */
  session: SessionState
}

/**
 * The demo interceptor instance returned by createDemoInterceptor
 */
export interface DemoInterceptor {
  /**
   * Enable demo mode - all matching fetches will return fixture data
   */
  enable(): void

  /**
   * Disable demo mode - fetches will pass through to the real API
   */
  disable(): void

  /**
   * Check if demo mode is currently enabled
   */
  isEnabled(): boolean

  /**
   * Toggle demo mode state and return the new state
   */
  toggle(): boolean

  /**
   * Replace all fixtures with a new fixture map
   */
  setFixtures(fixtures: FixtureMap): void

  /**
   * Add or update a single fixture pattern
   */
  addFixture(pattern: string, handler: FixtureHandler): void

  /**
   * Remove a fixture pattern
   */
  removeFixture(pattern: string): void

  /**
   * Reset the session state, clearing all stored data
   * Call this to manually reset the demo session without page refresh
   */
  resetSession(): void

  /**
   * Get the current session state instance
   * Useful for inspecting or manipulating session state directly
   */
  getSession(): SessionState

  /**
   * Clean up the interceptor - restores original fetch
   * Call this when unmounting or cleaning up
   */
  destroy(): void
}

/**
 * Result of URL pattern matching
 */
export interface MatchResult {
  /**
   * Whether the pattern matched the URL
   */
  matched: boolean

  /**
   * Extracted URL parameters
   */
  params: Record<string, string>
}

/**
 * Parsed URL pattern
 */
export interface ParsedPattern {
  /**
   * HTTP method from the pattern
   */
  method: string

  /**
   * Regex to match the path
   */
  pathPattern: RegExp

  /**
   * Names of parameters in order of appearance
   */
  paramNames: string[]
}

// ============================================================================
// Remote Configuration Types (for DemoKit Cloud integration)
// ============================================================================

/**
 * Configuration for fetching fixtures from DemoKit Cloud
 */
export interface RemoteConfig {
  /**
   * DemoKit Cloud API key
   * Format: dk_live_xxxx
   */
  apiKey: string

  /**
   * DemoKit Cloud API URL (base URL)
   * The SDK will append `/fixtures` to this URL.
   * @example 'https://demokit-cloud.kasava.dev/api'
   * @default 'https://api.demokit.cloud/api'
   */
  apiUrl?: string

  /**
   * @deprecated Use apiUrl instead. This is kept for backwards compatibility.
   */
  cloudUrl?: string

  /**
   * Error callback for remote fetch failures
   */
  onError?: (error: Error) => void

  /**
   * Callback when fixtures are successfully loaded
   */
  onLoad?: (response: CloudFixtureResponse) => void

  /**
   * Timeout for API requests in milliseconds
   * @default 10000
   */
  timeout?: number

  /**
   * Whether to retry on failure
   * @default true
   */
  retry?: boolean

  /**
   * Maximum number of retries
   * @default 3
   */
  maxRetries?: number
}

/**
 * Response from DemoKit Cloud /api/v1/fixtures endpoint
 */
export interface CloudFixtureResponse {
  /**
   * The generated fixture data (keyed by model name)
   * @example { users: [{ id: '1', name: 'Alice' }], products: [...] }
   */
  data: Record<string, unknown[]>

  /**
   * Endpoint-to-data mappings for SDK auto-configuration
   */
  mappings: EndpointMapping[]

  /**
   * Version identifier (generation ID) for cache invalidation
   */
  version: string
}

/**
 * An endpoint mapping that describes how to route API calls to fixture data
 */
export interface EndpointMapping {
  /**
   * HTTP method (GET, POST, PUT, PATCH, DELETE)
   */
  method: string

  /**
   * URL pattern with :param placeholders
   * @example '/api/users/:id'
   */
  pattern: string

  /**
   * Key in fixture data to use as source
   * @example 'users'
   */
  sourceModel: string

  /**
   * Response type:
   * - 'collection': Returns all records (array)
   * - 'single': Returns one record by lookup
   * - 'custom': Uses custom transform (not yet supported in SDK)
   */
  responseType: 'collection' | 'single' | 'custom'

  /**
   * For 'single' type: field in data to match against
   * @example 'id'
   */
  lookupField?: string | null

  /**
   * For 'single' type: URL param name to use for lookup
   * @example 'id' (from :id in pattern)
   */
  lookupParam?: string | null
}

/**
 * Combined configuration for DemoKit with optional remote support
 */
export interface DemoKitRemoteConfig extends Omit<DemoKitConfig, 'fixtures'> {
  /**
   * Remote configuration for fetching from DemoKit Cloud
   * When provided, fixtures are fetched from the cloud
   */
  remote: RemoteConfig

  /**
   * Local fixture overrides that take precedence over remote fixtures
   * Useful for customizing specific endpoints while using cloud data for the rest
   */
  fixtures?: FixtureMap
}

/**
 * State of remote fixture loading
 */
export interface RemoteLoadingState {
  /**
   * Whether fixtures are currently being loaded
   */
  isLoading: boolean

  /**
   * Error if loading failed
   */
  error: Error | null

  /**
   * The loaded response (if successful)
   */
  response: CloudFixtureResponse | null

  /**
   * Timestamp of last successful load
   */
  loadedAt: Date | null
}
