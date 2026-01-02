import type { Middleware } from 'swr'
import type { SWRFixtureMap, SWRFixtureContext } from './types'
import { findMatchingFixture } from './matcher'

/**
 * Options for creating the demo middleware
 */
export interface CreateDemoMiddlewareOptions {
  /**
   * Map of key patterns to fixture handlers
   */
  fixtures: SWRFixtureMap

  /**
   * Function to check if demo mode is enabled
   */
  isEnabled: () => boolean

  /**
   * Delay in ms before returning fixture data
   * @default 0
   */
  delay?: number
}

/**
 * Create a demo-aware SWR middleware
 *
 * This middleware intercepts SWR requests when demo mode is enabled
 * and returns fixture data instead of using the original fetcher.
 *
 * @example
 * import { SWRConfig } from 'swr'
 * import { createDemoMiddleware } from '@demokit-ai/swr'
 *
 * const fixtures = new Map([
 *   [['/api/users'], [{ id: '1', name: 'Demo User' }]],
 *   [['/api/users', ':id'], ({ params }) => ({ id: params.id, name: 'User' })],
 * ])
 *
 * const demoMiddleware = createDemoMiddleware({
 *   fixtures,
 *   isEnabled: () => isDemoMode,
 *   delay: 100,
 * })
 *
 * function App() {
 *   return (
 *     <SWRConfig value={{ use: [demoMiddleware] }}>
 *       <YourApp />
 *     </SWRConfig>
 *   )
 * }
 */
export function createDemoMiddleware(options: CreateDemoMiddlewareOptions): Middleware {
  const { fixtures, isEnabled, delay = 0 } = options

  // Use the simpler middleware pattern that SWR expects
  const middleware: Middleware = (useSWRNext) => (key, fetcher, config) => {
    // Create an extended fetcher that checks for demo mode
    const extendedFetcher =
      fetcher === null
        ? null
        : async (...args: Parameters<typeof fetcher>) => {
            // Resolve the key if it's a function
            const resolvedKey = typeof key === 'function' ? key() : key

            // If no key, let SWR handle it
            if (resolvedKey === null || resolvedKey === undefined) {
              return fetcher(...args)
            }

            // If demo mode is not enabled, use original fetcher
            if (!isEnabled()) {
              return fetcher(...args)
            }

            // Normalize key for matching
            const keyToMatch =
              typeof resolvedKey === 'string' ? resolvedKey : (resolvedKey as unknown[])

            // Find matching fixture
            const match = findMatchingFixture(fixtures, keyToMatch)

            if (!match) {
              // No fixture found, use original fetcher
              return fetcher(...args)
            }

            const [handler, { params, normalizedKey }] = match

            // Apply delay if configured
            if (delay > 0) {
              await new Promise((resolve) => setTimeout(resolve, delay))
            }

            // Build context
            const context: SWRFixtureContext = {
              key: resolvedKey,
              normalizedKey,
              params,
              match: { matched: true, params },
            }

            // Execute handler
            if (typeof handler === 'function') {
              return handler(context)
            }

            // Return static value
            return handler
          }

    return useSWRNext(key, extendedFetcher, config)
  }

  return middleware
}
