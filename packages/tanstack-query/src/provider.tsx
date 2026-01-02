'use client'

import { useMemo, useRef, useEffect } from 'react'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@demokit-ai/core'
import { DemoQueryContext } from './context'
import { createDemoQueryFn, createDemoQueryClient } from './client'
import { normalizeFixtureMap } from './matcher'
import type {
  DemoQueryProviderProps,
  QueryFixtureHandler,
  QueryFixtureMap,
  MutationFixtureHandler,
  MutationFixtureMap,
  DemoQueryState,
} from './types'

/**
 * Internal provider component that wraps existing QueryClient
 */
function DemoQueryProviderInner({
  children,
  queries = new Map(),
  mutations = new Map(),
  enabled: enabledProp,
  delay = 0,
  staleTime = Infinity,
}: Omit<DemoQueryProviderProps, 'client'>) {
  const queryClient = useQueryClient()
  const fixturesRef = useRef<QueryFixtureMap>(normalizeFixtureMap(queries))
  const mutationFixturesRef = useRef<MutationFixtureMap>(
    mutations instanceof Map ? mutations : new Map(Object.entries(mutations))
  )

  // Use enabled prop directly - demo mode is controlled by parent
  const isDemoMode = enabledProp ?? false

  // Create demo-aware query function
  const demoQueryFn = useMemo(
    () =>
      createDemoQueryFn({
        fixtures: fixturesRef.current,
        delay,
        isEnabled: () => isDemoMode,
      }),
    [delay, isDemoMode]
  )

  // Update query client defaults when demo mode changes
  useEffect(() => {
    if (isDemoMode) {
      queryClient.setDefaultOptions({
        ...queryClient.getDefaultOptions(),
        queries: {
          ...queryClient.getDefaultOptions().queries,
          queryFn: demoQueryFn,
          staleTime,
          retry: false,
        },
      })
    }
  }, [isDemoMode, demoQueryFn, queryClient, staleTime])

  // Create context value
  const contextValue = useMemo<DemoQueryState>(
    () => ({
      isDemoMode,

      setQueryFixture: (pattern: QueryKey, handler: QueryFixtureHandler) => {
        fixturesRef.current.set(pattern, handler)
      },

      removeQueryFixture: (pattern: QueryKey) => {
        fixturesRef.current.delete(pattern)
      },

      setMutationFixture: (name: string, handler: MutationFixtureHandler) => {
        mutationFixturesRef.current.set(name, handler)
      },

      removeMutationFixture: (name: string) => {
        mutationFixturesRef.current.delete(name)
      },

      invalidateAll: () => {
        queryClient.invalidateQueries()
      },

      resetCache: () => {
        queryClient.clear()
      },
    }),
    [isDemoMode, queryClient]
  )

  return (
    <DemoQueryContext.Provider value={contextValue}>
      {children}
    </DemoQueryContext.Provider>
  )
}

/**
 * Provider component for DemoKit TanStack Query integration
 *
 * Wraps QueryClientProvider and intercepts queries when demo mode is enabled.
 *
 * @example
 * // With new QueryClient
 * <DemoQueryProvider
 *   queries={{
 *     '["users"]': [{ id: '1', name: 'Demo User' }],
 *     '["users", ":id"]': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *   }}
 * >
 *   <App />
 * </DemoQueryProvider>
 *
 * @example
 * // With existing QueryClient
 * const queryClient = new QueryClient()
 *
 * <DemoQueryProvider client={queryClient} queries={...}>
 *   <App />
 * </DemoQueryProvider>
 *
 * @example
 * // With DemoKitProvider (auto-detects demo mode)
 * <DemoKitProvider fixtures={...}>
 *   <DemoQueryProvider queries={...}>
 *     <App />
 *   </DemoQueryProvider>
 * </DemoKitProvider>
 */
export function DemoQueryProvider({
  children,
  client,
  ...config
}: DemoQueryProviderProps) {
  // If no client provided, create one
  const { client: demoClient } = useMemo(() => {
    if (client) {
      return { client }
    }
    return createDemoQueryClient(config)
  }, [client, config.enabled])

  const queryClient = client ?? demoClient

  return (
    <QueryClientProvider client={queryClient}>
      <DemoQueryProviderInner {...config}>{children}</DemoQueryProviderInner>
    </QueryClientProvider>
  )
}
