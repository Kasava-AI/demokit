import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'
import type { QueryKey } from '@demokit-ai/core'
import type { QueryFixtureMap, DemoQueryProviderConfig, QueryFixtureHandler } from './types'
import { findMatchingFixture, normalizeFixtureMap } from './matcher'

/**
 * Configuration for creating a demo-aware QueryClient
 */
export interface DemoQueryClientConfig extends DemoQueryProviderConfig {
  /**
   * Base QueryClient config to extend
   */
  queryClientConfig?: QueryClientConfig
}

/**
 * Create a demo-aware query function
 *
 * This wraps the default query function to intercept demo queries
 * and return fixture data when demo mode is enabled.
 */
export function createDemoQueryFn(config: {
  fixtures: QueryFixtureMap
  delay?: number
  fallbackQueryFn?: DemoQueryProviderConfig['fallbackQueryFn']
  isEnabled: () => boolean
}) {
  const { fixtures, delay = 0, fallbackQueryFn, isEnabled } = config

  return async function demoQueryFn({
    queryKey,
    signal,
  }: {
    queryKey: readonly unknown[]
    signal?: AbortSignal
  }) {
    // If demo mode is not enabled, use fallback
    if (!isEnabled()) {
      if (fallbackQueryFn) {
        return fallbackQueryFn({ queryKey, signal })
      }
      throw new Error(
        `[DemoKit] No fallback query function provided and demo mode is disabled. ` +
          `Query key: ${JSON.stringify(queryKey)}`
      )
    }

    // Find matching fixture
    const match = findMatchingFixture(fixtures, queryKey as unknown[])

    if (!match) {
      // No fixture found, try fallback
      if (fallbackQueryFn) {
        return fallbackQueryFn({ queryKey, signal })
      }
      throw new Error(
        `[DemoKit] No fixture found for query key: ${JSON.stringify(queryKey)}`
      )
    }

    const [handler, { params }] = match

    // Apply delay if configured
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // Execute handler
    if (typeof handler === 'function') {
      return handler({
        queryKey: queryKey as unknown[],
        params,
        match: { matched: true, params },
        signal,
      })
    }

    // Return static value
    return handler
  }
}

/**
 * Create a demo-aware QueryClient
 *
 * This creates a QueryClient configured to intercept queries when demo mode
 * is enabled and return fixture data instead of making real API calls.
 *
 * @example
 * const { client, enable, disable, isEnabled } = createDemoQueryClient({
 *   queries: {
 *     '["users"]': [{ id: '1', name: 'Demo User' }],
 *     '["users", ":id"]': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *   },
 *   delay: 100, // Simulate 100ms latency
 * })
 *
 * // Use with QueryClientProvider
 * <QueryClientProvider client={client}>
 *   <App />
 * </QueryClientProvider>
 */
export function createDemoQueryClient(config: DemoQueryClientConfig = {}) {
  const {
    queries = new Map(),
    delay = 0,
    staleTime = Infinity,
    fallbackQueryFn,
    queryClientConfig = {},
    prepopulateCache = false,
  } = config

  let enabled = config.enabled ?? false
  const fixtures = normalizeFixtureMap(queries)

  const isEnabled = () => enabled

  const demoQueryFn = createDemoQueryFn({
    fixtures,
    delay,
    fallbackQueryFn,
    isEnabled,
  })

  const client = new QueryClient({
    ...queryClientConfig,
    defaultOptions: {
      ...queryClientConfig.defaultOptions,
      queries: {
        ...queryClientConfig.defaultOptions?.queries,
        queryFn: demoQueryFn,
        staleTime: enabled ? staleTime : queryClientConfig.defaultOptions?.queries?.staleTime,
        retry: enabled ? false : queryClientConfig.defaultOptions?.queries?.retry,
      },
    },
  })

  // Pre-populate cache if configured
  const prepopulate = () => {
    if (!prepopulateCache || !enabled) return

    for (const [pattern, handler] of fixtures) {
      // Only pre-populate static values (not functions)
      if (typeof handler !== 'function') {
        // Use pattern as query key for static fixtures
        client.setQueryData(pattern, handler)
      }
    }
  }

  return {
    /**
     * The QueryClient instance
     */
    client,

    /**
     * Enable demo mode
     */
    enable: () => {
      enabled = true
      client.setDefaultOptions({
        ...client.getDefaultOptions(),
        queries: {
          ...client.getDefaultOptions().queries,
          staleTime,
          retry: false,
        },
      })
      prepopulate()
    },

    /**
     * Disable demo mode
     */
    disable: () => {
      enabled = false
      client.setDefaultOptions({
        ...client.getDefaultOptions(),
        queries: {
          ...client.getDefaultOptions().queries,
          staleTime: queryClientConfig.defaultOptions?.queries?.staleTime,
          retry: queryClientConfig.defaultOptions?.queries?.retry,
        },
      })
    },

    /**
     * Check if demo mode is enabled
     */
    isEnabled,

    /**
     * Get the fixture map
     */
    getFixtures: () => fixtures,

    /**
     * Add or update a fixture
     */
    setFixture: (pattern: QueryKey, handler: QueryFixtureHandler) => {
      fixtures.set(pattern, handler)
    },

    /**
     * Remove a fixture
     */
    removeFixture: (pattern: QueryKey) => {
      fixtures.delete(pattern)
    },

    /**
     * Clear all query cache
     */
    clearCache: () => {
      client.clear()
    },

    /**
     * Invalidate all queries
     */
    invalidateAll: () => {
      client.invalidateQueries()
    },
  }
}

export type DemoQueryClient = ReturnType<typeof createDemoQueryClient>
