/**
 * @demokit-ai/remix/server
 *
 * Server-side utilities for Remix demo mode detection and fixture management.
 * Import from '@demokit-ai/remix/server' in your loader/action files.
 */

import type {
  DemoModeOptions,
  LoaderFixtureContext,
  ActionFixtureContext,
  LoaderFixtureHandler,
  ActionFixtureHandler,
  MethodActionHandlers,
  LoaderFixtureMapObject,
  ActionFixtureMapObject,
} from './types'
import { FixtureStore, createFixtureStore, defineRemixFixtures } from './fixtures'

/** Default demo mode cookie name */
const DEFAULT_COOKIE_NAME = 'demokit-demo-mode'

/** Default demo mode header name */
const DEFAULT_HEADER_NAME = 'x-demokit-demo-mode'

/** Default environment variable name */
const DEFAULT_ENV_VAR = 'DEMOKIT_DEMO_MODE'

/** Default query parameter name */
const DEFAULT_QUERY_PARAM = 'demo'

/**
 * Check if demo mode is enabled for a request
 *
 * Checks in order:
 * 1. Query parameter (for easy testing)
 * 2. Cookie (persistent across requests)
 * 3. Header (for API requests)
 * 4. Environment variable (global override)
 *
 * @example
 * import { isDemoMode } from '@demokit-ai/remix/server'
 *
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   if (isDemoMode(request)) {
 *     return json({ user: { id: '1', name: 'Demo User' } })
 *   }
 *   return json({ user: await db.users.findFirst() })
 * }
 */
export function isDemoMode(request: Request, options?: DemoModeOptions): boolean {
  const {
    cookieName = DEFAULT_COOKIE_NAME,
    headerName = DEFAULT_HEADER_NAME,
    envVar = DEFAULT_ENV_VAR,
    queryParam = DEFAULT_QUERY_PARAM,
  } = options ?? {}

  // Check query parameter first (highest priority for easy testing)
  const url = new URL(request.url)
  const queryValue = url.searchParams.get(queryParam)
  if (queryValue !== null) {
    return queryValue === 'true' || queryValue === '1' || queryValue === ''
  }

  // Check cookie
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader)
    const cookieValue = cookies[cookieName]
    if (cookieValue !== undefined) {
      return cookieValue === 'true' || cookieValue === '1'
    }
  }

  // Check header
  const headerValue = request.headers.get(headerName)
  if (headerValue !== null) {
    return headerValue === 'true' || headerValue === '1'
  }

  // Check environment variable (global fallback)
  if (typeof process !== 'undefined' && process.env?.[envVar]) {
    const envValue = process.env[envVar]
    return envValue === 'true' || envValue === '1'
  }

  return false
}

/**
 * Parse cookies from a cookie header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=')
    if (name) {
      cookies[name] = rest.join('=')
    }
  }
  return cookies
}

/**
 * Create a demo mode checker function with preset options
 *
 * @example
 * import { createDemoModeChecker } from '@demokit-ai/remix/server'
 *
 * const isDemoMode = createDemoModeChecker({
 *   cookieName: 'my-demo-cookie',
 *   envVar: 'MY_DEMO_MODE',
 * })
 *
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   if (isDemoMode(request)) {
 *     return json(demoData)
 *   }
 *   return json(await fetchRealData())
 * }
 */
export function createDemoModeChecker(
  options?: DemoModeOptions
): (request: Request) => boolean {
  return (request: Request) => isDemoMode(request, options)
}

// Global fixture store instance (for simple usage)
let globalFixtureStore: FixtureStore | null = null

/**
 * Set up the global fixture store
 *
 * Call this once at app startup to configure demo fixtures.
 *
 * @example
 * // In your entry.server.tsx or root loader
 * import { setupDemoFixtures } from '@demokit-ai/remix/server'
 *
 * setupDemoFixtures({
 *   loaders: {
 *     '/users': [{ id: '1', name: 'Demo User' }],
 *     '/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *   },
 *   actions: {
 *     '/users': ({ formData }) => ({ created: true }),
 *   },
 * })
 */
export function setupDemoFixtures(config: {
  loaders?: LoaderFixtureMapObject
  actions?: ActionFixtureMapObject
}): void {
  globalFixtureStore = createFixtureStore(config)
}

/**
 * Get the global fixture store
 */
export function getFixtureStore(): FixtureStore | null {
  return globalFixtureStore
}

/**
 * Get demo data for a loader path
 *
 * Returns the fixture data if available, otherwise undefined.
 * Use with isDemoMode() for conditional demo data.
 *
 * @example
 * import { isDemoMode, getDemoData } from '@demokit-ai/remix/server'
 *
 * export async function loader({ request, params }: LoaderFunctionArgs) {
 *   if (isDemoMode(request)) {
 *     const demoData = await getDemoData('/users/:id', {
 *       params,
 *       request,
 *       path: '/users/' + params.id,
 *     })
 *     if (demoData) return json(demoData)
 *   }
 *   return json(await db.users.findFirst({ where: { id: params.id } }))
 * }
 */
export async function getDemoData<T = unknown>(
  pattern: string,
  context: LoaderFixtureContext
): Promise<T | undefined> {
  const store = getFixtureStore()
  if (!store) return undefined

  const handler = store.getLoader(pattern)
  if (!handler) return undefined

  return executeHandler(handler, context) as Promise<T>
}

/**
 * Get demo action result for an action path
 *
 * @example
 * import { isDemoMode, getDemoActionResult } from '@demokit-ai/remix/server'
 *
 * export async function action({ request, params }: ActionFunctionArgs) {
 *   if (isDemoMode(request)) {
 *     const formData = await request.clone().formData()
 *     const demoResult = await getDemoActionResult('/users/:id', {
 *       params,
 *       request,
 *       path: '/users/' + params.id,
 *       formData,
 *     }, request.method)
 *     if (demoResult) return json(demoResult)
 *   }
 *   // Real action...
 * }
 */
export async function getDemoActionResult<T = unknown>(
  pattern: string,
  context: ActionFixtureContext,
  method: string
): Promise<T | undefined> {
  const store = getFixtureStore()
  if (!store) return undefined

  const handler = store.getAction(pattern, method)
  if (!handler) return undefined

  return executeHandler(handler, context) as Promise<T>
}

/**
 * Execute a fixture handler
 */
async function executeHandler<T, C extends LoaderFixtureContext | ActionFixtureContext>(
  handler: T | ((context: C) => T | Promise<T>),
  context: C
): Promise<T> {
  if (typeof handler === 'function') {
    return (handler as (context: C) => T | Promise<T>)(context)
  }
  return handler
}

/**
 * Create a cookie value to enable demo mode
 *
 * @example
 * import { createDemoModeCookie } from '@demokit-ai/remix/server'
 *
 * export async function action({ request }: ActionFunctionArgs) {
 *   return redirect('/', {
 *     headers: {
 *       'Set-Cookie': createDemoModeCookie(true),
 *     },
 *   })
 * }
 */
export function createDemoModeCookie(
  enabled: boolean,
  options?: {
    cookieName?: string
    maxAge?: number
    path?: string
    sameSite?: 'Strict' | 'Lax' | 'None'
    secure?: boolean
  }
): string {
  const {
    cookieName = DEFAULT_COOKIE_NAME,
    maxAge = 60 * 60 * 24 * 7, // 7 days
    path = '/',
    sameSite = 'Lax',
    secure = process.env.NODE_ENV === 'production',
  } = options ?? {}

  const parts = [
    `${cookieName}=${enabled ? 'true' : 'false'}`,
    `Max-Age=${maxAge}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ]

  if (secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * Create a cookie value to clear demo mode
 *
 * @example
 * import { clearDemoModeCookie } from '@demokit-ai/remix/server'
 *
 * export async function action({ request }: ActionFunctionArgs) {
 *   return redirect('/', {
 *     headers: {
 *       'Set-Cookie': clearDemoModeCookie(),
 *     },
 *   })
 * }
 */
export function clearDemoModeCookie(options?: { cookieName?: string; path?: string }): string {
  const { cookieName = DEFAULT_COOKIE_NAME, path = '/' } = options ?? {}
  return `${cookieName}=; Max-Age=0; Path=${path}`
}

// Re-export fixture utilities for convenience
export { FixtureStore, createFixtureStore, defineRemixFixtures }
export {
  defineRemixLoaderFixtures,
  defineRemixActionFixtures,
} from './fixtures'

// Re-export types
export type {
  DemoModeOptions,
  LoaderFixtureContext,
  ActionFixtureContext,
  LoaderFixtureHandler,
  ActionFixtureHandler,
  MethodActionHandlers,
  LoaderFixtureMapObject,
  ActionFixtureMapObject,
}
