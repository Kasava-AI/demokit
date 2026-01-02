import type { TRPCLink, Operation } from '@trpc/client'
import { observable } from '@trpc/server/observable'
import type { AnyRouter } from '@trpc/server'
import type {
  CreateDemoLinkOptions,
  TRPCFixtureContext,
  TRPCFixtureHandler,
  FlatFixtureMap,
} from './types'
import { normalizeFixtures } from './fixtures'
import { findMatchingFixture, shouldIntercept } from './matcher'

/**
 * Create a demo-aware tRPC link
 *
 * This link intercepts tRPC procedure calls when demo mode is enabled
 * and returns fixture data instead of making real API calls.
 *
 * The demo link should be placed before the terminating link (like httpBatchLink)
 * in your link chain.
 *
 * @example
 * import { createTRPCClient, httpBatchLink } from '@trpc/client'
 * import { createDemoLink } from '@demokit-ai/trpc'
 *
 * // Simple usage with fixtures
 * const client = createTRPCClient<AppRouter>({
 *   links: [
 *     createDemoLink({
 *       fixtures: {
 *         user: {
 *           list: () => [{ id: '1', name: 'Demo User' }],
 *           get: ({ input }) => ({ id: input.id, name: 'Demo User' }),
 *         },
 *       },
 *       isEnabled: () => localStorage.getItem('demoMode') === 'true',
 *     }),
 *     httpBatchLink({ url: '/api/trpc' }),
 *   ],
 * })
 *
 * @example
 * // With include/exclude filtering
 * createDemoLink({
 *   fixtures: myFixtures,
 *   include: ['user.*', 'post.list'], // Only intercept user.* and post.list
 *   exclude: ['user.delete'],         // Never intercept user.delete
 *   delay: 200,                       // Simulate 200ms network latency
 *   onMissing: (path, input) => {
 *     console.warn(`No fixture for: ${path}`)
 *   },
 * })
 */
export function createDemoLink<TRouter extends AnyRouter = AnyRouter>(
  options: CreateDemoLinkOptions<TRouter> = {}
): TRPCLink<TRouter> {
  const {
    fixtures: rawFixtures,
    isEnabled = () => false,
    delay = 0,
    include,
    exclude,
    onMissing,
  } = options

  // Normalize fixtures to flat map on initialization
  const fixtures: FlatFixtureMap = normalizeFixtures(rawFixtures as Record<string, unknown>)

  // Return the link factory function
  return () => {
    // Return the link function that handles each operation
    return ({ next, op }) => {
      return observable((observer) => {
        // Check if demo mode is enabled
        if (!isEnabled()) {
          // Forward to next link
          const unsubscribe = next(op).subscribe({
            next(value) {
              observer.next(value)
            },
            error(err) {
              observer.error(err)
            },
            complete() {
              observer.complete()
            },
          })
          return unsubscribe
        }

        // Check if this procedure should be intercepted
        if (!shouldIntercept(op.path, include, exclude)) {
          // Forward to next link
          const unsubscribe = next(op).subscribe({
            next(value) {
              observer.next(value)
            },
            error(err) {
              observer.error(err)
            },
            complete() {
              observer.complete()
            },
          })
          return unsubscribe
        }

        // Find matching fixture
        const match = findMatchingFixture(fixtures, op.path)

        if (!match.matched || !match.handler) {
          // No fixture found
          onMissing?.(op.path, op.input)

          // Forward to next link as fallback
          const unsubscribe = next(op).subscribe({
            next(value) {
              observer.next(value)
            },
            error(err) {
              observer.error(err)
            },
            complete() {
              observer.complete()
            },
          })
          return unsubscribe
        }

        // Execute fixture handler
        const executeFixture = async () => {
          const context: TRPCFixtureContext = {
            path: op.path,
            input: op.input,
            type: op.type,
          }

          // Apply delay if configured
          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay))
          }

          // Execute handler
          const handler = match.handler as TRPCFixtureHandler
          const result = typeof handler === 'function' ? await handler(context) : handler

          return result
        }

        // Handle async execution
        executeFixture()
          .then((data) => {
            observer.next({
              result: { data },
            })
            observer.complete()
          })
          .catch((err) => {
            observer.error(err)
          })

        // Return cleanup function (no-op for demo fixtures)
        return () => {}
      })
    }
  }
}

/**
 * Create a demo link with state management
 *
 * Returns the link along with controls to enable/disable demo mode
 * and manage fixtures at runtime.
 *
 * @example
 * const { link, enable, disable, isEnabled, setFixture, removeFixture } =
 *   createDemoLinkWithState({
 *     fixtures: myFixtures,
 *   })
 *
 * const client = createTRPCClient<AppRouter>({
 *   links: [link, httpBatchLink({ url: '/api/trpc' })],
 * })
 *
 * // Later...
 * enable()  // Turn on demo mode
 * disable() // Turn off demo mode
 *
 * // Add fixture at runtime
 * setFixture('user.get', ({ input }) => ({ id: input.id, name: 'Runtime User' }))
 */
export function createDemoLinkWithState<TRouter extends AnyRouter = AnyRouter>(
  options: Omit<CreateDemoLinkOptions<TRouter>, 'isEnabled'> & {
    /**
     * Initial enabled state
     * @default false
     */
    enabled?: boolean
  } = {}
) {
  const { fixtures: rawFixtures, enabled: initialEnabled = false, ...rest } = options

  let enabled = initialEnabled
  const fixtures: FlatFixtureMap = normalizeFixtures(rawFixtures as Record<string, unknown>)

  const link = createDemoLink<TRouter>({
    ...rest,
    fixtures,
    isEnabled: () => enabled,
  })

  return {
    /**
     * The tRPC link to use in your client
     */
    link,

    /**
     * Enable demo mode
     */
    enable: () => {
      enabled = true
    },

    /**
     * Disable demo mode
     */
    disable: () => {
      enabled = false
    },

    /**
     * Check if demo mode is enabled
     */
    isEnabled: () => enabled,

    /**
     * Toggle demo mode
     */
    toggle: () => {
      enabled = !enabled
      return enabled
    },

    /**
     * Set or update a fixture
     */
    setFixture: (path: string, handler: TRPCFixtureHandler) => {
      fixtures.set(path, handler)
    },

    /**
     * Remove a fixture
     */
    removeFixture: (path: string) => {
      fixtures.delete(path)
    },

    /**
     * Get all fixtures
     */
    getFixtures: () => fixtures,

    /**
     * Clear all fixtures
     */
    clearFixtures: () => {
      fixtures.clear()
    },
  }
}

export type DemoLinkWithState<TRouter extends AnyRouter = AnyRouter> = ReturnType<
  typeof createDemoLinkWithState<TRouter>
>
