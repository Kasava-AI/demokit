import type {
  DemoKitConfig,
  DemoInterceptor,
  FixtureMap,
  FixtureHandler,
  RequestContext,
  DetectionConfig,
  UnmatchedMutationContext,
} from './types'
import { findMatchingPattern } from './matcher'
import { loadDemoState, saveDemoState, DEFAULT_STORAGE_KEY } from './storage'
import { createSessionState, type SessionState } from './session'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Parse request body based on content type
 */
async function parseRequestBody(
  body: BodyInit | null | undefined,
  headers: Headers
): Promise<unknown> {
  if (!body) {
    return undefined
  }

  const contentType = headers.get('content-type') || ''

  try {
    if (typeof body === 'string') {
      if (contentType.includes('application/json')) {
        return JSON.parse(body)
      }
      return body
    }

    if (body instanceof FormData) {
      const obj: Record<string, unknown> = {}
      body.forEach((value, key) => {
        obj[key] = value
      })
      return obj
    }

    if (body instanceof URLSearchParams) {
      const obj: Record<string, string> = {}
      body.forEach((value, key) => {
        obj[key] = value
      })
      return obj
    }

    if (body instanceof Blob) {
      const text = await body.text()
      if (contentType.includes('application/json')) {
        return JSON.parse(text)
      }
      return text
    }

    if (body instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(body)
      if (contentType.includes('application/json')) {
        return JSON.parse(text)
      }
      return text
    }
  } catch {
    // Return raw body if parsing fails
  }

  return body
}

/**
 * Create a mock Response from fixture data
 */
function createMockResponse(data: unknown, status = 200): Response {
  const body = JSON.stringify(data)
  return new Response(body, {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'application/json',
      'X-DemoKit-Mock': 'true',
    },
  })
}

/**
 * Extract pathname from URL, handling various input types
 */
function extractPathname(input: RequestInfo | URL, baseUrl: string): string {
  try {
    if (typeof input === 'string') {
      // Handle relative URLs
      if (input.startsWith('/')) {
        return input.split('?')[0] || '/'
      }
      return new URL(input, baseUrl).pathname
    }
    if (input instanceof URL) {
      return input.pathname
    }
    if (input instanceof Request) {
      return new URL(input.url, baseUrl).pathname
    }
  } catch {
    // Fallback for malformed URLs
  }
  return '/'
}

/**
 * Extract full URL from input
 */
function extractUrl(input: RequestInfo | URL, baseUrl: string): string {
  try {
    if (typeof input === 'string') {
      if (input.startsWith('/')) {
        return new URL(input, baseUrl).toString()
      }
      return input
    }
    if (input instanceof URL) {
      return input.toString()
    }
    if (input instanceof Request) {
      return input.url
    }
  } catch {
    // Fallback
  }
  return baseUrl
}

/**
 * Check if demo mode should be auto-enabled based on detection config
 */
function detectDemoMode(detection?: DetectionConfig): { detected: boolean; isPublicDemo: boolean } {
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
  } = config

  // Auto-detect demo mode from URL
  const detectionResult = detectDemoMode(detection)

  // Track state — detection overrides storage/initialEnabled
  let enabled = detectionResult.detected || (initialEnabled ?? loadDemoState(storageKey))
  let currentFixtures: FixtureMap = { ...initialFixtures }

  // Create session state (in-memory, resets on page refresh)
  let sessionState: SessionState = createSessionState()

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

      const method = (
        init?.method ??
        (input instanceof Request ? input.method : undefined) ??
        'GET'
      ).toUpperCase()
      const pathname = extractPathname(input, baseUrl)

      // Try to find a matching fixture, also checking aliased paths
      let match = findMatchingPattern(currentFixtures, method, pathname)

      // If no match and pathAliases configured, try aliased paths
      if (!match && pathAliases) {
        for (const [from, to] of Object.entries(pathAliases)) {
          if (pathname.startsWith(from)) {
            const aliasedPath = to + pathname.slice(from.length)
            match = findMatchingPattern(currentFixtures, method, aliasedPath)
            if (match) break
          }
        }
      }

      if (!match) {
        // No matching fixture — safe methods pass through to the real API
        if (SAFE_METHODS.has(method)) {
          return originalFetch!(input, init)
        }

        // Unmatched mutation: apply policy (default 'block')
        const blockedContext: UnmatchedMutationContext = {
          url: extractUrl(input, baseUrl),
          method,
          pathname,
        }
        const decision =
          typeof unmatchedMutations === 'function'
            ? unmatchedMutations(blockedContext)
            : unmatchedMutations
        if (decision === 'passthrough') {
          return originalFetch!(input, init)
        }

        onMutationBlocked?.(blockedContext)
        return createMockResponse(
          {
            demokit: 'blocked',
            reason: 'unmatched-mutation',
            method,
            path: pathname,
          },
          409
        )
      }

      const [pattern, matchResult] = match

      // Warn on catch-all matches in development
      if (warnOnCatchAll && pattern.includes('*')) {
        console.warn(
          `[DemoKit] Catch-all fixture matched: ${method} ${pathname} → "${pattern}". Consider adding a specific fixture.`
        )
      }
      const handler = currentFixtures[pattern] as FixtureHandler

      // Build request context for the handler
      const url = extractUrl(input, baseUrl)
      const headers = new Headers(init?.headers)
      const body = await parseRequestBody(init?.body, headers)

      let searchParams: URLSearchParams
      try {
        searchParams = new URL(url, baseUrl).searchParams
      } catch {
        searchParams = new URLSearchParams()
      }

      const context: RequestContext = {
        url,
        method,
        params: matchResult.params,
        searchParams,
        body,
        headers,
        session: sessionState,
      }

      // Fire mutation callback for non-GET requests
      if (method !== 'GET' && onMutationIntercepted) {
        onMutationIntercepted({
          url,
          method,
          params: matchResult.params,
          pattern,
        })
      }

      // Execute handler and get result
      let result: unknown
      try {
        if (typeof handler === 'function') {
          result = await handler(context)
        } else {
          result = handler
        }
      } catch (error) {
        // Return error response if handler throws
        console.error('[DemoKit] Fixture handler error:', error)
        return createMockResponse(
          { error: 'Fixture handler error', message: String(error) },
          500
        )
      }

      return createMockResponse(result)
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
    },

    getSession(): SessionState {
      return sessionState
    },

    destroy(): void {
      restoreFetch()
      enabled = false
      sessionState.clear()
    },
  }
}
