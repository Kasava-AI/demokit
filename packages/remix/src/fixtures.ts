import { matchUrl, type MatchResult } from '@demokit-ai/core'
import type {
  LoaderFixtureMapObject,
  ActionFixtureMapObject,
  LoaderFixtureHandler,
  ActionFixtureHandler,
  MethodActionHandlers,
  FixtureStoreConfig,
} from './types'

/**
 * Server-side fixture store for managing demo data
 *
 * Use this to centralize fixture definitions for your Remix app.
 * Works with the demo mode detection utilities.
 */
export class FixtureStore {
  private loaders: LoaderFixtureMapObject = {}
  private actions: ActionFixtureMapObject = {}

  constructor(config?: FixtureStoreConfig) {
    if (config?.loaders) {
      this.loaders = { ...config.loaders }
    }
    if (config?.actions) {
      this.actions = { ...config.actions }
    }
  }

  /**
   * Register a loader fixture
   */
  setLoader(path: string, handler: LoaderFixtureHandler): this {
    this.loaders[path] = handler
    return this
  }

  /**
   * Register an action fixture
   */
  setAction(path: string, handler: ActionFixtureHandler | MethodActionHandlers): this {
    this.actions[path] = handler
    return this
  }

  /**
   * Get a loader fixture for a path
   */
  getLoader(path: string): LoaderFixtureHandler | undefined {
    // Try exact match first
    if (path in this.loaders) {
      return this.loaders[path]
    }

    // Try pattern matching
    for (const [pattern, handler] of Object.entries(this.loaders)) {
      const fullPattern = pattern.startsWith('GET ') ? pattern : `GET ${pattern}`
      const result = matchUrl(fullPattern, 'GET', path)
      if (result) {
        return handler
      }
    }

    return undefined
  }

  /**
   * Get an action fixture for a path and method
   */
  getAction(path: string, method: string): ActionFixtureHandler | undefined {
    // Try exact match first
    if (path in this.actions) {
      return resolveActionHandler(this.actions[path], method)
    }

    // Try pattern matching
    for (const [pattern, fixture] of Object.entries(this.actions)) {
      const fullPattern = /^(GET|POST|PUT|PATCH|DELETE)\s/.test(pattern)
        ? pattern
        : `${method} ${pattern}`
      const result = matchUrl(fullPattern, method, path)
      if (result) {
        return resolveActionHandler(fixture, method)
      }
    }

    return undefined
  }

  /**
   * Find loader fixture with match info
   */
  findLoader(path: string): { handler: LoaderFixtureHandler; match: MatchResult } | null {
    // Try exact match first
    if (path in this.loaders) {
      return {
        handler: this.loaders[path],
        match: { matched: true, params: {} },
      }
    }

    // Try pattern matching
    for (const [pattern, handler] of Object.entries(this.loaders)) {
      const fullPattern = pattern.startsWith('GET ') ? pattern : `GET ${pattern}`
      const result = matchUrl(fullPattern, 'GET', path)
      if (result) {
        return { handler, match: result }
      }
    }

    return null
  }

  /**
   * Find action fixture with match info
   */
  findAction(
    path: string,
    method: string
  ): { handler: ActionFixtureHandler; match: MatchResult } | null {
    // Try exact match first
    if (path in this.actions) {
      const handler = resolveActionHandler(this.actions[path], method)
      if (handler) {
        return {
          handler,
          match: { matched: true, params: {} },
        }
      }
    }

    // Try pattern matching
    for (const [pattern, fixture] of Object.entries(this.actions)) {
      const fullPattern = /^(GET|POST|PUT|PATCH|DELETE)\s/.test(pattern)
        ? pattern
        : `${method} ${pattern}`
      const result = matchUrl(fullPattern, method, path)
      if (result) {
        const handler = resolveActionHandler(fixture, method)
        if (handler) {
          return { handler, match: result }
        }
      }
    }

    return null
  }

  /**
   * Get all loader fixtures
   */
  getLoaders(): LoaderFixtureMapObject {
    return { ...this.loaders }
  }

  /**
   * Get all action fixtures
   */
  getActions(): ActionFixtureMapObject {
    return { ...this.actions }
  }

  /**
   * Clear all fixtures
   */
  clear(): void {
    this.loaders = {}
    this.actions = {}
  }
}

/**
 * Resolve action handler based on method
 */
function resolveActionHandler(
  fixture: ActionFixtureHandler | MethodActionHandlers,
  method: string
): ActionFixtureHandler | undefined {
  if (isMethodActionHandlers(fixture)) {
    const upperMethod = method.toUpperCase() as keyof MethodActionHandlers
    return fixture[upperMethod]
  }
  return fixture
}

/**
 * Type guard for method action handlers
 */
function isMethodActionHandlers(fixture: unknown): fixture is MethodActionHandlers {
  if (typeof fixture !== 'object' || fixture === null) {
    return false
  }
  const methods = ['POST', 'PUT', 'PATCH', 'DELETE']
  return methods.some((method) => method in fixture)
}

/**
 * Create a fixture store with initial fixtures
 *
 * @example
 * import { createFixtureStore } from '@demokit-ai/remix/server'
 *
 * export const fixtures = createFixtureStore({
 *   loaders: {
 *     '/users': [{ id: '1', name: 'Demo User' }],
 *     '/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *   },
 *   actions: {
 *     '/users': {
 *       POST: ({ formData }) => ({ id: crypto.randomUUID(), name: formData?.get('name') }),
 *     },
 *     '/users/:id': {
 *       PUT: ({ formData }) => ({ updated: true }),
 *       DELETE: ({ params }) => ({ deleted: true, id: params.id }),
 *     },
 *   },
 * })
 */
export function createFixtureStore(config?: FixtureStoreConfig): FixtureStore {
  return new FixtureStore(config)
}

/**
 * Define loader fixtures with type inference
 *
 * @example
 * const loaders = defineRemixLoaderFixtures({
 *   '/users': [{ id: '1', name: 'Demo User' }],
 *   '/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *   '/projects': async () => fetchDemoProjects(),
 * })
 */
export function defineRemixLoaderFixtures<T extends LoaderFixtureMapObject>(fixtures: T): T {
  return fixtures
}

/**
 * Define action fixtures with type inference
 *
 * @example
 * const actions = defineRemixActionFixtures({
 *   '/users': {
 *     POST: ({ formData }) => ({ id: crypto.randomUUID(), name: formData?.get('name') }),
 *   },
 *   '/users/:id': {
 *     PUT: ({ formData }) => ({ updated: true }),
 *     DELETE: ({ params }) => ({ deleted: true, id: params.id }),
 *   },
 * })
 */
export function defineRemixActionFixtures<T extends ActionFixtureMapObject>(fixtures: T): T {
  return fixtures
}

/**
 * Define complete Remix fixtures (loaders + actions)
 *
 * @example
 * const { loaders, actions } = defineRemixFixtures({
 *   loaders: {
 *     '/users': [{ id: '1', name: 'Demo User' }],
 *   },
 *   actions: {
 *     '/users': ({ formData }) => ({ created: true }),
 *   },
 * })
 */
export function defineRemixFixtures<
  L extends LoaderFixtureMapObject,
  A extends ActionFixtureMapObject,
>(config: { loaders?: L; actions?: A }): { loaders: L; actions: A } {
  return {
    loaders: (config.loaders ?? {}) as L,
    actions: (config.actions ?? {}) as A,
  }
}
