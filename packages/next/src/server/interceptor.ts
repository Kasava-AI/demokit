import {
  createDemoInterceptor,
  type FixtureMap,
  type DemoInterceptor,
  type RequestContext,
} from '@demokit-ai/core'
import { isServerDemoMode, getServerScenario } from './context'

/**
 * Configuration for server-side demo interceptor
 */
export interface ServerInterceptorConfig {
  /**
   * Base fixtures (always available)
   */
  fixtures: FixtureMap

  /**
   * Scenario-specific fixtures
   */
  scenarios?: Record<string, FixtureMap>

  /**
   * Base URL for relative URL parsing
   */
  baseUrl?: string
}

/**
 * Create a server-side demo interceptor
 *
 * This interceptor works with Server Components and API routes.
 * It uses AsyncLocalStorage to check demo mode state.
 *
 * @example
 * // lib/demo-interceptor.ts
 * import { createServerInterceptor } from '@demokit-ai/next/server'
 *
 * export const demoInterceptor = createServerInterceptor({
 *   fixtures: {
 *     'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 *   },
 *   scenarios: {
 *     'empty': { 'GET /api/users': () => [] },
 *   },
 * })
 *
 * // Enable in your app
 * demoInterceptor.enable()
 */
export function createServerInterceptor(config: ServerInterceptorConfig): DemoInterceptor {
  const { fixtures, scenarios = {}, baseUrl } = config

  // Merge fixtures based on current scenario
  const getActiveFixtures = (): FixtureMap => {
    const scenario = getServerScenario()
    if (scenario && scenarios[scenario]) {
      return { ...fixtures, ...scenarios[scenario] }
    }
    return fixtures
  }

  // Wrapper that checks server context before each request
  const wrappedFixtures: FixtureMap = new Proxy(fixtures, {
    get(target, prop: string) {
      const activeFixtures = getActiveFixtures()
      return activeFixtures[prop]
    },
    ownKeys() {
      const activeFixtures = getActiveFixtures()
      return Reflect.ownKeys(activeFixtures)
    },
    getOwnPropertyDescriptor(target, prop) {
      const activeFixtures = getActiveFixtures()
      if (prop in activeFixtures) {
        return {
          configurable: true,
          enumerable: true,
          value: activeFixtures[prop as string],
        }
      }
      return undefined
    },
  })

  return createDemoInterceptor({
    fixtures: wrappedFixtures,
    baseUrl,
    // Server-side storage is not used (we use cookies/headers)
    storageKey: undefined,
  })
}

/**
 * Helper to wrap a fixture handler with demo mode check
 */
export function withDemoCheck<T>(
  handler: (context: RequestContext) => T | Promise<T>,
  fallback?: () => T | Promise<T>
): (context: RequestContext) => T | Promise<T> {
  return async (context) => {
    if (!isServerDemoMode()) {
      if (fallback) {
        return fallback()
      }
      throw new Error('[DemoKit] Demo mode is not enabled')
    }
    return handler(context)
  }
}
