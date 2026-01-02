/**
 * @demokit-ai/swr
 *
 * SWR adapter for DemoKit.
 * Mock fetches and mutations when demo mode is enabled using SWR's middleware pattern.
 *
 * @example
 * import { DemoSWRProvider } from '@demokit-ai/swr'
 *
 * // Define fixtures
 * const fixtures = {
 *   '/api/users': [
 *     { id: '1', name: 'Demo User' },
 *     { id: '2', name: 'Another User' },
 *   ],
 *   '["/api/users", ":id"]': ({ params }) => ({
 *     id: params.id,
 *     name: `User ${params.id}`,
 *   }),
 *   '["/api/projects", { status: ":status" }]': ({ params }) => [
 *     { id: '1', name: 'Project', status: params.status },
 *   ],
 * }
 *
 * // Wrap your app
 * <DemoSWRProvider fixtures={fixtures} enabled={true}>
 *   <App />
 * </DemoSWRProvider>
 *
 * @packageDocumentation
 */

// Provider
export { DemoSWRProvider } from './provider'

// Hooks
export { useDemoSWR, useIsDemoSWRMode, useDemoSWRMutation } from './hooks'
export type { UseDemoSWRMutationOptions } from './hooks'

// Fetcher utilities
export { createDemoFetcher, defaultFetcher } from './fetcher'
export type { CreateDemoFetcherOptions } from './fetcher'

// Middleware
export { createDemoMiddleware } from './middleware'
export type { CreateDemoMiddlewareOptions } from './middleware'

// Matcher utilities
export {
  findMatchingFixture,
  normalizeKey,
  normalizeFixtureMap,
  parsePatternString,
  matchQueryKey,
} from './matcher'

// Types
export type {
  SWRFixtureContext,
  SWRFixtureHandler,
  SWRFixtureMap,
  SWRFixtureMapObject,
  SWRMutationFixtureContext,
  SWRMutationFixtureHandler,
  SWRMutationFixtureMap,
  SWRMutationFixtureMapObject,
  DemoSWRProviderConfig,
  DemoSWRProviderProps,
  DemoSWRState,
} from './types'
