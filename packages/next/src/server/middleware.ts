import { NextRequest, NextResponse } from 'next/server'
import type { DemoMiddlewareConfig, MiddlewareResult } from '../types'

const DEFAULT_CONFIG: Required<DemoMiddlewareConfig> = {
  cookieName: 'demokit-mode',
  urlParam: 'demo',
  headerName: 'x-demokit-mode',
  apiPaths: ['/api/'],
  cookieOptions: {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
}

/**
 * Create a demo-aware middleware
 *
 * This middleware:
 * 1. Checks for demo mode URL parameter (?demo=true or ?demo=false)
 * 2. Sets/clears demo mode cookie
 * 3. Adds demo mode header to API requests
 * 4. Supports scenario switching via ?demo=scenario-name
 *
 * @example
 * // middleware.ts
 * import { createDemoMiddleware } from '@demokit-ai/next/middleware'
 *
 * const demoMiddleware = createDemoMiddleware()
 *
 * export function middleware(request: NextRequest) {
 *   return demoMiddleware(request)
 * }
 *
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
 * }
 */
export function createDemoMiddleware(config: DemoMiddlewareConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const { cookieName, urlParam, headerName, apiPaths, cookieOptions } = mergedConfig

  return function demoMiddleware(request: NextRequest): MiddlewareResult {
    // Check for demo mode in URL param
    const demoParam = request.nextUrl.searchParams.get(urlParam)

    // Check for existing cookie
    const demoCookie = request.cookies.get(cookieName)

    let response = NextResponse.next()
    let isDemoMode = false
    let scenario: string | null = null

    // Handle URL param toggle
    if (demoParam !== null) {
      if (demoParam === 'false' || demoParam === '0' || demoParam === '') {
        // Disable demo mode
        response = NextResponse.next()
        response.cookies.delete(cookieName)
        isDemoMode = false
      } else if (demoParam === 'true' || demoParam === '1') {
        // Enable demo mode (no scenario)
        response = NextResponse.next()
        response.cookies.set(cookieName, 'true', cookieOptions)
        isDemoMode = true
      } else {
        // Enable with specific scenario
        response = NextResponse.next()
        response.cookies.set(cookieName, demoParam, cookieOptions)
        isDemoMode = true
        scenario = demoParam
      }
    } else if (demoCookie) {
      // Use existing cookie
      isDemoMode = true
      scenario = demoCookie.value !== 'true' ? demoCookie.value : null
    }

    // Add header for API routes
    if (isDemoMode) {
      const isApiRoute = apiPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
      )

      if (isApiRoute) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set(headerName, scenario ?? 'true')

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })

        // Re-set cookie if we created new response
        if (demoParam !== null) {
          if (demoParam === 'false' || demoParam === '0' || demoParam === '') {
            response.cookies.delete(cookieName)
          } else {
            response.cookies.set(
              cookieName,
              demoParam === 'true' || demoParam === '1' ? 'true' : demoParam,
              cookieOptions
            )
          }
        }
      }
    }

    return {
      isDemoMode,
      scenario,
      response,
    }
  }
}

/**
 * Simple middleware wrapper that just returns the response
 *
 * @example
 * import { demoMiddleware } from '@demokit-ai/next/middleware'
 * export const middleware = demoMiddleware()
 */
export function demoMiddleware(config: DemoMiddlewareConfig = {}) {
  const handler = createDemoMiddleware(config)

  return function middleware(request: NextRequest): NextResponse {
    return handler(request).response
  }
}

/**
 * Check if a request is in demo mode (from middleware or direct header check)
 */
export function isDemoRequest(request: NextRequest, config: DemoMiddlewareConfig = {}): boolean {
  const { cookieName = 'demokit-mode', headerName = 'x-demokit-mode' } = config

  // Check header first (set by middleware)
  if (request.headers.get(headerName)) {
    return true
  }

  // Check cookie
  const cookie = request.cookies.get(cookieName)
  return cookie !== undefined && cookie.value !== ''
}

/**
 * Get the demo scenario from a request
 */
export function getDemoScenario(request: NextRequest, config: DemoMiddlewareConfig = {}): string | null {
  const { cookieName = 'demokit-mode', headerName = 'x-demokit-mode' } = config

  // Check header first
  const headerValue = request.headers.get(headerName)
  if (headerValue && headerValue !== 'true') {
    return headerValue
  }

  // Check cookie
  const cookie = request.cookies.get(cookieName)
  if (cookie && cookie.value !== 'true') {
    return cookie.value
  }

  return null
}
