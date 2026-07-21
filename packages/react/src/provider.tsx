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
  saveDemoState,
  createSessionState,
  type DemoInterceptor,
  type SessionState,
  type FixtureMap,
  type DemoRuntime,
  type CoverageReporter,
  type ResolveDeps,
} from '@demokit-ai/core'
import { DemoModeContext } from './context'
import type { DemoKitProviderProps, DemoModeContextValue, DemoKitStatus } from './types'
import { MutationBlockedToast } from './mutation-toast'
import type { MswTransport } from '@demokit-ai/msw-transport'

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
  transport = 'fetch',
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

  // MSW transport instance (Task 4, `transport: 'msw'`). No interceptor is
  // ever constructed when transport === 'msw' — there is no global fetch
  // patch under msw, only the worker's request handler.
  const mswTransportRef = useRef<MswTransport | null>(null)

  // Mirrors the fetch interceptor's own internal `enabled` bookkeeping.
  // Under msw there's no interceptor object to hold this, so the provider
  // owns it directly. A plain ref (not React state) so enable()/disable()/
  // toggle() read a synchronously-current value the moment ensureTransport()
  // resolves — the same way interceptorRef.current.enable() reads the
  // interceptor's own closure variable rather than a (possibly stale) render.
  const mswEnabledRef = useRef(false)

  // The current merged fixtures, read by buildDeps() so both transports
  // resolve requests against the exact same fixture map. Set at construction
  // time (setupInterceptor / setupMswTransport) and kept current by the
  // fixtures-update effect thereafter.
  const mergedFixturesRef = useRef<FixtureMap>({})

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
   * Builds the `ResolveDeps` object shared by both transports (fetch
   * interceptor and MSW), so callback/coverage wiring can never drift
   * between them: fixtures, baseUrl, pathAliases, warnOnCatchAll,
   * unmatchedMutations, the provider-owned session, and the same wrapped
   * mutation/coverage callbacks (blocked-mutation toast + coverage
   * reporter's `record()` calls) that Task 2 preserved. One function, both
   * transports — `setupInterceptor` spreads this into `createDemoInterceptor`
   * config, and the msw branch passes it straight to `setDeps()`.
   *
   * Reads the current merged fixtures from `mergedFixturesRef` rather than
   * taking them as a parameter: both branches keep that ref current (at
   * construction, and on every fixtures-change), so there's one source of
   * truth for "what's currently mocked" no matter which transport is active.
   *
   * Deliberately a plain function, not a memoized `useCallback`: every
   * caller already lists the underlying props (baseUrl, pathAliases, etc.)
   * in its own dependency array, so there's nothing to gain from memoizing
   * this indirection — it always wants the live values from the current
   * render anyway.
   */
  const buildDeps = (): ResolveDeps => ({
    fixtures: mergedFixturesRef.current,
    baseUrl: baseUrl ?? 'http://localhost',
    pathAliases,
    // Same default the core interceptor applies internally when this isn't
    // provided (dev-mode-on, prod-off) — mirrored here so ResolveDeps (which
    // requires a concrete boolean) matches the interceptor path exactly.
    warnOnCatchAll: warnOnCatchAll ?? (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'),
    unmatchedMutations: unmatchedMutations ?? 'block',
    session: sessionRef.current as SessionState,
    onMutationIntercepted,
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
  })

  /**
   * Create and configure the demo interceptor
   */
  const setupInterceptor = useCallback(
    (mergedFixtures: FixtureMap) => {
      mergedFixturesRef.current = mergedFixtures
      interceptorRef.current?.destroy()

      interceptorRef.current = createDemoInterceptor({
        ...buildDeps(),
        storageKey,
        initialEnabled,
        detection: effectivePreviewToken
          ? { ...detection, queryParams: [...(detection?.queryParams ?? ['demo']), 'demo-preview'] }
          : detection,
        canDisable,
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
   * Constructs the MSW transport (Task 4, `transport: 'msw'`). The dynamic
   * import only happens here — inside `ensureTransport`'s demo-gated call
   * path — so users who never set `transport: 'msw'`, or whose demo mode
   * never activates, never load msw code (spec §10's "demo-gated dynamic
   * import", extended to the transport choice itself).
   *
   * Mirrors `setupInterceptor`'s construction contract: computes its own
   * enabled/isPublicDemo state from detection + storage — independent of
   * *why* `ensureTransport` was invoked (mount-time restoration of a
   * persisted session vs. an explicit `enable()`/`toggle()` bootstrapping a
   * not-yet-constructed transport) — then builds from the exact same
   * `buildDeps()` the fetch interceptor uses, so both transports resolve
   * identically.
   *
   * `start()` rejection (missing/stale `mockServiceWorker.js`, timeout, ...)
   * never half-mocks: the transport is stopped and discarded — never
   * assigned to `mswTransportRef` — and status becomes 'unavailable'.
   */
  const setupMswTransport = useCallback(async (mergedFixtures: FixtureMap): Promise<void> => {
    mergedFixturesRef.current = mergedFixtures

    const { createMswTransport } = await import('@demokit-ai/msw-transport')
    const transportInstance = createMswTransport()

    const effectiveDetection = effectivePreviewToken
      ? { ...detection, queryParams: [...(detection?.queryParams ?? ['demo']), 'demo-preview'] }
      : detection
    const detectionResult = detectDemoMode(effectiveDetection)
    const enabledInitially = detectionResult.detected || (initialEnabled ?? loadDemoState(storageKey))

    transportInstance.setDeps(buildDeps())

    try {
      await transportInstance.start()
    } catch {
      // Never half-mock (spec §7/§10): stop and discard rather than retain
      // a half-started transport, and report the same 'unavailable' status
      // the remote-fetch-with-no-cache path uses.
      transportInstance.stop()
      setIsHydrated(true)
      setStatus('unavailable')
      return
    }

    // The construction-time enabled state mirrors detection/storage exactly
    // like the interceptor's own internal `enabled` variable — an explicit
    // enable()/disable()/toggle() call still runs afterward (see `enable`
    // below) and fires its side effects normally if this leaves it off.
    if (!enabledInitially) {
      transportInstance.setDeps(null)
    }

    mswEnabledRef.current = enabledInitially
    mswTransportRef.current = transportInstance
    setIsDemoMode(enabledInitially)
    setIsPublicDemo(detectionResult.isPublicDemo)
    setIsHydrated(true)
    setStatus('ready')
  }, [detection, effectivePreviewToken, initialEnabled, storageKey, baseUrl, pathAliases, warnOnCatchAll, unmatchedMutations, onMutationIntercepted, onMutationBlocked, showBlockedToast])

  /**
   * Transport-dispatching construction: routes to the fetch interceptor or
   * the MSW transport depending on the `transport` prop. Both
   * `ensureTransport` and `fetchAndSetup` (remote mode) call this rather
   * than `setupInterceptor` directly, so the transport choice is made in
   * exactly one place.
   */
  const setupTransport = useCallback(
    (mergedFixtures: FixtureMap): void | Promise<void> => {
      if (transport === 'msw') {
        return setupMswTransport(mergedFixtures)
      }
      setupInterceptor(mergedFixtures)
    },
    [transport, setupMswTransport, setupInterceptor]
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
      await setupTransport(remoteFixtures)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setRemoteError(err)
      onRemoteError?.(err)

      // If we have local fixtures, still set up with those
      if (fixtures && Object.keys(fixtures).length > 0) {
        await setupTransport(fixtures)
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
    setupTransport,
    reportCoverage,
  ])

  // Store refetch function in ref for context access
  refetchFnRef.current = fetchAndSetup

  /**
   * Lazily construct the transport (spec §10): fetch cloud config, build
   * runtime/fixtures, and construct the fetch interceptor or MSW transport
   * (per the `transport` prop) with the provider-owned session — or fall
   * back to local fixtures, or report 'unavailable'.
   *
   * Idempotent and single-flight via `bootstrapRef`: concurrent callers
   * (mount + an early `enable()`) share one in-flight promise, and once the
   * active transport exists this resolves immediately without redoing work.
   */
  const ensureTransport = useCallback((): Promise<void> => {
    const alreadyConstructed = transport === 'msw'
      ? mswTransportRef.current !== null
      : interceptorRef.current !== null
    if (alreadyConstructed) return Promise.resolve()
    if (bootstrapRef.current) return bootstrapRef.current

    setStatus('loading')

    const run = (async () => {
      if (source?.apiKey) {
        // Remote mode: fetch from cloud
        await fetchAndSetup()
      } else if (fixtures) {
        // Local mode: use provided fixtures
        await setupTransport(fixtures)
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
  }, [transport, source, fixtures, fetchAndSetup, setupTransport])

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
      // msw branch (Task 4): no interceptor exists, so tear down the worker
      // directly instead.
      mswTransportRef.current?.stop()
      mswTransportRef.current = null
      mswEnabledRef.current = false
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

    let merged: FixtureMap | null = null
    if (source?.apiKey && remoteFixturesRef.current) {
      // Remote mode: merge new local overrides with cached remote fixtures
      merged = { ...remoteFixturesRef.current, ...fixtures }
    } else if (fixtures) {
      // Local mode: update fixtures
      merged = fixtures
    }
    if (!merged) return

    mergedFixturesRef.current = merged
    if (transport === 'msw') {
      // Only push fresh deps while mocking is actually active — while
      // disabled, deps stay null and the next enable()/toggle() reads
      // mergedFixturesRef.current (already updated above) via buildDeps().
      if (mswEnabledRef.current) {
        mswTransportRef.current?.setDeps(buildDeps())
      }
    } else {
      interceptorRef.current?.setFixtures(merged)
    }
  }, [fixtures, isHydrated, isLoading, source, transport])

  // --- msw-branch enable/disable/toggle (Task 4) ---
  // There is no interceptor object under msw to own "enabled" or fire
  // onEnable/onDisable side effects, so the provider does both directly:
  // deps present = mocking active, deps null = passthrough (mirrors
  // handler.ts's `if (!deps) return passthrough()`), and the same
  // banner/storage/query-invalidation/redirect side effects the interceptor's
  // onEnable/onDisable trigger.
  const mswSetEnabled = useCallback(
    (next: boolean) => {
      if (mswEnabledRef.current === next) return
      mswEnabledRef.current = next
      mswTransportRef.current?.setDeps(next ? buildDeps() : null)
      saveDemoState(storageKey, next)
      setIsDemoMode(next)
      onDemoModeChange?.(next)
      externalQueryClient?.invalidateQueries()
      handleUrlRedirect(next)
    },
    [storageKey, onDemoModeChange, externalQueryClient, handleUrlRedirect, baseUrl, pathAliases, warnOnCatchAll, unmatchedMutations, onMutationIntercepted, onMutationBlocked, showBlockedToast]
  )

  const mswEnable = useCallback(() => {
    mswSetEnabled(true)
  }, [mswSetEnabled])

  const mswDisable = useCallback((): boolean | string => {
    if (!mswEnabledRef.current) return true
    if (canDisable) {
      const result = canDisable()
      if (result !== true) return result
    }
    mswSetEnabled(false)
    return true
  }, [canDisable, mswSetEnabled])

  const mswToggle = useCallback(() => {
    if (mswEnabledRef.current) {
      mswDisable()
    } else {
      mswEnable()
    }
  }, [mswEnable, mswDisable])

  // Async-aware (spec §10): if the transport hasn't been constructed yet,
  // bootstrap it lazily before enabling. Callers that don't await this still
  // work fine — `enable(): void` on the context type accepts a Promise-returning
  // implementation.
  const enable = useCallback(async () => {
    if (transport === 'msw') {
      if (!mswTransportRef.current) {
        await ensureTransport()
      }
      mswEnable()
      return
    }
    if (!interceptorRef.current) {
      await ensureTransport()
    }
    interceptorRef.current?.enable()
  }, [transport, ensureTransport, mswEnable])

  const disable = useCallback((): boolean | string => {
    if (transport === 'msw') {
      return mswDisable()
    }
    return interceptorRef.current?.disable() ?? true
  }, [transport, mswDisable])

  const toggle = useCallback(async () => {
    if (transport === 'msw') {
      if (!mswTransportRef.current) {
        await ensureTransport()
      }
      mswToggle()
      return
    }
    if (!interceptorRef.current) {
      await ensureTransport()
    }
    interceptorRef.current?.toggle()
  }, [transport, ensureTransport, mswToggle])

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
    if (transport === 'msw') {
      // No interceptor's onSessionReset to wire through — the provider owns
      // both the session and the runtime reset directly.
      sessionRef.current?.clear()
      runtimeRef.current?.reset()
      return
    }
    interceptorRef.current?.resetSession()
  }, [transport])

  const getSession = useCallback((): SessionState | null => {
    if (transport === 'msw') {
      return mswTransportRef.current ? sessionRef.current : null
    }
    return interceptorRef.current?.getSession() ?? null
  }, [transport])

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
