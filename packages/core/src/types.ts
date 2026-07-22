import type { SessionState } from './session'
import type { DataModel, Relationship } from './services/schema/types'
import type { ShapeNode } from './shape'

/**
 * Configuration for automatic demo mode detection based on URL
 */
export interface DetectionConfig {
  /**
   * Hostnames that should auto-enable demo mode
   * @example ['demo.myapp.com', 'demo.localhost']
   */
  subdomains?: string[]

  /**
   * Query parameters that trigger demo mode when present
   * @default ['demo']
   * @example With ['demo'], visiting ?demo=true enables demo mode
   */
  queryParams?: string[]
}

/**
 * Context passed to the onMutationIntercepted callback
 */
export interface MutationInterceptedContext {
  /**
   * The full URL of the intercepted request
   */
  url: string

  /**
   * HTTP method (POST, PUT, PATCH, DELETE)
   */
  method: string

  /**
   * URL parameters extracted from the pattern
   */
  params: Record<string, string>

  /**
   * The fixture pattern that matched
   */
  pattern: string
}

/**
 * Context passed to the unmatched-mutation policy and onMutationBlocked callback
 */
export interface UnmatchedMutationContext {
  /** The full URL of the request */
  url: string
  /** HTTP method (POST, PUT, PATCH, DELETE) */
  method: string
  /** Pathname of the request */
  pathname: string
}

/** An unmatched GET/HEAD that passed through to the real API (spec §8). */
export interface UnmatchedRequestContext {
  method: string
  pathname: string
}

/** A fixture/projection handler that threw with a server-side status. */
export interface ProjectionErrorContext {
  method: string
  pathname: string
  status: number
}

/**
 * Policy for non-GET requests that match no fixture while demo mode is on.
 * - 'block' (default): return a mock 409 instead of hitting the real API
 * - 'passthrough': forward to the real API (pre-0.5 behavior)
 * - function: decide per request
 */
export type UnmatchedMutationPolicy =
  | 'block'
  | 'passthrough'
  | ((context: UnmatchedMutationContext) => 'block' | 'passthrough')

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

  /**
   * Auto-detection configuration for enabling demo mode based on URL
   * When configured, demo mode is automatically enabled on matching subdomains
   * or when specific query parameters are present
   */
  detection?: DetectionConfig

  /**
   * Path aliases for matching fixtures across equivalent URL prefixes.
   * Common in Next.js apps where `/api/*` rewrites to `/v1/*`.
   * A fixture defined for `/v1/users` will also match `/api/users`.
   *
   * @example
   * pathAliases: { '/api/': '/v1/' }
   */
  pathAliases?: Record<string, string>

  /**
   * Log a warning when a catch-all pattern (containing `*`) matches a request.
   * Helps identify fixtures that need specific patterns.
   * @default true in development, false in production
   */
  warnOnCatchAll?: boolean

  /**
   * Guard callback that controls whether demo mode can be disabled.
   * Return `true` to allow disabling, `false` to prevent it,
   * or a string to prevent it and provide a reason message.
   *
   * @example
   * canDisable: () => {
   *   if (isPublicDemo) return 'Sign up to access your own data'
   *   return true
   * }
   */
  canDisable?: () => boolean | string

  /**
   * Callback fired when a non-GET request is intercepted by a fixture.
   * Useful for showing "simulated in demo mode" toast notifications.
   */
  onMutationIntercepted?: (context: MutationInterceptedContext) => void

  /**
   * Policy for non-GET requests that match no fixture while demo mode is on.
   * @default 'block'
   */
  unmatchedMutations?: UnmatchedMutationPolicy

  /**
   * Callback fired when an unmatched mutation is blocked.
   * The React provider uses this to show a "not part of the demo" toast.
   */
  onMutationBlocked?: (context: UnmatchedMutationContext) => void

  /**
   * Callback fired when the session is reset via resetSession().
   * The store runtime uses this to clear the op-log and re-seed (spec §3.3).
   */
  onSessionReset?: () => void

  /** Fired when a demo-mode request matches no fixture and passes through. */
  onUnmatchedRequest?: (context: UnmatchedRequestContext) => void
  /** Fired when a fixture handler throws with status >= 500. */
  onProjectionError?: (context: ProjectionErrorContext) => void

  /**
   * Inject a session state instance instead of letting the interceptor create
   * its own. Lets multiple transports (fetch interceptor, MSW worker) share
   * one session across a single demo run.
   */
  session?: SessionState

  /**
   * DemoKit's own control-plane API origin (the coverage reporter's and
   * `fetchCloudFixtures`'s `apiUrl`) — passed straight through to
   * `resolveRequest`'s `ResolveDeps.controlPlaneOrigin`. Requests to this
   * origin bypass matching and mutation policy entirely, so DemoKit's own
   * traffic is never mistaken for demo traffic.
   */
  controlPlaneOrigin?: string

  /**
   * Observe response SHAPES (spec §9.4) on unmatched safe-method requests
   * that pass through to the real API while demo mode is on — never
   * values, key names and primitive type tags only (see `deriveShape`).
   * Never observes DemoKit's own control-plane traffic.
   * @default true
   */
  observeShapes?: boolean

  /**
   * Fired when `observeShapes` derived a shape from a passthrough
   * response. The React provider wires this into the coverage reporter's
   * `unmatched_request` events (spec §9.4).
   */
  onPassthroughShape?: (info: { method: string; pathname: string; shape: ShapeNode }) => void
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
   * Disable demo mode - fetches will pass through to the real API.
   * Returns `true` if disabled successfully, `false` or a string reason
   * if prevented by the `canDisable` guard.
   */
  disable(): boolean | string

  /**
   * Check if demo mode is currently enabled
   */
  isEnabled(): boolean

  /**
   * Check if this is a public demo (auto-detected via subdomain)
   */
  isPublicDemo(): boolean

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

  /**
   * Draft preview session (spec §6): a short-lived token minted by the
   * dashboard. Sent as ?demo-preview=<token>; the cloud serves the token's
   * draft generation instead of the published one.
   */
  previewToken?: string
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

  /**
   * Pruned data models (types, enums, required, relationship targets) so the
   * store can validate mutations at runtime (spec §3.1). Optional: absent on
   * legacy payloads, in which case the SDK uses the fixture-map path.
   */
  models?: Record<string, DataModel>

  /** Relationship graph for FK enforcement (spec §3.1). Optional, as above. */
  relationships?: Relationship[]

  /** True when this payload is a draft preview, not the published version. */
  preview?: boolean
}

/** Aggregate projection config: the dashboard number is derived from the rows (spec §4.1). */
export interface AggregateConfig {
  function: 'count' | 'sum' | 'avg' | 'groupBy'
  /** Row field to sum/avg over. */
  field?: string
  /** Row field to group by (with 'groupBy', or combined with sum/avg). */
  groupBy?: string
}

/** Declares how query params shape a collection response (spec §4.1). Cursor pagination is a v1 non-goal. */
export interface QueryParamConfig {
  /** queryParam -> row field, e.g. { status: 'status' } makes ?status=active filter rows. */
  filters?: Record<string, string>
  /** Sort query param name (value like 'createdAt' or '-createdAt' for descending). */
  sortParam?: string
  pagination?: {
    style: 'offset' | 'page'
    /** @default 'limit' (offset) / 'perPage' (page) */
    limitParam?: string
    /** @default 'offset' */
    offsetParam?: string
    /** @default 'page' */
    pageParam?: string
    /** @default 25 */
    defaultLimit?: number
  }
  /** 'bare' returns the array; 'data-total-page' returns { data, total, page }. @default 'bare' */
  envelope?: 'bare' | 'data-total-page'
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
   * Response type (spec §4.1):
   * - 'collection': model(x).all() with query-param filtering/sort/pagination
   * - 'single':     looks up one row where String(row[lookupField ?? 'id']) matches params[lookupParam ?? 'id']
   * - 'create':     model(x).create(body) -> 201
   * - 'update':     model(x).update(params[lookupParam], body)
   * - 'delete':     model(x).delete(...) -> 204
   * - 'aggregate':  computed per aggregateConfig
   * - 'transform':  named reference into the transform registry
   * - 'custom':     legacy; treated as unmapped (warn + skip)
   */
  responseType:
    | 'collection'
    | 'single'
    | 'create'
    | 'update'
    | 'delete'
    | 'aggregate'
    | 'transform'
    | 'custom'

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

  /** For 'aggregate'. */
  aggregateConfig?: AggregateConfig | null

  /** For 'transform': name registered in the app's TransformRegistry. */
  transformName?: string | null

  /** For 'collection': query-param filtering/sort/pagination/envelope. */
  queryParamConfig?: QueryParamConfig | null
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
