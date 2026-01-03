import type {
  DemoKitConfig,
  DemoInterceptor,
  FixtureMap,
  FixtureHandler,
  RequestContext,
} from './types'
import { findMatchingPattern } from './matcher'
import { loadDemoState, saveDemoState, DEFAULT_STORAGE_KEY } from './storage'
import { createSessionState, type SessionState } from './session'

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
  } = config

  // Track state
  let enabled = initialEnabled ?? loadDemoState(storageKey)
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
        console.log('[DemoKit] Demo mode disabled, passing through')
        return originalFetch!(input, init)
      }

      const method = init?.method?.toUpperCase() || 'GET'
      const pathname = extractPathname(input, baseUrl)

      console.log('[DemoKit] Intercepting request:', { method, pathname, enabled })
      console.log('[DemoKit] Available fixtures:', Object.keys(currentFixtures))

      // Try to find a matching fixture
      const match = findMatchingPattern(currentFixtures, method, pathname)

      if (!match) {
        // No matching fixture - pass through to real API
        console.log('[DemoKit] No matching fixture for:', `${method} ${pathname}`)
        return originalFetch!(input, init)
      }

      console.log('[DemoKit] Found matching fixture:', match[0])

      const [pattern, matchResult] = match
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

    disable(): void {
      if (!enabled) return

      enabled = false
      saveDemoState(storageKey, false)
      onDisable?.()
    },

    isEnabled(): boolean {
      return enabled
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
