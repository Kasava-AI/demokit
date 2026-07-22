import type {
  DemoKitConfig,
  DemoInterceptor,
  FixtureMap,
  FixtureHandler,
  DetectionConfig,
} from './types'
import { loadDemoState, saveDemoState, DEFAULT_STORAGE_KEY } from './storage'
import { createSessionState, type SessionState } from './session'
import { resolveRequest } from './resolve'

export { demoResponse, isDemoResponse, createMockResponse } from './resolve'
export type { DemoResponseValue } from './resolve'

/**
 * Check if demo mode should be auto-enabled based on detection config
 */
export function detectDemoMode(detection?: DetectionConfig): { detected: boolean; isPublicDemo: boolean } {
  if (!detection || typeof window === 'undefined') {
    return { detected: false, isPublicDemo: false }
  }

  // Check subdomain match
  if (detection.subdomains?.length) {
    const hostname = window.location.hostname
    if (detection.subdomains.some((sub) => hostname === sub)) {
      return { detected: true, isPublicDemo: true }
    }
  }

  // Check query parameter
  const queryParams = detection.queryParams ?? ['demo']
  const searchParams = new URLSearchParams(window.location.search)
  for (const param of queryParams) {
    const value = searchParams.get(param)
    if (value !== null && value !== 'false') {
      return { detected: true, isPublicDemo: false }
    }
  }

  return { detected: false, isPublicDemo: false }
}

/**
 * Create a demo interceptor that patches fetch to return mock data
 *
 * @param config - Configuration including fixtures and options
 * @returns Demo interceptor instance with enable/disable controls
 *
 * @example
 * const demo = createDemoInterceptor({
 *   fixtures: {
 *     'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 *     'GET /api/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *     'POST /api/users': ({ body }) => ({ id: 'new', ...body }),
 *   }
 * })
 *
 * demo.enable()   // All matching fetches return mock data
 * demo.disable()  // Back to real API
 */
export function createDemoInterceptor(config: DemoKitConfig): DemoInterceptor {
  const {
    fixtures: initialFixtures,
    storageKey = DEFAULT_STORAGE_KEY,
    onEnable,
    onDisable,
    initialEnabled,
    baseUrl = 'http://localhost',
    detection,
    canDisable,
    onMutationIntercepted,
    pathAliases,
    warnOnCatchAll = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production',
    unmatchedMutations = 'block',
    onMutationBlocked,
    onSessionReset,
    onUnmatchedRequest,
    onProjectionError,
    controlPlaneOrigin,
  } = config

  // Auto-detect demo mode from URL
  const detectionResult = detectDemoMode(detection)

  // Track state — detection overrides storage/initialEnabled
  let enabled = detectionResult.detected || (initialEnabled ?? loadDemoState(storageKey))
  let currentFixtures: FixtureMap = { ...initialFixtures }

  // Create session state (in-memory, resets on page refresh) — or use the caller's.
  // An injected session is the injector's to manage: destroy() must not clear
  // state a second transport may still be sharing (only a self-created session
  // is torn down on destroy; resetSession() is an explicit user action and
  // always clears, regardless of ownership).
  const ownsSession = !config.session
  let sessionState: SessionState = config.session ?? createSessionState()

  // Store original fetch
  let originalFetch: typeof fetch | null = null
  let isPatched = false

  /**
   * Patch global fetch to intercept requests
   */
  function patchFetch(): void {
    if (isPatched || typeof globalThis.fetch !== 'function') {
      return
    }

    originalFetch = globalThis.fetch

    globalThis.fetch = async function interceptedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      // If demo mode is disabled, pass through
      if (!enabled) {
        return originalFetch!(input, init)
      }

      const outcome = await resolveRequest(
        {
          fixtures: currentFixtures,
          baseUrl,
          pathAliases,
          warnOnCatchAll,
          unmatchedMutations,
          session: sessionState,
          onMutationIntercepted,
          onMutationBlocked,
          onUnmatchedRequest,
          onProjectionError,
          controlPlaneOrigin,
        },
        input,
        init
      )

      return outcome.kind === 'passthrough' ? originalFetch!(input, init) : outcome.response
    }

    isPatched = true
  }

  /**
   * Restore original fetch
   */
  function restoreFetch(): void {
    if (!isPatched || !originalFetch) {
      return
    }

    globalThis.fetch = originalFetch
    originalFetch = null
    isPatched = false
  }

  // Patch fetch immediately
  patchFetch()

  return {
    enable(): void {
      if (enabled) return

      enabled = true
      saveDemoState(storageKey, true)
      onEnable?.()
    },

    disable(): boolean | string {
      if (!enabled) return true

      if (canDisable) {
        const result = canDisable()
        if (result !== true) {
          // Prevented — return the reason (false or string message)
          return result
        }
      }

      enabled = false
      saveDemoState(storageKey, false)
      onDisable?.()
      return true
    },

    isEnabled(): boolean {
      return enabled
    },

    isPublicDemo(): boolean {
      return detectionResult.isPublicDemo
    },

    toggle(): boolean {
      if (enabled) {
        this.disable()
      } else {
        this.enable()
      }
      return enabled
    },

    setFixtures(fixtures: FixtureMap): void {
      currentFixtures = { ...fixtures }
    },

    addFixture(pattern: string, handler: FixtureHandler): void {
      currentFixtures[pattern] = handler
    },

    removeFixture(pattern: string): void {
      delete currentFixtures[pattern]
    },

    resetSession(): void {
      sessionState.clear()
      onSessionReset?.()
    },

    getSession(): SessionState {
      return sessionState
    },

    destroy(): void {
      restoreFetch()
      enabled = false
      // Only clear a session this interceptor created itself — an injected
      // session belongs to whoever constructed it and may still be in use by
      // another transport.
      if (ownsSession) {
        sessionState.clear()
      }
    },
  }
}
