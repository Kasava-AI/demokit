import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'

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
   * @default () => false
   */
  isEnabled?: () => boolean

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
   * @default () => false
   */
  isEnabled?: () => boolean

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
  isEnabled?: () => boolean

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
 * State for the demo router context
 */
export interface DemoRouterState {
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
export interface DemoRouterProviderConfig {
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
 * Props for DemoRouterProvider
 */
export interface DemoRouterProviderProps extends DemoRouterProviderConfig {
  children: React.ReactNode
}