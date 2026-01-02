import type { RouteObject } from 'react-router'
import { matchUrl, type MatchResult } from '@demokit-ai/core'
import type {
  DemoRouteOptions,
  LoaderFixtureMapObject,
  ActionFixtureMapObject,
  LoaderFixtureContext,
  ActionFixtureContext,
  LoaderFixtureHandler,
  ActionFixtureHandler,
  MethodActionHandlers,
} from './types'

/**
 * Create demo-aware routes from existing route configuration
 *
 * Wraps all loaders and actions in routes to check demo mode
 * and return fixtures when enabled.
 *
 * @example
 * import { createBrowserRouter } from 'react-router'
 * import { createDemoRoutes } from '@demokit-ai/react-router'
 *
 * const routes = [
 *   {
 *     path: '/',
 *     Component: Root,
 *     children: [
 *       {
 *         path: 'users',
 *         Component: UserList,
 *         loader: fetchUsers,
 *       },
 *       {
 *         path: 'users/:id',
 *         Component: UserDetail,
 *         loader: fetchUser,
 *         action: updateUser,
 *       },
 *     ],
 *   },
 * ]
 *
 * const loaders = {
 *   '/users': [{ id: '1', name: 'Demo User' }],
 *   '/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 * }
 *
 * const actions = {
 *   '/users/:id': ({ formData }) => ({ updated: true }),
 * }
 *
 * const demoRoutes = createDemoRoutes(routes, {
 *   isEnabled: () => localStorage.getItem('demoMode') === 'true',
 *   loaders,
 *   actions,
 * })
 *
 * const router = createBrowserRouter(demoRoutes)
 */
export function createDemoRoutes(
  routes: RouteObject[],
  options: DemoRouteOptions = {}
): RouteObject[] {
  const { isEnabled = () => false, delay = 0, loaders = {}, actions = {}, onMissing } = options

  return routes.map((route) => wrapRoute(route, '', { isEnabled, delay, loaders, actions, onMissing }))
}

/**
 * Recursively wrap a route and its children
 */
function wrapRoute(
  route: RouteObject,
  parentPath: string,
  options: Required<Omit<DemoRouteOptions, 'onMissing'>> & Pick<DemoRouteOptions, 'onMissing'>
): RouteObject {
  const { isEnabled, delay, loaders, actions, onMissing } = options

  // Build full path for this route
  const fullPath = buildFullPath(parentPath, route.path)

  // Clone the route
  const wrappedRoute: RouteObject = { ...route }

  // Wrap loader if present (loader can be a function or true for lazy loading)
  if (route.loader && typeof route.loader === 'function') {
    const originalLoader = route.loader
    wrappedRoute.loader = async (args) => {
      if (!isEnabled()) {
        return originalLoader(args)
      }

      // Find matching fixture
      const fixture = findLoaderFixture(fullPath, loaders)
      if (!fixture) {
        onMissing?.('loader', fullPath)
        return originalLoader(args)
      }

      // Build context
      const context: LoaderFixtureContext = {
        params: args.params,
        request: args.request,
        path: fullPath,
      }

      // Apply delay
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      // Execute fixture
      return executeHandler(fixture.handler, context)
    }
  }

  // Wrap action if present (action can be a function or true for lazy loading)
  if (route.action && typeof route.action === 'function') {
    const originalAction = route.action
    wrappedRoute.action = async (args) => {
      if (!isEnabled()) {
        return originalAction(args)
      }

      // Find matching fixture
      const fixture = findActionFixture(fullPath, args.request.method, actions)
      if (!fixture) {
        onMissing?.('action', fullPath)
        return originalAction(args)
      }

      // Parse form data for convenience
      let formData: FormData | undefined
      try {
        formData = await args.request.clone().formData()
      } catch {
        // Not form data
      }

      // Build context
      const context: ActionFixtureContext = {
        params: args.params,
        request: args.request,
        path: fullPath,
        formData,
      }

      // Apply delay
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      // Execute fixture
      return executeHandler(fixture.handler, context)
    }
  }

  // Recursively wrap children
  if (route.children) {
    wrappedRoute.children = route.children.map((child) => wrapRoute(child, fullPath, options))
  }

  return wrappedRoute
}

/**
 * Build full path from parent and route path
 */
function buildFullPath(parentPath: string, routePath?: string): string {
  if (!routePath) return parentPath || '/'
  if (routePath.startsWith('/')) return routePath
  if (!parentPath || parentPath === '/') return `/${routePath}`
  return `${parentPath}/${routePath}`
}

/**
 * Find a matching loader fixture
 */
function findLoaderFixture(
  path: string,
  loaders: LoaderFixtureMapObject
): { handler: LoaderFixtureHandler; match: MatchResult } | null {
  // Try exact match first
  if (path in loaders) {
    return {
      handler: loaders[path],
      match: { matched: true, params: {} },
    }
  }

  // Try pattern matching (use GET method for loaders since they're always GET)
  for (const [pattern, handler] of Object.entries(loaders)) {
    // Format pattern as "GET /path" for matchUrl
    const fullPattern = pattern.startsWith('GET ') ? pattern : `GET ${pattern}`
    const result = matchUrl(fullPattern, 'GET', path)
    if (result) {
      return { handler, match: result }
    }
  }

  return null
}

/**
 * Find a matching action fixture
 */
function findActionFixture(
  path: string,
  method: string,
  actions: ActionFixtureMapObject
): { handler: ActionFixtureHandler; match: MatchResult } | null {
  // Try exact match first
  if (path in actions) {
    const fixture = actions[path]
    const handler = resolveActionHandler(fixture, method)
    if (handler) {
      return {
        handler,
        match: { matched: true, params: {} },
      }
    }
  }

  // Try pattern matching with the actual HTTP method
  for (const [pattern, fixture] of Object.entries(actions)) {
    // Format pattern as "METHOD /path" for matchUrl
    const fullPattern = /^(GET|POST|PUT|PATCH|DELETE)\s/.test(pattern) ? pattern : `${method} ${pattern}`
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
 * Resolve action handler based on method
 */
function resolveActionHandler(
  fixture: ActionFixtureHandler | MethodActionHandlers,
  method: string
): ActionFixtureHandler | null {
  // Check if it's method-specific
  if (isMethodActionHandlers(fixture)) {
    const upperMethod = method.toUpperCase() as keyof MethodActionHandlers
    return fixture[upperMethod] ?? null
  }
  // It's a direct handler
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
 * Execute a fixture handler
 */
async function executeHandler<T, C extends LoaderFixtureContext | ActionFixtureContext>(
  handler: T | ((context: C) => T | Promise<T>),
  context: C
): Promise<T> {
  if (typeof handler === 'function') {
    return (handler as (context: C) => T | Promise<T>)(context)
  }
  return handler
}

/**
 * Define loader fixtures with type inference
 *
 * @example
 * const loaders = defineLoaderFixtures({
 *   '/users': [{ id: '1', name: 'Demo User' }],
 *   '/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 * })
 */
export function defineLoaderFixtures<T extends LoaderFixtureMapObject>(fixtures: T): T {
  return fixtures
}

/**
 * Define action fixtures with type inference
 *
 * @example
 * const actions = defineActionFixtures({
 *   '/users': ({ formData }) => ({ id: '1', name: formData?.get('name') }),
 *   '/users/:id': {
 *     PUT: ({ formData }) => ({ updated: true }),
 *     DELETE: ({ params }) => ({ deleted: true, id: params.id }),
 *   },
 * })
 */
export function defineActionFixtures<T extends ActionFixtureMapObject>(fixtures: T): T {
  return fixtures
}
