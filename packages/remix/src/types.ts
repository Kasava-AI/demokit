import type { LoaderFunctionArgs, ActionFunctionArgs, TypedResponse } from '@remix-run/node'

/**
 * Context passed to loader fixture handlers
 */
export interface LoaderFixtureContext {
  /** Route params extracted from the URL */
  params: Record<string, string | undefined>
  /** The original request object */
  request: Request
  /** Matched route path pattern */
  path: string
}

/**
 * Context passed to action fixture handlers
 */
export interface ActionFixtureContext {
  /** Route params extracted from the URL */
  params: Record<string, string | undefined>
  /** The original request object */
  request: Request
  /** Matched route path pattern */
  path: string
  /** Parsed form data (convenience method result) */
  formData?: FormData
}

/**
 * Loader fixture handler function or static value
 */
export type LoaderFixtureHandler<T = unknown> =
  | T
  | ((context: LoaderFixtureContext) => T | Promise<T>)

/**
 * Action fixture handler function or static value
 */
export type ActionFixtureHandler<T = unknown> =
  | T
  | ((context: ActionFixtureContext) => T | Promise<T>)

/**
 * Map of route paths to loader fixtures
 *
 * Keys are route path patterns like '/users/:id' or '/projects'
 */
export type LoaderFixtureMap = Map<string, LoaderFixtureHandler>

/**
 * Object-based loader fixture map for easier definition
 */
export type LoaderFixtureMapObject = Record<string, LoaderFixtureHandler>

/**
 * Map of route paths to action fixtures
 *
 * Keys are route path patterns like '/users/:id' or '/projects'
 * Values can be keyed by HTTP method: { POST: handler, PUT: handler }
 */
export type ActionFixtureMap = Map<string, ActionFixtureHandler | MethodActionHandlers>

/**
 * Object-based action fixture map for easier definition
 */
export type ActionFixtureMapObject = Record<string, ActionFixtureHandler | MethodActionHandlers>

/**
 * Action handlers organized by HTTP method
 */
export interface MethodActionHandlers {
  POST?: ActionFixtureHandler
  PUT?: ActionFixtureHandler
  PATCH?: ActionFixtureHandler
  DELETE?: ActionFixtureHandler
}

/**
 * Options for creating a demo-aware loader
 */
export interface CreateDemoLoaderOptions<T = unknown> {
  /**
   * The real loader function to use when demo mode is disabled
   */
  loader: (args: LoaderFunctionArgs) => T | Promise<T>

  /**
   * Function to check if demo mode is enabled
   * Can check cookies, headers, or environment variables
   * @default () => false
   */
  isEnabled?: (request: Request) => boolean | Promise<boolean>

  /**
   * Demo fixture to return when demo mode is enabled
   * Can be a static value or a function
   */
  fixture?: LoaderFixtureHandler<T>

  /**
   * Simulated delay in milliseconds
   * @default 0
   */
  delay?: number

  /**
   * Callback when demo mode is used
   */
  onDemo?: (context: LoaderFixtureContext) => void
}

/**
 * Options for creating a demo-aware action
 */
export interface CreateDemoActionOptions<T = unknown> {
  /**
   * The real action function to use when demo mode is disabled
   */
  action: (args: ActionFunctionArgs) => T | Promise<T>

  /**
   * Function to check if demo mode is enabled
   * Can check cookies, headers, or environment variables
   * @default () => false
   */
  isEnabled?: (request: Request) => boolean | Promise<boolean>

  /**
   * Demo fixture to return when demo mode is enabled
   * Can be a static value, a function, or organized by HTTP method
   */
  fixture?: ActionFixtureHandler<T> | MethodActionHandlers

  /**
   * Simulated delay in milliseconds
   * @default 0
   */
  delay?: number

  /**
   * Callback when demo mode is used
   */
  onDemo?: (context: ActionFixtureContext) => void
}

/**
 * Options for the demo route wrapper
 */
export interface DemoRouteOptions {
  /**
   * Function to check if demo mode is enabled
   */
  isEnabled?: (request: Request) => boolean | Promise<boolean>

  /**
   * Default delay for all fixtures
   */
  delay?: number

  /**
   * Loader fixtures by path
   */
  loaders?: LoaderFixtureMapObject

  /**
   * Action fixtures by path
   */
  actions?: ActionFixtureMapObject

  /**
   * Callback when no fixture is found
   */
  onMissing?: (type: 'loader' | 'action', path: string) => void
}

/**
 * State for the demo remix context
 */
export interface DemoRemixState {
  /** Whether demo mode is enabled */
  enabled: boolean
  /** Current loader fixtures */
  loaders: LoaderFixtureMap
  /** Current action fixtures */
  actions: ActionFixtureMap
}

/**
 * Provider configuration
 */
export interface DemoRemixProviderConfig {
  /**
   * Whether demo mode is enabled
   * @default false
   */
  enabled?: boolean

  /**
   * Loader fixtures
   */
  loaders?: LoaderFixtureMapObject

  /**
   * Action fixtures
   */
  actions?: ActionFixtureMapObject

  /**
   * Simulated delay in milliseconds
   * @default 0
   */
  delay?: number
}

/**
 * Props for DemoRemixProvider
 */
export interface DemoRemixProviderProps extends DemoRemixProviderConfig {
  children: React.ReactNode
}

/**
 * Demo mode detection options
 */
export interface DemoModeOptions {
  /**
   * Cookie name to check for demo mode
   * @default 'demokit-demo-mode'
   */
  cookieName?: string

  /**
   * Header name to check for demo mode
   * @default 'x-demokit-demo-mode'
   */
  headerName?: string

  /**
   * Environment variable to check for demo mode
   * @default 'DEMOKIT_DEMO_MODE'
   */
  envVar?: string

  /**
   * Query parameter to check for demo mode
   * @default 'demo'
   */
  queryParam?: string
}

/**
 * Server-side fixture store configuration
 */
export interface FixtureStoreConfig {
  /**
   * Loader fixtures by route path
   */
  loaders?: LoaderFixtureMapObject

  /**
   * Action fixtures by route path
   */
  actions?: ActionFixtureMapObject
}

/**
 * Result type from Remix loaders/actions (supports json, defer, redirect)
 */
export type RemixResponse<T> = T | TypedResponse<T>

// ============================================================================
// Remote Configuration Types (for DemoKit Cloud integration)
// ============================================================================

/**
 * Configuration for remote fixture source (DemoKit Cloud)
 */
export interface RemoteSourceConfig {
  /**
   * DemoKit Cloud API URL (versioned base URL)
   * The SDK will append `/fixtures` to this URL.
   * @example 'https://demokit-cloud.kasava.dev/api'
   * @default 'https://api.demokit.cloud/api'
   */
  apiUrl: string

  /**
   * DemoKit Cloud API key
   * Format: dk_live_xxx
   */
  apiKey: string

  /**
   * Request timeout in milliseconds
   * @default 10000
   */
  timeout?: number

  /**
   * Whether to retry failed requests
   * @default true
   */
  retry?: boolean

  /**
   * Maximum number of retries
   * @default 3
   */
  maxRetries?: number
}
