/**
 * @demokit-ai/next
 *
 * Next.js adapter for DemoKit.
 * Full integration with App Router, middleware, and API routes.
 *
 * @example
 * // 1. Define your fixtures and scenarios
 * import { defineFixtures, defineScenarios, createDemoConfig } from '@demokit-ai/next'
 *
 * export const demoConfig = createDemoConfig({
 *   fixtures: defineFixtures({
 *     'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 *   }),
 *   scenarios: defineScenarios({
 *     'empty': { 'GET /api/users': () => [] },
 *   }),
 * })
 *
 * // 2. Add middleware (middleware.ts)
 * import { demoMiddleware } from '@demokit-ai/next/middleware'
 * export const middleware = demoMiddleware()
 *
 * // 3. Wrap your app (app/providers.tsx)
 * import { DemoKitNextProvider } from '@demokit-ai/next/client'
 * import { demoConfig } from '@/lib/demo'
 *
 * export function Providers({ children }) {
 *   return (
 *     <DemoKitNextProvider {...demoConfig}>
 *       {children}
 *     </DemoKitNextProvider>
 *   )
 * }
 *
 * // 4. Enable demo mode via URL: ?demo=true or ?demo=scenario-name
 *
 * @packageDocumentation
 */

// Configuration helpers
export {
  defineFixtures,
  defineScenarios,
  createScenario,
  mergeFixtures,
  createDemoConfig,
  createRemoteSource,
} from './config'

// Types
export type {
  DemoKitNextConfig,
  DemoKitNextProviderProps,
  DemoMiddlewareConfig,
  MiddlewareResult,
  DemoScenario,
  DefineFixtures,
  DefineScenarios,
  RemoteSourceConfig,
} from './types'

// Re-export core types
export type { FixtureMap, FixtureHandler, RequestContext } from '@demokit-ai/core'
