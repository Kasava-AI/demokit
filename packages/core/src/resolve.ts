import type {
  DemoKitConfig,
  FixtureHandler,
  FixtureMap,
  RequestContext,
  UnmatchedMutationContext,
} from './types'
import { findMatchingPattern } from './matcher'
import type { SessionState } from './session'

export const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Parse request body based on content type
 */
export async function parseRequestBody(
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

/** Marker for handler results that carry an explicit status (create -> 201, delete -> 204). */
const DEMO_RESPONSE = Symbol.for('demokit.response')

export interface DemoResponseValue {
  [DEMO_RESPONSE]: true
  status: number
  body: unknown
}

/** Wrap a handler result with an explicit HTTP status. */
export function demoResponse(body: unknown, status = 200): DemoResponseValue {
  return { [DEMO_RESPONSE]: true, status, body }
}

export function isDemoResponse(value: unknown): value is DemoResponseValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[DEMO_RESPONSE] === true
  )
}

const BODYLESS_STATUSES = new Set([204, 205, 304])

/**
 * Create a mock Response from fixture data
 */
export function createMockResponse(data: unknown, status = 200): Response {
  const body = BODYLESS_STATUSES.has(status) ? null : JSON.stringify(data)
  return new Response(body, {
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'application/json',
      'X-DemoKit-Mock': 'true',
    },
  })
}

/**
 * Extract pathname from URL, handling various input types
 */
export function extractPathname(input: RequestInfo | URL, baseUrl: string): string {
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
export function extractUrl(input: RequestInfo | URL, baseUrl: string): string {
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
 * Dependencies a transport (fetch interceptor, MSW handler, ...) provides to
 * resolveRequest so it can resolve a single request against the fixture map
 * without knowing anything about how the request arrived.
 */
export interface ResolveDeps {
  fixtures: FixtureMap
  baseUrl: string
  pathAliases?: Record<string, string>
  warnOnCatchAll: boolean
  unmatchedMutations: 'block' | 'passthrough' | ((ctx: UnmatchedMutationContext) => 'block' | 'passthrough')
  session: SessionState
  onMutationIntercepted?: DemoKitConfig['onMutationIntercepted']
  onMutationBlocked?: DemoKitConfig['onMutationBlocked']
  onUnmatchedRequest?: DemoKitConfig['onUnmatchedRequest']
  onProjectionError?: DemoKitConfig['onProjectionError']
  /**
   * DemoKit's own control-plane API origin (the same `apiUrl` the coverage
   * reporter POSTs to and `fetchCloudFixtures` GETs from) — a URL or bare
   * origin string. Any request whose origin matches is passed through
   * BEFORE fixture matching or mutation policy, silently (no
   * `onUnmatchedRequest`/`onMutationBlocked` call): DemoKit's own traffic is
   * never demo traffic. Without this, a Service Worker transport (which
   * sees all page network traffic, unlike a patched `fetch` reference) can
   * catch the reporter's own `POST {apiUrl}/coverage` as an unmatched
   * mutation, block it with a 409, and record the block as a fresh
   * coverage event — a self-sustaining flush loop.
   */
  controlPlaneOrigin?: string
}

/** True if `url`'s origin matches `candidate`'s origin. Never throws — malformed input is treated as no match, falling through to normal resolution. */
function isControlPlaneOrigin(url: string, candidate: string): boolean {
  try {
    return new URL(url).origin === new URL(candidate).origin
  } catch {
    return false
  }
}

/**
 * Outcome of resolving a request: either let it hit the real network, or
 * serve a mock Response.
 *
 * The passthrough variant's `unmatched` discriminant distinguishes the two
 * distinct ways a request can pass through: an unmatched *safe* method
 * (GET/HEAD/OPTIONS) — which also fires `onUnmatchedRequest` — carries
 * `unmatched: true`; the control-plane bypass (checked before any matching,
 * fires no callback at all) and the mutation-passthrough-policy branch do
 * not. This is the single source of that distinction: the fetch
 * interceptor's shape-observation hook (Task 2) gates on `unmatched` so it
 * only ever observes the former, never DemoKit's own control-plane traffic.
 * Optional and additive so the msw handler (which ignores it) is unaffected.
 */
export type ResolveOutcome =
  | { kind: 'passthrough'; unmatched?: true }
  | { kind: 'response'; response: Response }

/**
 * Transport-agnostic request resolution core. Given the deps a transport
 * (fetch interceptor, MSW worker, ...) collects and a request input, decides
 * whether the request should pass through to the real network or be served
 * from a matched fixture handler.
 */
export async function resolveRequest(
  deps: ResolveDeps,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ResolveOutcome> {
  const method = (
    init?.method ?? (input instanceof Request ? input.method : undefined) ?? 'GET'
  ).toUpperCase()

  // Control-plane bypass (spec §7/§8 corollary): checked before any fixture
  // matching or mutation policy, and silently — DemoKit's own traffic to its
  // own API is never demo traffic, so it never generates coverage events or
  // blocked-mutation callbacks either.
  if (deps.controlPlaneOrigin) {
    const url = extractUrl(input, deps.baseUrl)
    if (isControlPlaneOrigin(url, deps.controlPlaneOrigin)) {
      return { kind: 'passthrough' }
    }
  }

  const pathname = extractPathname(input, deps.baseUrl)

  let match = findMatchingPattern(deps.fixtures, method, pathname)
  if (!match && deps.pathAliases) {
    for (const [from, to] of Object.entries(deps.pathAliases)) {
      if (pathname.startsWith(from)) {
        match = findMatchingPattern(deps.fixtures, method, to + pathname.slice(from.length))
        if (match) break
      }
    }
  }

  if (!match) {
    if (SAFE_METHODS.has(method)) {
      deps.onUnmatchedRequest?.({ method, pathname })
      return { kind: 'passthrough', unmatched: true }
    }
    const blockedContext: UnmatchedMutationContext = { url: extractUrl(input, deps.baseUrl), method, pathname }
    const decision =
      typeof deps.unmatchedMutations === 'function' ? deps.unmatchedMutations(blockedContext) : deps.unmatchedMutations
    if (decision === 'passthrough') return { kind: 'passthrough' }
    deps.onMutationBlocked?.(blockedContext)
    return {
      kind: 'response',
      response: createMockResponse({ demokit: 'blocked', reason: 'unmatched-mutation', method, path: pathname }, 409),
    }
  }

  const [pattern, matchResult] = match
  if (deps.warnOnCatchAll && pattern.includes('*')) {
    console.warn(`[DemoKit] Catch-all fixture matched: ${method} ${pathname} → "${pattern}". Consider adding a specific fixture.`)
  }
  const handler = deps.fixtures[pattern] as FixtureHandler

  const url = extractUrl(input, deps.baseUrl)
  const headers =
    init?.headers != null ? new Headers(init.headers)
    : input instanceof Request ? new Headers(input.headers)
    : new Headers()

  let rawBody: BodyInit | null | undefined = init?.body
  if (rawBody == null && input instanceof Request && method !== 'GET' && method !== 'HEAD') {
    try {
      const text = await input.clone().text()
      rawBody = text === '' ? undefined : text
    } catch {
      // Body already consumed, or unreadable for some other reason — treat as
      // no body rather than throwing out of the patched fetch (mirrors
      // parseRequestBody's own tolerance for malformed input below).
      rawBody = undefined
    }
  }
  const body = await parseRequestBody(rawBody, headers)

  let searchParams: URLSearchParams
  try { searchParams = new URL(url, deps.baseUrl).searchParams } catch { searchParams = new URLSearchParams() }

  const context: RequestContext = { url, method, params: matchResult.params, searchParams, body, headers, session: deps.session }

  if (method !== 'GET' && deps.onMutationIntercepted) {
    deps.onMutationIntercepted({ url, method, params: matchResult.params, pattern })
  }

  let result: unknown
  try {
    result = typeof handler === 'function' ? await handler(context) : handler
  } catch (error) {
    const candidateStatus = (error as { status?: unknown } | null)?.status
    const status =
      typeof candidateStatus === 'number' && Number.isInteger(candidateStatus) &&
      candidateStatus >= 200 && candidateStatus <= 599
        ? candidateStatus : 500
    if (status >= 500) {
      console.error('[DemoKit] Fixture handler error:', error)
      deps.onProjectionError?.({ method, pathname, status })
    }
    return {
      kind: 'response',
      response: createMockResponse(
        { error: status >= 500 ? 'Fixture handler error' : 'Rejected', message: error instanceof Error ? error.message : String(error) },
        status
      ),
    }
  }

  if (isDemoResponse(result)) return { kind: 'response', response: createMockResponse(result.body, result.status) }
  return { kind: 'response', response: createMockResponse(result) }
}
