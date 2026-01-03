import type { FixtureMap, SessionState, CloudFixtureResponse, RemoteConfig } from '@demokit-ai/core'
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
}

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
   * Disable demo mode
   */
  disable(): void

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
