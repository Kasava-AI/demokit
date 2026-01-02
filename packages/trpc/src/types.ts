import type { AnyRouter, inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { ReactNode } from 'react'

/**
 * Context provided to tRPC fixture handlers
 */
export interface TRPCFixtureContext<TInput = unknown> {
  /**
   * The procedure path (e.g., 'user.get', 'post.list')
   */
  path: string

  /**
   * The input passed to the procedure
   */
  input: TInput

  /**
   * The type of procedure ('query' | 'mutation' | 'subscription')
   */
  type: 'query' | 'mutation' | 'subscription'
}

/**
 * A fixture handler can be:
 * - A static value (object, array, primitive)
 * - A function that receives context and returns data
 * - An async function for dynamic fixtures
 */
export type TRPCFixtureHandler<TInput = unknown, TOutput = unknown> =
  | TOutput
  | ((context: TRPCFixtureContext<TInput>) => TOutput)
  | ((context: TRPCFixtureContext<TInput>) => Promise<TOutput>)

/**
 * Infer input types from a router
 */
export type RouterInputs<TRouter extends AnyRouter> = inferRouterInputs<TRouter>

/**
 * Infer output types from a router
 */
export type RouterOutputs<TRouter extends AnyRouter> = inferRouterOutputs<TRouter>

/**
 * Helper type to get nested procedure paths
 */
type Paths<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends (...args: unknown[]) => unknown
          ? `${Prefix}${K}`
          : T[K] extends object
            ? Paths<T[K], `${Prefix}${K}.`>
            : never
        : never
    }[keyof T]
  : never

/**
 * Deep partial type for fixture maps
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: T[P] extends object
        ? T[P] extends (...args: unknown[]) => unknown
          ? TRPCFixtureHandler<
              Parameters<T[P]>[0] extends { input: infer I } ? I : undefined,
              Awaited<ReturnType<T[P]>>
            >
          : DeepPartial<T[P]>
        : T[P]
    }
  : T

/**
 * Type-safe fixture map derived from router type
 *
 * This creates a type that mirrors the router structure but replaces
 * procedures with fixture handlers that have the correct input/output types.
 */
export type TypedFixtureMap<TRouter extends AnyRouter> = {
  [K in keyof TRouter['_def']['procedures']]?: TRouter['_def']['procedures'][K] extends {
    _input_in: infer TInput
    _output_out: infer TOutput
  }
    ? TRPCFixtureHandler<TInput, TOutput>
    : never
}

/**
 * Nested fixture map type that mirrors router structure
 */
export type NestedFixtureMap<TRouter extends AnyRouter> = {
  [K in keyof TRouter]?: TRouter[K] extends AnyRouter
    ? NestedFixtureMap<TRouter[K]>
    : TRouter[K] extends (...args: unknown[]) => unknown
      ? TRPCFixtureHandler<
          Parameters<TRouter[K]>[0] extends { input: infer I } ? I : undefined,
          Awaited<ReturnType<TRouter[K]>>
        >
      : never
}

/**
 * Flat fixture map using dot-notation paths
 */
export type FlatFixtureMap = Map<string, TRPCFixtureHandler>

/**
 * Object-based fixture map (easier to define, keys are procedure paths)
 */
export type FlatFixtureMapObject = Record<string, TRPCFixtureHandler>

/**
 * Options for creating a demo tRPC link
 */
export interface CreateDemoLinkOptions<TRouter extends AnyRouter = AnyRouter> {
  /**
   * Type-safe fixture definitions
   * Can be a nested object matching router structure or a flat Map
   */
  fixtures?: NestedFixtures<TRouter> | FlatFixtureMap | FlatFixtureMapObject

  /**
   * Function to check if demo mode is enabled
   * @default () => false
   */
  isEnabled?: () => boolean

  /**
   * Delay in ms before returning fixture data (simulates network latency)
   * @default 0
   */
  delay?: number

  /**
   * Only intercept these procedure paths (dot notation)
   * If not provided, intercepts all matching procedures
   * @example ['user.list', 'user.get']
   */
  include?: string[]

  /**
   * Exclude these procedure paths from interception
   * Takes precedence over include
   * @example ['auth.login']
   */
  exclude?: string[]

  /**
   * Called when no fixture is found for a procedure
   */
  onMissing?: (path: string, input: unknown) => void
}

/**
 * Result of fixture matching
 */
export interface FixtureMatchResult<TOutput = unknown> {
  /**
   * Whether a fixture was found
   */
  matched: boolean

  /**
   * The fixture handler (if found)
   */
  handler?: TRPCFixtureHandler<unknown, TOutput>

  /**
   * The matched procedure path
   */
  path: string
}

/**
 * Type for nested fixture structure matching router
 */
export type NestedFixtures<TRouter extends AnyRouter> = DeepPartial<TRouter>

/**
 * Configuration for DemoTRPCProvider
 */
export interface DemoTRPCProviderConfig<TRouter extends AnyRouter = AnyRouter> {
  /**
   * Type-safe fixture definitions
   */
  fixtures?: NestedFixtures<TRouter> | FlatFixtureMap | FlatFixtureMapObject

  /**
   * Whether demo mode is enabled
   */
  enabled?: boolean

  /**
   * Delay in ms before returning fixture data
   * @default 0
   */
  delay?: number

  /**
   * Procedure paths to include
   */
  include?: string[]

  /**
   * Procedure paths to exclude
   */
  exclude?: string[]
}

/**
 * Props for DemoTRPCProvider
 */
export interface DemoTRPCProviderProps<TRouter extends AnyRouter = AnyRouter>
  extends DemoTRPCProviderConfig<TRouter> {
  /**
   * Child components
   */
  children: ReactNode
}

/**
 * State returned by useDemoTRPC hook
 */
export interface DemoTRPCState {
  /**
   * Whether demo mode is enabled
   */
  isDemoMode: boolean

  /**
   * Set a fixture for a specific procedure path
   */
  setFixture: (path: string, handler: TRPCFixtureHandler) => void

  /**
   * Remove a fixture
   */
  removeFixture: (path: string) => void

  /**
   * Get all registered fixtures
   */
  getFixtures: () => FlatFixtureMap
}
