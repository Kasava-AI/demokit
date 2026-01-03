/**
 * @demokit-ai/trpc
 *
 * Type-safe tRPC v11 adapter for DemoKit.
 * Mock tRPC procedures with full type inference from your router.
 *
 * @example
 * // Define type-safe fixtures
 * import { defineTRPCFixtures } from '@demokit-ai/trpc'
 * import type { AppRouter } from '../server/router'
 *
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
 * })
 *
 * @example
 * // Create tRPC client with demo link
 * import { createTRPCClient, httpBatchLink } from '@trpc/client'
 * import { createDemoLink } from '@demokit-ai/trpc'
 *
 * const client = createTRPCClient<AppRouter>({
 *   links: [
 *     createDemoLink({
 *       fixtures,
 *       isEnabled: () => localStorage.getItem('demoMode') === 'true',
 *       delay: 100, // Simulate 100ms latency
 *     }),
 *     httpBatchLink({ url: '/api/trpc' }),
 *   ],
 * })
 *
 * @example
 * // With state management
 * import { createDemoLinkWithState } from '@demokit-ai/trpc'
 *
 * const { link, enable, disable, setFixture } = createDemoLinkWithState({
 *   fixtures,
 *   enabled: false,
 * })
 *
 * const client = createTRPCClient<AppRouter>({
 *   links: [link, httpBatchLink({ url: '/api/trpc' })],
 * })
 *
 * // Toggle demo mode at runtime
 * enable()
 * disable()
 *
 * // Add fixtures at runtime
 * setFixture('analytics.overview', () => ({ visits: 1000 }))
 *
 * @packageDocumentation
 */

// Link factory
export { createDemoLink, createDemoLinkWithState } from './link'
export type { DemoLinkWithState } from './link'

// Config helpers
export { createRemoteSource } from './config'

// Fixture definition helpers
export { defineTRPCFixtures, defineFixtureMap, createFixtureHandler, normalizeFixtures } from './fixtures'

// Matcher utilities
export {
  findMatchingFixture,
  shouldIntercept,
  matchPath,
  filterFixtures,
  getFixturePaths,
  mergeFixtures,
} from './matcher'

// Types
export type {
  TRPCFixtureContext,
  TRPCFixtureHandler,
  RouterInputs,
  RouterOutputs,
  NestedFixtures,
  FlatFixtureMap,
  FlatFixtureMapObject,
  CreateDemoLinkOptions,
  FixtureMatchResult,
  DemoTRPCProviderConfig,
  DemoTRPCProviderProps,
  DemoTRPCState,
  RemoteSourceConfig,
} from './types'
