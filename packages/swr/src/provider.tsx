'use client'

import { useMemo, useRef, useCallback } from 'react'
import { SWRConfig } from 'swr'
import type { QueryKey } from '@demokit-ai/core'
import { DemoSWRContext } from './context'
import { createDemoFetcher, defaultFetcher } from './fetcher'
import { createDemoMiddleware } from './middleware'
import { normalizeFixtureMap } from './matcher'
import type {
  DemoSWRProviderProps,
  SWRFixtureHandler,
  SWRFixtureMap,
  SWRMutationFixtureHandler,
  SWRMutationFixtureMap,
  DemoSWRState,
} from './types'

/**
 * Provider component for DemoKit SWR integration
 *
 * Wraps SWRConfig and intercepts fetches when demo mode is enabled.
 * Uses SWR's middleware pattern for maximum flexibility.
 *
 * @example
 * // With object-based fixtures
 * <DemoSWRProvider
 *   enabled={true}
 *   fixtures={{
 *     '/api/users': [{ id: '1', name: 'Demo User' }],
 *     '["/api/users", ":id"]': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *     '["/api/projects", { status: ":status" }]': ({ params }) => [
 *       { id: '1', name: 'Project', status: params.status },
 *     ],
 *   }}
 *   delay={100}
 * >
 *   <App />
 * </DemoSWRProvider>
 *
 * @example
 * // With Map-based fixtures
 * const fixtures = new Map([
 *   [['/api/users'], [{ id: '1', name: 'Demo User' }]],
 *   [['/api/users', ':id'], ({ params }) => ({ id: params.id, name: 'Demo User' })],
 * ])
 *
 * <DemoSWRProvider enabled={true} fixtures={fixtures}>
 *   <App />
 * </DemoSWRProvider>
 *
 * @example
 * // With cache seeding via fallback
 * <DemoSWRProvider
 *   enabled={true}
 *   fixtures={fixtures}
 *   fallback={{
 *     '/api/users': [{ id: '1', name: 'Pre-loaded User' }],
 *   }}
 * >
 *   <App />
 * </DemoSWRProvider>
 */
export function DemoSWRProvider({
  children,
  fixtures = new Map(),
  mutations = new Map(),
  enabled = false,
  delay = 0,
  fallback = {},
  swrConfig = {},
}: DemoSWRProviderProps) {
  // Normalize fixtures
  const fixturesRef = useRef<SWRFixtureMap>(normalizeFixtureMap(fixtures))
  const mutationFixturesRef = useRef<SWRMutationFixtureMap>(
    mutations instanceof Map ? mutations : new Map(Object.entries(mutations))
  )

  const isDemoMode = enabled

  // Create demo middleware
  const demoMiddleware = useMemo(
    () =>
      createDemoMiddleware({
        fixtures: fixturesRef.current,
        isEnabled: () => isDemoMode,
        delay,
      }),
    [isDemoMode, delay]
  )

  // Create demo fetcher (for direct use)
  const demoFetcher = useMemo(
    () =>
      createDemoFetcher({
        fixtures: fixturesRef.current,
        isEnabled: () => isDemoMode,
        delay,
        fallbackFetcher: defaultFetcher,
      }),
    [isDemoMode, delay]
  )

  // Build fallback data from static fixtures + provided fallback
  const combinedFallback = useMemo(() => {
    if (!isDemoMode) return swrConfig.fallback || {}

    const staticFixtures: Record<string, unknown> = {}

    // Add static fixture values to fallback
    for (const [pattern, handler] of fixturesRef.current) {
      if (typeof handler !== 'function') {
        // Use the pattern as key for static fixtures
        const key = pattern.length === 1 ? String(pattern[0]) : JSON.stringify(pattern)
        staticFixtures[key] = handler
      }
    }

    return {
      ...staticFixtures,
      ...fallback,
      ...(swrConfig.fallback || {}),
    }
  }, [isDemoMode, fallback, swrConfig.fallback])

  // Build SWR config
  const config = useMemo(
    () => ({
      ...swrConfig,
      use: [...(swrConfig.use || []), demoMiddleware],
      fallback: combinedFallback,
      // In demo mode, don't retry and keep data fresh longer
      ...(isDemoMode
        ? {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            shouldRetryOnError: false,
          }
        : {}),
    }),
    [swrConfig, demoMiddleware, combinedFallback, isDemoMode]
  )

  // Context value with manipulation methods
  const getFetcher = useCallback(() => demoFetcher, [demoFetcher])
  const getMiddleware = useCallback(() => demoMiddleware, [demoMiddleware])

  const contextValue = useMemo<DemoSWRState>(
    () => ({
      isDemoMode,

      setFixture: (pattern: QueryKey, handler: SWRFixtureHandler) => {
        fixturesRef.current.set(pattern, handler)
      },

      removeFixture: (pattern: QueryKey) => {
        fixturesRef.current.delete(pattern)
      },

      setMutationFixture: (name: string, handler: SWRMutationFixtureHandler) => {
        mutationFixturesRef.current.set(name, handler)
      },

      removeMutationFixture: (name: string) => {
        mutationFixturesRef.current.delete(name)
      },

      getFetcher,
      getMiddleware,
    }),
    [isDemoMode, getFetcher, getMiddleware]
  )

  return (
    <DemoSWRContext.Provider value={contextValue}>
      <SWRConfig value={config}>{children}</SWRConfig>
    </DemoSWRContext.Provider>
  )
}
