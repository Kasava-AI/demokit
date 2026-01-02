import type { FixtureMap } from '@demokit-ai/core'
import type { DemoKitNextConfig, DemoScenario } from './types'

/**
 * Helper to define fixtures with type safety
 *
 * @example
 * const fixtures = defineFixtures({
 *   'GET /api/users': () => [
 *     { id: '1', name: 'Demo User' },
 *   ],
 *   'GET /api/users/:id': ({ params }) => ({
 *     id: params.id,
 *     name: `User ${params.id}`,
 *   }),
 *   'POST /api/users': async ({ body }) => ({
 *     id: crypto.randomUUID(),
 *     ...body,
 *   }),
 * })
 */
export function defineFixtures<T extends FixtureMap>(fixtures: T): T {
  return fixtures
}

/**
 * Helper to define scenarios with type safety
 *
 * @example
 * const scenarios = defineScenarios({
 *   'empty-state': {
 *     'GET /api/users': () => [],
 *     'GET /api/projects': () => [],
 *   },
 *   'error-state': {
 *     'GET /api/users': () => {
 *       throw new Error('API Error')
 *     },
 *   },
 *   'new-user': {
 *     'GET /api/users': () => [
 *       { id: '1', name: 'Welcome, New User!', isNew: true },
 *     ],
 *   },
 * })
 */
export function defineScenarios<T extends Record<string, FixtureMap>>(scenarios: T): T {
  return scenarios
}

/**
 * Helper to create a scenario object
 *
 * @example
 * const emptyStateScenario = createScenario({
 *   name: 'empty-state',
 *   description: 'Shows the app with no data',
 *   fixtures: {
 *     'GET /api/users': () => [],
 *   },
 * })
 */
export function createScenario(scenario: DemoScenario): DemoScenario {
  return scenario
}

/**
 * Merge multiple fixture maps
 *
 * @example
 * const allFixtures = mergeFixtures(
 *   baseFixtures,
 *   usersFixtures,
 *   projectsFixtures
 * )
 */
export function mergeFixtures(...fixtureMaps: FixtureMap[]): FixtureMap {
  return Object.assign({}, ...fixtureMaps)
}

/**
 * Create a complete DemoKit Next.js configuration
 *
 * @example
 * // lib/demo.ts
 * import { createDemoConfig, defineFixtures, defineScenarios } from '@demokit-ai/next'
 *
 * export const demoConfig = createDemoConfig({
 *   fixtures: defineFixtures({
 *     'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 *   }),
 *   scenarios: defineScenarios({
 *     'empty': { 'GET /api/users': () => [] },
 *   }),
 * })
 */
export function createDemoConfig(config: DemoKitNextConfig): DemoKitNextConfig {
  return {
    storageKey: 'demokit-mode',
    cookieName: 'demokit-mode',
    urlParam: 'demo',
    ...config,
  }
}
