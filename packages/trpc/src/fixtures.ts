import type {
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from '@trpc/server'
import type { TRPCFixtureHandler, TRPCFixtureContext, FlatFixtureMap } from './types'

/**
 * Type helper to create fixture handlers with full type inference
 *
 * This helper infers input/output types from your router definition,
 * providing autocomplete and type checking for fixture definitions.
 *
 * @example
 * import { defineTRPCFixtures } from '@demokit-ai/trpc'
 * import type { AppRouter } from '../server/router'
 *
 * // Nested structure matching your router
 * const fixtures = defineTRPCFixtures<AppRouter>()({
 *   user: {
 *     list: () => [
 *       { id: '1', name: 'Demo User', email: 'demo@example.com' }
 *     ],
 *     get: ({ input }) => ({
 *       id: input.id,
 *       name: 'Demo User',
 *       email: 'demo@example.com',
 *     }),
 *     create: async ({ input }) => ({
 *       id: crypto.randomUUID(),
 *       ...input,
 *       createdAt: new Date(),
 *     }),
 *   },
 *   post: {
 *     list: () => [],
 *   },
 * })
 */
export function defineTRPCFixtures<TRouter extends AnyRouter>() {
  type RouterIn = inferRouterInputs<TRouter>
  type RouterOut = inferRouterOutputs<TRouter>

  /**
   * Helper type to build nested fixture structure
   */
  type BuildFixtureType<TIn, TOut> = {
    [K in keyof TIn & keyof TOut]?: TIn[K] extends object
      ? TOut[K] extends object
        ? // Check if this is a procedure (has no nested keys) or a namespace
          keyof TIn[K] extends never
          ? TRPCFixtureHandler<TIn[K], TOut[K]>
          : BuildFixtureType<TIn[K], TOut[K]>
        : TRPCFixtureHandler<TIn[K], TOut[K]>
      : TRPCFixtureHandler<TIn[K], TOut[K]>
  }

  return function <T extends BuildFixtureType<RouterIn, RouterOut>>(fixtures: T): T {
    return fixtures
  }
}

/**
 * Alternative: define fixtures using flat dot-notation paths
 *
 * Useful when you want to define fixtures independently of router structure.
 *
 * @example
 * const fixtures = defineFixtureMap<AppRouter>({
 *   'user.list': () => [{ id: '1', name: 'Demo' }],
 *   'user.get': ({ input }) => ({ id: input.id, name: 'Demo' }),
 * })
 */
export function defineFixtureMap<TRouter extends AnyRouter>(
  fixtures: FlatFixtureRecord<TRouter>
): FlatFixtureMap {
  return new Map(Object.entries(fixtures))
}

/**
 * Type for flat fixture map with path-based keys
 */
type FlatFixtureRecord<TRouter extends AnyRouter> = {
  [K in ProcedurePaths<TRouter>]?: TRPCFixtureHandler<
    PathInput<TRouter, K>,
    PathOutput<TRouter, K>
  >
}

/**
 * Extract all procedure paths from a router using dot notation
 */
type ProcedurePaths<TRouter extends AnyRouter> = inferRouterInputs<TRouter> extends infer TIn
  ? TIn extends object
    ? FlattenPaths<TIn>
    : never
  : never

/**
 * Flatten nested object keys to dot notation
 */
type FlattenPaths<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? keyof T[K] extends never
            ? `${Prefix}${K}`
            : FlattenPaths<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never
    }[keyof T]
  : never

/**
 * Get input type for a specific procedure path
 */
type PathInput<TRouter extends AnyRouter, Path extends string> = Path extends `${infer First}.${infer Rest}`
  ? inferRouterInputs<TRouter>[First] extends object
    ? PathInput<inferRouterInputs<TRouter>[First] extends AnyRouter ? inferRouterInputs<TRouter>[First] : never, Rest>
    : never
  : inferRouterInputs<TRouter>[Path]

/**
 * Get output type for a specific procedure path
 */
type PathOutput<TRouter extends AnyRouter, Path extends string> = Path extends `${infer First}.${infer Rest}`
  ? inferRouterOutputs<TRouter>[First] extends object
    ? PathOutput<inferRouterOutputs<TRouter>[First] extends AnyRouter ? inferRouterOutputs<TRouter>[First] : never, Rest>
    : never
  : inferRouterOutputs<TRouter>[Path]

/**
 * Create a fixture handler with explicit types
 *
 * Useful when you need to define a fixture outside of the main fixture object.
 *
 * @example
 * const getUserFixture = createFixtureHandler<{ id: string }, User>(
 *   ({ input }) => ({
 *     id: input.id,
 *     name: 'Demo User',
 *   })
 * )
 */
export function createFixtureHandler<TInput, TOutput>(
  handler: TRPCFixtureHandler<TInput, TOutput>
): TRPCFixtureHandler<TInput, TOutput> {
  return handler
}

/**
 * Normalize fixture definitions to a flat Map
 *
 * Converts nested fixture objects to a flat map with dot-notation paths.
 */
export function normalizeFixtures(
  fixtures: Record<string, unknown> | FlatFixtureMap | undefined
): FlatFixtureMap {
  if (!fixtures) {
    return new Map()
  }

  if (fixtures instanceof Map) {
    return fixtures
  }

  const result: FlatFixtureMap = new Map()

  function flatten(obj: Record<string, unknown>, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof value !== 'function'
      ) {
        // Check if this looks like a fixture handler or a namespace
        // Fixture handlers are either primitives, arrays, or functions
        // Namespaces are objects with nested procedures
        const hasNestedProcedures = Object.values(value).some(
          (v) => typeof v === 'function' || Array.isArray(v) || (typeof v === 'object' && v !== null)
        )

        if (hasNestedProcedures) {
          flatten(value as Record<string, unknown>, path)
        } else {
          // This is a static fixture value (an object)
          result.set(path, value as TRPCFixtureHandler)
        }
      } else {
        // This is a fixture handler (function, array, or primitive)
        result.set(path, value as TRPCFixtureHandler)
      }
    }
  }

  flatten(fixtures as Record<string, unknown>)
  return result
}
