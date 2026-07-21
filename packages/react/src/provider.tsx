'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  createDemoInterceptor,
  fetchCloudFixtures,
  createRemoteFixtures,
  createDemoRuntime,
  createMemoryStorage,
  mergeFixtures,
  createCoverageReporter,
  detectDemoMode,
  loadDemoState,
  createSessionState,
  type DemoInterceptor,
  type SessionState,
  type FixtureMap,
  type DemoRuntime,
  type CoverageReporter,
} from '@demokit-ai/core'
import { DemoModeContext } from './context'
import type { DemoKitProviderProps, DemoModeContextValue, DemoKitStatus } from './types'
import { MutationBlockedToast } from './mutation-toast'

/** Preview sessions (spec §6): ?demo-preview=<token> on the page URL. */
function readPreviewToken(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('demo-preview')
}

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
  transforms,
  onRemoteLoad,
  onRemoteError,
  loadingFallback = null,
  errorFallback,
  // Standard props
  storageKey = 'demokit-mode',
  // Left un-defaulted deliberately: `initialEnabled ?? loadDemoState(storageKey)`
  // (mirrored below and inside createDemoInterceptor) must be able to tell
  // "not provided" (fall back to persisted state) from an explicit `false`.
  initialEnabled,
  onDemoModeChange,
  baseUrl,
  // Detection & guards
  detection,
  canDisable,
  onMutationIntercepted,
  unmatchedMutations,
  onMutationBlocked,
  showBlockedToast = true,
  pathAliases,
  warnOnCatchAll,
  reportCoverage = true,
  // Query cache
  queryClient: externalQueryClient,
  // URL redirects
  urlRedirects,
}: DemoKitProviderProps) {
  // Start with initialEnabled for SSR to avoid hydration mismatch
  const [isDemoMode, setIsDemoMode] = useState(initialEnabled ?? false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isPublicDemo, setIsPublicDemo] = useState(false)

  // Lazy transport bootstrap status (spec §10). Starts 'idle' — nothing is
  // constructed, no cloud config fetched, until demo mode is actually wanted.
  const [status, setStatus] = useState<DemoKitStatus>('idle')

  // Remote loading state. Never assume a fetch is happening just because a
  // source was configured — the fetch itself is gated behind demoWanted.
  const [isLoading, setIsLoading] = useState(false)
  const [remoteError, setRemoteError] = useState<Error | null>(null)
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null)

  // Blocked mutation toast state; seq forces a timer reset even when the
  // same request is blocked twice in a row (identical text bails out of setState)
  const [blockedNotice, setBlockedNotice] = useState<{ text: string; seq: number } | null>(null)

  // Keep a ref to the interceptor instance
  const interceptorRef = useRef<DemoInterceptor | null>(null)

  // Track if we've initialized
  const initializedRef = useRef(false)

  // Store loaded remote fixtures for refetch merging
  const remoteFixturesRef = useRef<FixtureMap | null>(null)

  // Store-backed runtime (spec §3), when the payload ships models + relationships
  const runtimeRef = useRef<DemoRuntime | null>(null)

  // Coverage-health reporter (spec §8); remote mode only, never for preview sessions
  const reporterRef = useRef<CoverageReporter | null>(null)

  // Provider-owned session (product call #8): created once per provider
  // instance and injected into the interceptor so a single session survives
  // interceptor rebuilds (refetch, fixture updates). The provider — not the
  // interceptor — clears it on unmount, since an injected session is the
  // injector's to manage (Task 1's ownership rule).
  const sessionRef = useRef<SessionState | null>(null)
  if (sessionRef.current === null) {
    sessionRef.current = createSessionState()
  }

  // In-flight bootstrap promise, for single-flight ensureTransport() calls.
  const bootstrapRef = useRef<Promise<void> | null>(null)

  // Read once — the token lives for the page load, like detection.
  const previewTokenRef = useRef<string | null>(null)
  if (previewTokenRef.current === null) {
    previewTokenRef.current = readPreviewToken() ?? ''
  }
  const previewToken = previewTokenRef.current || null
  // Single source of truth for "is this a preview session": a caller-supplied
  // source.previewToken counts exactly like the URL-derived one, so ephemeral
  // storage and forced demo detection can't be bypassed by setting one but not
  // the other.
  const effectivePreviewToken = source?.previewToken ?? previewToken

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
        session: sessionRef.current ?? undefined,
        detection: effectivePreviewToken
          ? { ...detection, queryParams: [...(detection?.queryParams ?? ['demo']), 'demo-preview'] }
          : detection,
        canDisable,
        onMutationIntercepted,
        unmatchedMutations,
        onMutationBlocked: (ctx) => {
          onMutationBlocked?.(ctx)
          reporterRef.current?.record({ type: 'blocked_mutation', method: ctx.method, path: ctx.pathname })
          if (showBlockedToast) {
            setBlockedNotice((prev) => ({
              text: `${ctx.method} ${ctx.pathname}`,
              seq: (prev?.seq ?? 0) + 1,
            }))
          }
        },
        onUnmatchedRequest: (ctx) => {
          reporterRef.current?.record({ type: 'unmatched_request', method: ctx.method, path: ctx.pathname })
        },
        onProjectionError: (ctx) => {
          reporterRef.current?.record({ type: 'projection_error', method: ctx.method, path: ctx.pathname })
        },
        pathAliases,
        warnOnCatchAll,
        onSessionReset: () => {
          runtimeRef.current?.reset()
        },
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
      setStatus('ready')
    },
    [storageKey, initialEnabled, baseUrl, onDemoModeChange, detection, effectivePreviewToken, canDisable, onMutationIntercepted, unmatchedMutations, onMutationBlocked, showBlockedToast, pathAliases, warnOnCatchAll, externalQueryClient, handleUrlRedirect]
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
        previewToken: effectivePreviewToken ?? undefined,
        onLoad: onRemoteLoad,
        onError: onRemoteError,
      })

      // Coverage-health reporter (spec §8): remote mode only, never for preview
      // sessions (a preview generation's misses aren't the published app's
      // coverage health).
      reporterRef.current?.destroy()
      reporterRef.current =
        reportCoverage && !effectivePreviewToken
          ? createCoverageReporter({ apiKey: source.apiKey, apiUrl: source.apiUrl })
          : null

      // Store-backed path when the payload ships models + relationships
      // (spec §3); legacy fixture-map path otherwise.
      runtimeRef.current?.destroy()
      const runtime = createDemoRuntime({
        response,
        transforms,
        storageKey,
        // Preview op-log stays in memory: it must not clobber the user's real
        // demo-session op-log (same storage key, different version).
        storage: effectivePreviewToken ? createMemoryStorage() : undefined,
        onUnservedMapping: (info) => {
          if (info.reason === 'unregistered_transform') {
            reporterRef.current?.record({ type: 'unregistered_transform', method: info.method, path: info.pattern })
          }
        },
      })
      runtimeRef.current = runtime
      const remoteFixtures = runtime
        ? mergeFixtures(runtime.fixtures, fixtures)
        : createRemoteFixtures(response, fixtures)
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
        // No cached config to fall back to (spec §10 / §7): never half-mock —
        // report failure instead of silently constructing nothing.
        setIsHydrated(true)
        setStatus('unavailable')
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    source,
    fixtures,
    transforms,
    storageKey,
    effectivePreviewToken,
    onRemoteLoad,
    onRemoteError,
    setupInterceptor,
    reportCoverage,
  ])

  // Store refetch function in ref for context access
  refetchFnRef.current = fetchAndSetup

  /**
   * Lazily construct the transport (spec §10): fetch cloud config, build
   * runtime/fixtures, and construct the interceptor with the provider-owned
   * session — or fall back to local fixtures, or report 'unavailable'.
   *
   * Idempotent and single-flight via `bootstrapRef`: concurrent callers
   * (mount + an early `enable()`) share one in-flight promise, and once an
   * interceptor exists this resolves immediately without redoing work.
   */
  const ensureTransport = useCallback((): Promise<void> => {
    if (interceptorRef.current) return Promise.resolve()
    if (bootstrapRef.current) return bootstrapRef.current

    setStatus('loading')

    const run = (async () => {
      if (source?.apiKey) {
        // Remote mode: fetch from cloud
        await fetchAndSetup()
      } else if (fixtures) {
        // Local mode: use provided fixtures
        setupInterceptor(fixtures)
      } else {
        // Nothing configured to construct — bootstrap is trivially done.
        setIsHydrated(true)
        setIsLoading(false)
        setStatus('ready')
      }
    })()

    bootstrapRef.current = run.finally(() => {
      bootstrapRef.current = null
    })
    return bootstrapRef.current
  }, [source, fixtures, fetchAndSetup, setupInterceptor])

  // Initialize on mount — demo-gated (spec §10): compute demoWanted
  // synchronously and cheaply (no interceptor construction, no fetch patch,
  // no cloud config fetch when it's false) and only bootstrap the transport
  // when demo mode is actually wanted. Non-demo users load nothing.
  useEffect(() => {
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    const demoWanted =
      detectDemoMode(detection).detected || (initialEnabled ?? loadDemoState(storageKey))

    if (demoWanted) {
      void ensureTransport()
    } else {
      // Nothing to construct: render children only. enable()/toggle() still
      // work — they bootstrap the transport lazily on demand.
      setIsHydrated(true)
      setIsLoading(false)
    }

    return () => {
      reporterRef.current?.destroy()
      reporterRef.current = null
      runtimeRef.current?.destroy()
      runtimeRef.current = null
      interceptorRef.current?.destroy()
      interceptorRef.current = null
      // The provider owns the session it injected into the interceptor —
      // an injected session is never cleared by the interceptor's own
      // destroy() (Task 1's ownership rule), so the provider clears it here.
      sessionRef.current?.clear()
      bootstrapRef.current = null
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

  // Async-aware (spec §10): if the transport hasn't been constructed yet,
  // bootstrap it lazily before enabling. Callers that don't await this still
  // work fine — `enable(): void` on the context type accepts a Promise-returning
  // implementation.
  const enable = useCallback(async () => {
    if (!interceptorRef.current) {
      await ensureTransport()
    }
    interceptorRef.current?.enable()
  }, [ensureTransport])

  const disable = useCallback((): boolean | string => {
    return interceptorRef.current?.disable() ?? true
  }, [])

  const toggle = useCallback(async () => {
    if (!interceptorRef.current) {
      await ensureTransport()
    }
    interceptorRef.current?.toggle()
  }, [ensureTransport])

  const setDemoMode = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        void enable()
      } else {
        disable()
      }
    },
    [enable, disable]
  )

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
      status,
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
      status,
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
    <DemoModeContext.Provider value={value}>
      {children}
      {status === 'unavailable' && (
        <div data-testid="demokit-unavailable" role="status">
          Demo mode is unavailable — the demo config could not be loaded.
        </div>
      )}
      {showBlockedToast && (
        <MutationBlockedToast
          key={blockedNotice?.seq ?? 0}
          notice={blockedNotice?.text ?? null}
          onDismiss={() => setBlockedNotice(null)}
        />
      )}
    </DemoModeContext.Provider>
  )
}
