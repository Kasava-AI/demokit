/**
 * @demokit-ai/tanstack-query
 *
 * TanStack Query v5 adapter for DemoKit.
 * Mock queries and mutations when demo mode is enabled.
 *
 * @example
 * import { DemoQueryProvider } from '@demokit-ai/tanstack-query'
 *
 * // Define query fixtures
 * const queryFixtures = {
 *   '["users"]': [
 *     { id: '1', name: 'Demo User' },
 *     { id: '2', name: 'Another User' },
 *   ],
 *   '["users", ":id"]': ({ params }) => ({
 *     id: params.id,
 *     name: `User ${params.id}`,
 *   }),
 *   '["projects", { status: ":status" }]': ({ params }) => [
 *     { id: '1', name: 'Project', status: params.status },
 *   ],
 * }
 *
 * // Wrap your app
 * <DemoQueryProvider queries={queryFixtures} enabled={true}>
 *   <App />
 * </DemoQueryProvider>
 *
 * @packageDocumentation
 */

// Provider
export { DemoQueryProvider } from './provider'

// Hooks
export { useDemoQuery, useIsDemoQueryMode } from './hooks'
export { useDemoMutation, createMutationOptions } from './mutation'
export type { UseDemoMutationOptions, DemoMutationConfig } from './mutation'

// Client utilities
export { createDemoQueryClient, createDemoQueryFn, type DemoQueryClient } from './client'

// Matcher utilities
export {
  findMatchingFixture,
  normalizeQueryKey,
  normalizeFixtureMap,
  parsePatternString,
  matchQueryKey,
} from './matcher'

// Types
export type {
  QueryFixtureContext,
  QueryFixtureHandler,
  QueryFixtureMap,
  QueryFixtureMapObject,
  MutationFixtureContext,
  MutationFixtureHandler,
  MutationFixtureMap,
  MutationFixtureMapObject,
  DemoQueryProviderConfig,
  DemoQueryProviderProps,
  DemoQueryState,
} from './types'
