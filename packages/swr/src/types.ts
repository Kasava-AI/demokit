import type { SWRConfiguration, Middleware, MutatorCallback, MutatorOptions } from 'swr'
import type { QueryKey, QueryKeyMatchResult } from '@demokit-ai/core'
import type { ReactNode } from 'react'

/**
 * Context provided to SWR fixture handlers
 */
export interface SWRFixtureContext {
  /**
   * The SWR key (can be string, array, or object)
   */
  key: string | unknown[]

  /**
   * Normalized key as QueryKey for pattern matching
   */
  normalizedKey: QueryKey

  /**
   * Extracted parameters from pattern matching
   */
  params: Record<string, unknown>

  /**
   * The match result from pattern matching
   */
  match: QueryKeyMatchResult
}

/**
 * A fixture handler can be:
 * - A static value (object, array, primitive)
 * - A function that receives context and returns data
 * - An async function for dynamic fixtures
 */
export type SWRFixtureHandler<TData = unknown> =
  | TData
  | ((context: SWRFixtureContext) => TData)
  | ((context: SWRFixtureContext) => Promise<TData>)

/**
 * Map of key patterns to fixture handlers
 */
export type SWRFixtureMap = Map<QueryKey, SWRFixtureHandler>

/**
 * Object-based fixture map (easier to define)
 * Keys are JSON-stringified key patterns or simple strings
 */
export type SWRFixtureMapObject = Record<string, SWRFixtureHandler>

/**
 * Context provided to mutation fixture handlers
 */
export interface SWRMutationFixtureContext<TData = unknown, TArg = unknown> {
  /**
   * The mutation key
   */
  key: string | unknown[]

  /**
   * The argument passed to the mutation
   */
  arg: TArg

  /**
   * Current data in the cache
   */
  currentData: TData | undefined

  /**
   * Function to mutate other SWR keys
   */
  mutate: <T>(
    key: string | unknown[],
    data?: T | Promise<T> | MutatorCallback<T>,
    opts?: boolean | MutatorOptions<T>
  ) => Promise<T | undefined>
}

/**
 * A mutation fixture handler
 */
export type SWRMutationFixtureHandler<TData = unknown, TArg = unknown> =
  | TData
  | ((context: SWRMutationFixtureContext<TData, TArg>) => TData)
  | ((context: SWRMutationFixtureContext<TData, TArg>) => Promise<TData>)

/**
 * Map of mutation keys to fixture handlers
 */
export type SWRMutationFixtureMap = Map<string, SWRMutationFixtureHandler>

/**
 * Object-based mutation fixture map
 */
export type SWRMutationFixtureMapObject = Record<string, SWRMutationFixtureHandler>

/**
 * Configuration for DemoSWRProvider
 */
export interface DemoSWRProviderConfig {
  /**
   * Fixtures - map of key patterns to handlers
   */
  fixtures?: SWRFixtureMap | SWRFixtureMapObject

  /**
   * Mutation fixtures - map of mutation names to handlers
   */
  mutations?: SWRMutationFixtureMap | SWRMutationFixtureMapObject

  /**
   * Whether demo mode is enabled
   * @default false
   */
  enabled?: boolean

  /**
   * Delay in ms before returning fixture data (simulates network latency)
   * @default 0
   */
  delay?: number

  /**
   * Fallback data to use for SWR's fallback option
   * Will be merged with any static fixture values
   */
  fallback?: Record<string, unknown>

  /**
   * Additional SWR configuration to merge
   */
  swrConfig?: SWRConfiguration
}

/**
 * Props for DemoSWRProvider
 */
export interface DemoSWRProviderProps extends DemoSWRProviderConfig {
  /**
   * Child components
   */
  children: ReactNode
}

/**
 * Return type of useDemoSWR hook
 */
export interface DemoSWRState {
  /**
   * Whether demo mode is enabled
   */
  isDemoMode: boolean

  /**
   * Add or update a fixture
   */
  setFixture: (pattern: QueryKey, handler: SWRFixtureHandler) => void

  /**
   * Remove a fixture
   */
  removeFixture: (pattern: QueryKey) => void

  /**
   * Add or update a mutation fixture
   */
  setMutationFixture: (name: string, handler: SWRMutationFixtureHandler) => void

  /**
   * Remove a mutation fixture
   */
  removeMutationFixture: (name: string) => void

  /**
   * Get the demo-aware fetcher function
   */
  getFetcher: () => <T>(key: string | unknown[]) => Promise<T>

  /**
   * Get the demo middleware
   */
  getMiddleware: () => Middleware
}

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