import type { FixtureMap, SessionState, CloudFixtureResponse, RemoteConfig, DetectionConfig, MutationInterceptedContext, UnmatchedMutationContext, UnmatchedMutationPolicy, TransformRegistry } from '@demokit-ai/core'
import type { ReactNode } from 'react'

/**
 * Props for the DemoKitProvider component
 *
 * The provider supports two modes:
 * 1. **Local mode**: Provide `fixtures` prop with pattern handlers
 * 2. **Remote mode**: Provide `source` config to fetch from DemoKit Cloud
 *
 * @example Local mode
 * ```tsx
 * <DemoKitProvider fixtures={{ 'GET /api/users': () => [] }}>
 *   <App />
 * </DemoKitProvider>
 * ```
 *
 * @example Remote mode
 * ```tsx
 * import { createRemoteSource } from '@demokit-ai/react'
 *
 * const source = createRemoteSource({
 *   apiUrl: process.env.NEXT_PUBLIC_DEMOKIT_API_URL!,
 *   apiKey: process.env.NEXT_PUBLIC_DEMOKIT_API_KEY!,
 * })
 *
 * <DemoKitProvider source={source}>
 *   <App />
 * </DemoKitProvider>
 * ```
 *
 * @example Remote mode with local overrides
 * ```tsx
 * <DemoKitProvider
 *   source={source}
 *   fixtures={{ 'POST /api/users': ({ body }) => ({ id: 'custom', ...body }) }}
 * >
 *   <App />
 * </DemoKitProvider>
 * ```
 */
export interface DemoKitProviderProps {
  /**
   * Child components to render
   */
  children: ReactNode

  /**
   * Map of URL patterns to fixture handlers (local mode)
   * In remote mode, these act as overrides for cloud fixtures
   */
  fixtures?: FixtureMap

  // ============================================================================
  // Remote Configuration (for DemoKit Cloud)
  // ============================================================================

  /**
   * Remote source configuration for fetching fixtures from DemoKit Cloud
   * Create using createRemoteSource()
   */
  source?: RemoteConfig

  /**
   * Named transforms for cloud mappings with responseType 'transform' —
   * the only place engineering writes demo logic post-install (spec §4.2).
   * @example transforms={{ 'billing-summary': ({ store }) => ({ ... }) }}
   */
  transforms?: TransformRegistry

  /**
   * Callback when remote fixtures are successfully loaded
   */
  onRemoteLoad?: (response: CloudFixtureResponse) => void

  /**
   * Callback when remote fetch fails
   */
  onRemoteError?: (error: Error) => void

  // ============================================================================
  // Loading/Error UI
  // ============================================================================

  /**
   * Content to render while loading remote fixtures
   * @default null (renders nothing while loading)
   */
  loadingFallback?: ReactNode

  /**
   * Content to render when remote fetch fails
   * If not provided, children are rendered (with local fixtures only if provided)
   */
  errorFallback?: ReactNode | ((error: Error) => ReactNode)

  // ============================================================================
  // Standard Props
  // ============================================================================

  /**
   * Which transport resolves demo requests against the fixture map.
   *
   * - `'fetch'` (default): patches `globalThis.fetch` via the core
   *   interceptor. Works everywhere, including SSR/Node.
   * - `'msw'`: routes requests through an MSW v2 Service Worker instead.
   *   `@demokit-ai/msw-transport` is dynamically imported only when demo
   *   mode actually activates, so `transport: 'fetch'` users (the default)
   *   never load msw code, and it need not be installed for them.
   *
   * @default 'fetch'
   *
   * Fixed for the provider's lifetime: captured on first mount and never
   * re-read. Changing it on a later render is ignored (warned once in dev)
   * rather than tearing down and rebuilding the active transport — two
   * transports must never coexist for the same provider instance.
   */
  transport?: 'msw' | 'fetch'

  /**
   * Options forwarded to `createMswTransport()` when `transport: 'msw'`.
   * Ignored under `transport: 'fetch'` (the default).
   */
  mswOptions?: {
    /**
     * Path to the MSW Service Worker script.
     * @default '/mockServiceWorker.js'
     */
    workerUrl?: string
    /**
     * Milliseconds to wait for the worker to register before treating
     * `start()` as failed (status becomes `'unavailable'`).
     * @default 5000
     */
    startTimeoutMs?: number
  }

  /**
   * localStorage key for persisting demo mode state
   * @default 'demokit-mode'
   */
  storageKey?: string

  /**
   * Whether demo mode should be initially enabled
   * If not provided, will read from localStorage
   * @default false
   */
  initialEnabled?: boolean

  /**
   * Callback invoked when demo mode state changes
   */
  onDemoModeChange?: (enabled: boolean) => void

  /**
   * Base URL to use for relative URL parsing
   * @default 'http://localhost'
   */
  baseUrl?: string

  // ============================================================================
  // Detection & Guards
  // ============================================================================

  /**
   * Auto-detection configuration for enabling demo mode based on URL.
   * When configured, demo mode is automatically enabled on matching subdomains
   * or when specific query parameters are present.
   */
  detection?: DetectionConfig

  /**
   * Guard callback that controls whether demo mode can be disabled.
   * Return `true` to allow, `false` to prevent, or a string reason message.
   */
  canDisable?: () => boolean | string

  /**
   * Callback fired when a non-GET request is intercepted by a fixture.
   * Useful for showing "simulated in demo mode" toast notifications.
   */
  onMutationIntercepted?: (context: MutationInterceptedContext) => void

  /**
   * Policy for non-GET requests that match no fixture while demo mode is on.
   * Forwarded to the core interceptor.
   * @default 'block'
   */
  unmatchedMutations?: UnmatchedMutationPolicy

  /**
   * Callback fired when an unmatched mutation is blocked.
   */
  onMutationBlocked?: (context: UnmatchedMutationContext) => void

  /**
   * Render the built-in "This action isn't part of the demo" toast when a
   * mutation is blocked. Set false if you handle onMutationBlocked yourself.
   * @default true
   */
  showBlockedToast?: boolean

  /**
   * Path aliases for matching fixtures across equivalent URL prefixes.
   * Passed through to the core interceptor.
   * @example { '/api/': '/v1/' }
   */
  pathAliases?: Record<string, string>

  /**
   * Log warnings when catch-all patterns match. Passed through to core.
   * @default true in development
   */
  warnOnCatchAll?: boolean

  /**
   * Report coverage-health events (unmatched requests, blocked mutations,
   * unregistered transforms, projection errors) to DemoKit Cloud — paths and
   * methods only, never values. Preview sessions never report.
   * @default true
   */
  reportCoverage?: boolean

  // ============================================================================
  // Query Cache Integration
  // ============================================================================

  /**
   * TanStack Query QueryClient instance. When provided, all queries are
   * automatically invalidated when demo mode toggles, ensuring stale
   * real/demo data is cleared.
   */
  queryClient?: { invalidateQueries: () => void }

  // ============================================================================
  // URL Redirects
  // ============================================================================

  /**
   * URL redirect mappings for navigating between real and demo entity pages.
   * When demo mode toggles, if the current URL matches a pattern containing
   * a UUID, the user is redirected to the demo URL (and vice versa).
   *
   * @example
   * urlRedirects: [
   *   { pattern: '/repositories/:id', demoUrl: '/repositories/demo-repo' },
   *   { pattern: '/products/:id/*', demoUrl: '/products/demo-product/summary' },
   * ]
   */
  urlRedirects?: Array<{
    /** URL pattern with :id placeholder for UUID segments */
    pattern: string
    /** URL to navigate to when entering demo mode */
    demoUrl: string
    /** URL to navigate to when exiting demo mode. Defaults to the pattern's base path. */
    exitUrl?: string
  }>
}

/**
 * Lazy transport bootstrap status (spec §10 — demo-gated dynamic import).
 *
 * - `'idle'`: demo mode was not wanted on mount; nothing has been constructed
 *   and no cloud config has been fetched.
 * - `'loading'`: `ensureTransport()` is in flight (cloud fetch and/or
 *   interceptor construction).
 * - `'ready'`: the transport is constructed (or bootstrap completed with
 *   nothing to construct).
 * - `'unavailable'`: bootstrap failed and no usable fixtures were available
 *   to fall back to.
 */
export type DemoKitStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

/**
 * Value provided by the DemoMode context
 */
export interface DemoModeContextValue {
  /**
   * Whether demo mode is currently enabled
   */
  isDemoMode: boolean

  /**
   * Whether the component has hydrated (for SSR safety)
   * Always check this before rendering demo-dependent UI
   */
  isHydrated: boolean

  /**
   * Lazy transport bootstrap status. See {@link DemoKitStatus}.
   */
  status: DemoKitStatus

  /**
   * Whether this is a public demo instance (auto-detected via subdomain).
   * Useful for showing different CTAs (e.g., "Sign up" instead of "Exit Demo").
   */
  isPublicDemo: boolean

  // ============================================================================
  // Remote State (for DemoKit Cloud)
  // ============================================================================

  /**
   * Whether remote fixtures are currently being loaded
   * Only relevant when apiKey is provided
   */
  isLoading: boolean

  /**
   * Error that occurred during remote fetch
   * Only set when apiKey is provided and fetch fails
   */
  remoteError: Error | null

  /**
   * Version identifier from the loaded cloud fixtures
   * Useful for cache invalidation and debugging
   */
  remoteVersion: string | null

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Enable demo mode
   */
  enable(): void

  /**
   * Disable demo mode. Returns `true` if disabled successfully,
   * `false` or a string reason if prevented by the `canDisable` guard.
   */
  disable(): boolean | string

  /**
   * Toggle demo mode and return the new state
   */
  toggle(): void

  /**
   * Set demo mode to a specific state
   */
  setDemoMode(enabled: boolean): void

  /**
   * Reset the session state, clearing all stored data
   * Call this to manually reset the demo session without page refresh
   */
  resetSession(): void

  /**
   * Get the current session state instance
   * Useful for inspecting or manipulating session state directly
   * Returns null if the interceptor hasn't been initialized yet
   */
  getSession(): SessionState | null

  /**
   * Refetch fixtures from DemoKit Cloud
   * Only works when apiKey is provided
   * Returns a promise that resolves when the fetch completes
   */
  refetch(): Promise<void>
}

/**
 * Props for the DemoModeBanner component
 */
export interface DemoModeBannerProps {
  /**
   * Additional CSS class name
   */
  className?: string

  /**
   * Label for the exit button
   * @default 'Exit Demo Mode'
   */
  exitLabel?: string

  /**
   * Label shown when demo mode is active
   * @default 'Demo Mode Active'
   */
  demoLabel?: string

  /**
   * Description shown in the banner
   * @default 'Changes are simulated and not saved'
   */
  description?: string

  /**
   * Whether to show the eye icon
   * @default true
   */
  showIcon?: boolean

  /**
   * Show "Powered by DemoKit" branding
   * Note: For OSS users, this is always true regardless of the prop value.
   * Only paid DemoKit Cloud users can hide the branding.
   * @default true
   */
  showPoweredBy?: boolean

  /**
   * URL for the "Powered by" link
   * @default 'https://demokit.ai'
   */
  poweredByUrl?: string

  /**
   * Custom styles for the banner container
   */
  style?: React.CSSProperties

  /**
   * Callback when exit button is clicked
   * If not provided, will call disable() from context
   */
  onExit?: () => void
}
