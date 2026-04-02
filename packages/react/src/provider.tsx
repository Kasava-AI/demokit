'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  createDemoInterceptor,
  fetchCloudFixtures,
  createRemoteFixtures,
  type DemoInterceptor,
  type SessionState,
  type FixtureMap,
} from '@demokit-ai/core'
import { DemoModeContext } from './context'
import type { DemoKitProviderProps, DemoModeContextValue } from './types'

/**
 * Provider component that enables demo mode functionality
 *
 * Wraps your app to provide demo mode state and controls.
 * Handles SSR hydration safely and persists state to localStorage.
 *
 * Supports two modes:
 * 1. **Local mode**: Pass `fixtures` prop with pattern handlers
 * 2. **Remote mode**: Pass `source` to fetch from DemoKit Cloud
 *
 * @example Local mode
 * ```tsx
 * const fixtures = {
 *   'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 *   'GET /api/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 * }
 *
 * function App() {
 *   return (
 *     <DemoKitProvider fixtures={fixtures}>
 *       <YourApp />
 *     </DemoKitProvider>
 *   )
 * }
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
 * function App() {
 *   return (
 *     <DemoKitProvider
 *       source={source}
 *       loadingFallback={<LoadingSpinner />}
 *     >
 *       <YourApp />
 *     </DemoKitProvider>
 *   )
 * }
 * ```
 */
export function DemoKitProvider({
  children,
  fixtures,
  // Remote config
  source,
  onRemoteLoad,
  onRemoteError,
  loadingFallback = null,
  errorFallback,
  // Standard props
  storageKey = 'demokit-mode',
  initialEnabled = false,
  onDemoModeChange,
  baseUrl,
  // Detection & guards
  detection,
  canDisable,
  onMutationIntercepted,
  pathAliases,
  warnOnCatchAll,
  // Query cache
  queryClient: externalQueryClient,
  // URL redirects
  urlRedirects,
}: DemoKitProviderProps) {
  // Start with initialEnabled for SSR to avoid hydration mismatch
  const [isDemoMode, setIsDemoMode] = useState(initialEnabled)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isPublicDemo, setIsPublicDemo] = useState(false)

  // Remote loading state
  const [isLoading, setIsLoading] = useState(!!source?.apiKey)
  const [remoteError, setRemoteError] = useState<Error | null>(null)
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null)

  // Keep a ref to the interceptor instance
  const interceptorRef = useRef<DemoInterceptor | null>(null)

  // Track if we've initialized
  const initializedRef = useRef(false)

  // Store loaded remote fixtures for refetch merging
  const remoteFixturesRef = useRef<FixtureMap | null>(null)

  // Store the refetch function for context
  const refetchFnRef = useRef<(() => Promise<void>) | null>(null)

  /**
   * Handle URL redirects when demo mode toggles.
   * Matches current URL against urlRedirects config and navigates if needed.
   */
  const handleUrlRedirect = useCallback((enteringDemo: boolean) => {
    if (!urlRedirects?.length || typeof window === 'undefined') return

    const path = window.location.pathname
    const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

    for (const redirect of urlRedirects) {
      // Convert pattern like '/repositories/:id' to regex
      const patternRegex = new RegExp(
        '^' + redirect.pattern
          .replace(/:[a-zA-Z_]+/g, '([^/]+)')
          .replace(/\*/g, '.*') + '$'
      )

      if (enteringDemo) {
        // Entering demo: if URL has a real UUID, redirect to demo URL
        if (patternRegex.test(path) && UUID_REGEX.test(path)) {
          window.location.replace(redirect.demoUrl)
          return
        }
      } else {
        // Exiting demo: if URL matches the demo URL, redirect to exit URL
        if (path.startsWith(redirect.demoUrl) || path === redirect.demoUrl) {
          const exitUrl = redirect.exitUrl || redirect.pattern.replace(/\/:.*$/, '')
          window.location.replace(exitUrl)
          return
        }
      }
    }
  }, [urlRedirects])

  /**
   * Create and configure the demo interceptor
   */
  const setupInterceptor = useCallback(
    (mergedFixtures: FixtureMap) => {
      interceptorRef.current?.destroy()

      interceptorRef.current = createDemoInterceptor({
        fixtures: mergedFixtures,
        storageKey,
        initialEnabled,
        baseUrl,
        detection,
        canDisable,
        onMutationIntercepted,
        pathAliases,
        warnOnCatchAll,
        onEnable: () => {
          setIsDemoMode(true)
          onDemoModeChange?.(true)
          // Invalidate query cache so real data is replaced with demo data
          externalQueryClient?.invalidateQueries()
          // Redirect to demo URL if configured
          handleUrlRedirect(true)
        },
        onDisable: () => {
          setIsDemoMode(false)
          onDemoModeChange?.(false)
          // Invalidate query cache so demo data is replaced with real data
          externalQueryClient?.invalidateQueries()
          // Redirect away from demo URL if configured
          handleUrlRedirect(false)
        },
      })

      // Sync state from storage after hydration
      const storedState = interceptorRef.current.isEnabled()
      setIsDemoMode(storedState)
      setIsPublicDemo(interceptorRef.current.isPublicDemo())
      setIsHydrated(true)
    },
    [storageKey, initialEnabled, baseUrl, onDemoModeChange, detection, canDisable, onMutationIntercepted, pathAliases, warnOnCatchAll, externalQueryClient, handleUrlRedirect]
  )

  /**
   * Fetch fixtures from DemoKit Cloud and set up interceptor
   */
  const fetchAndSetup = useCallback(async () => {
    if (!source?.apiKey) return

    setIsLoading(true)
    setRemoteError(null)

    try {
      const response = await fetchCloudFixtures({
        apiKey: source.apiKey,
        apiUrl: source.apiUrl,
        timeout: source.timeout,
        retry: source.retry,
        maxRetries: source.maxRetries,
        onLoad: onRemoteLoad,
        onError: onRemoteError,
      })

      // Build fixtures from remote response with local overrides
      const remoteFixtures = createRemoteFixtures(response, fixtures)
      remoteFixturesRef.current = remoteFixtures

      setRemoteVersion(response.version)
      setupInterceptor(remoteFixtures)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setRemoteError(err)
      onRemoteError?.(err)

      // If we have local fixtures, still set up with those
      if (fixtures && Object.keys(fixtures).length > 0) {
        setupInterceptor(fixtures)
      } else {
        setIsHydrated(true)
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    source,
    fixtures,
    onRemoteLoad,
    onRemoteError,
    setupInterceptor,
  ])

  // Store refetch function in ref for context access
  refetchFnRef.current = fetchAndSetup

  // Initialize on mount
  useEffect(() => {
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    if (source?.apiKey) {
      // Remote mode: fetch from cloud
      fetchAndSetup()
    } else if (fixtures) {
      // Local mode: use provided fixtures
      setupInterceptor(fixtures)
    } else {
      // No fixtures at all - just mark as hydrated
      setIsHydrated(true)
      setIsLoading(false)
    }

    return () => {
      interceptorRef.current?.destroy()
      interceptorRef.current = null
      initializedRef.current = false
    }
  }, []) // Empty deps - only run once on mount

  // Update fixtures if they change (local mode or overrides)
  useEffect(() => {
    if (!isHydrated || isLoading) return

    if (source?.apiKey && remoteFixturesRef.current) {
      // Remote mode: merge new local overrides with cached remote fixtures
      const merged = { ...remoteFixturesRef.current, ...fixtures }
      interceptorRef.current?.setFixtures(merged)
    } else if (fixtures) {
      // Local mode: update fixtures
      interceptorRef.current?.setFixtures(fixtures)
    }
  }, [fixtures, isHydrated, isLoading, source])

  const enable = useCallback(() => {
    interceptorRef.current?.enable()
  }, [])

  const disable = useCallback((): boolean | string => {
    return interceptorRef.current?.disable() ?? true
  }, [])

  const toggle = useCallback(() => {
    interceptorRef.current?.toggle()
  }, [])

  const setDemoMode = useCallback((enabled: boolean) => {
    if (enabled) {
      interceptorRef.current?.enable()
    } else {
      interceptorRef.current?.disable()
    }
  }, [])

  const resetSession = useCallback(() => {
    interceptorRef.current?.resetSession()
  }, [])

  const getSession = useCallback((): SessionState | null => {
    return interceptorRef.current?.getSession() ?? null
  }, [])

  const refetch = useCallback(async (): Promise<void> => {
    if (!source?.apiKey) {
      console.warn('[DemoKit] refetch() called but no source provided')
      return
    }
    await refetchFnRef.current?.()
  }, [source])

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode,
      isHydrated,
      isPublicDemo,
      isLoading,
      remoteError,
      remoteVersion,
      enable,
      disable,
      toggle,
      setDemoMode,
      resetSession,
      getSession,
      refetch,
    }),
    [
      isDemoMode,
      isHydrated,
      isPublicDemo,
      isLoading,
      remoteError,
      remoteVersion,
      enable,
      disable,
      toggle,
      setDemoMode,
      resetSession,
      getSession,
      refetch,
    ]
  )

  // Render loading state
  if (isLoading && source?.apiKey) {
    return (
      <DemoModeContext.Provider value={value}>
        {loadingFallback}
      </DemoModeContext.Provider>
    )
  }

  // Render error state
  if (remoteError && errorFallback) {
    const errorContent =
      typeof errorFallback === 'function'
        ? errorFallback(remoteError)
        : errorFallback

    return (
      <DemoModeContext.Provider value={value}>
        {errorContent}
      </DemoModeContext.Provider>
    )
  }

  return (
    <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
  )
}
