import type { QueryKey as TanStackQueryKey, QueryClient, MutationFunction } from '@tanstack/react-query'
import type { QueryKey, QueryKeyMatchResult } from '@demokit-ai/core'
import type { ReactNode } from 'react'

/**
 * Context provided to query fixture handlers
 */
export interface QueryFixtureContext {
  /**
   * The full query key
   */
  queryKey: TanStackQueryKey

  /**
   * Extracted parameters from pattern matching
   */
  params: Record<string, unknown>

  /**
   * The match result from pattern matching
   */
  match: QueryKeyMatchResult

  /**
   * Signal for aborting the query
   */
  signal?: AbortSignal
}

/**
 * A query fixture handler can be:
 * - A static value (object, array, primitive)
 * - A function that receives context and returns data
 * - An async function for dynamic fixtures
 */
export type QueryFixtureHandler<TData = unknown> =
  | TData
  | ((context: QueryFixtureContext) => TData)
  | ((context: QueryFixtureContext) => Promise<TData>)

/**
 * Map of query key patterns to fixture handlers
 */
export type QueryFixtureMap = Map<QueryKey, QueryFixtureHandler>

/**
 * Context provided to mutation fixture handlers
 */
export interface MutationFixtureContext<TVariables = unknown> {
  /**
   * The mutation key (if defined)
   */
  mutationKey?: TanStackQueryKey

  /**
   * Variables passed to the mutation
   */
  variables: TVariables

  /**
   * The query client for cache manipulation
   */
  queryClient: QueryClient
}

/**
 * A mutation fixture handler
 */
export type MutationFixtureHandler<TData = unknown, TVariables = unknown> =
  | TData
  | ((context: MutationFixtureContext<TVariables>) => TData)
  | ((context: MutationFixtureContext<TVariables>) => Promise<TData>)

/**
 * Map of mutation keys to fixture handlers
 */
export type MutationFixtureMap = Map<string, MutationFixtureHandler>

/**
 * Configuration for DemoQueryProvider
 */
export interface DemoQueryProviderConfig {
  /**
   * Query fixtures - map of query key patterns to handlers
   */
  queries?: QueryFixtureMap | QueryFixtureMapObject

  /**
   * Mutation fixtures - map of mutation names to handlers
   */
  mutations?: MutationFixtureMap | MutationFixtureMapObject

  /**
   * Whether demo mode is enabled
   * If not provided, reads from DemoKitProvider context
   */
  enabled?: boolean

  /**
   * Delay in ms before returning fixture data (simulates network latency)
   * @default 0
   */
  delay?: number

  /**
   * Whether to pre-populate the query cache on mount
   * Only applies to fixtures with static values (not functions)
   * @default false
   */
  prepopulateCache?: boolean

  /**
   * Fallback query function for unmatched queries
   * If not provided, will use fetch-based approach
   */
  fallbackQueryFn?: (context: { queryKey: TanStackQueryKey; signal?: AbortSignal }) => Promise<unknown>

  /**
   * staleTime for demo queries
   * @default Infinity
   */
  staleTime?: number
}

/**
 * Object-based query fixture map (easier to define)
 * Keys are JSON-stringified query key patterns
 */
export type QueryFixtureMapObject = Record<string, QueryFixtureHandler>

/**
 * Object-based mutation fixture map
 */
export type MutationFixtureMapObject = Record<string, MutationFixtureHandler>

/**
 * Props for DemoQueryProvider
 */
export interface DemoQueryProviderProps extends DemoQueryProviderConfig {
  /**
   * Child components
   */
  children: ReactNode

  /**
   * Existing QueryClient to wrap
   * If not provided, creates a new one
   */
  client?: QueryClient
}

/**
 * Return type of useDemoQuery hook
 */
export interface DemoQueryState {
  /**
   * Whether demo mode is enabled
   */
  isDemoMode: boolean

  /**
   * Add or update a query fixture
   */
  setQueryFixture: (pattern: QueryKey, handler: QueryFixtureHandler) => void

  /**
   * Remove a query fixture
   */
  removeQueryFixture: (pattern: QueryKey) => void

  /**
   * Add or update a mutation fixture
   */
  setMutationFixture: (name: string, handler: MutationFixtureHandler) => void

  /**
   * Remove a mutation fixture
   */
  removeMutationFixture: (name: string) => void

  /**
   * Invalidate all demo queries (triggers refetch)
   */
  invalidateAll: () => void

  /**
   * Reset query cache to initial demo state
   */
  resetCache: () => void
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
