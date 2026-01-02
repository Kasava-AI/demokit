import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import type {
  CreateDemoLoaderOptions,
  CreateDemoActionOptions,
  LoaderFixtureContext,
  ActionFixtureContext,
  ActionFixtureHandler,
  MethodActionHandlers,
} from './types'

/**
 * Create a demo-aware loader function
 *
 * Returns a loader that intercepts requests when demo mode is enabled
 * and returns fixture data instead of calling the real loader.
 *
 * @example
 * // Basic usage with inline fixture
 * export const loader = createDemoLoader({
 *   loader: async ({ params }) => {
 *     const user = await db.users.findUnique({ where: { id: params.id } })
 *     return { user }
 *   },
 *   isEnabled: () => localStorage.getItem('demoMode') === 'true',
 *   fixture: ({ params }) => ({
 *     user: { id: params.id, name: 'Demo User', email: 'demo@example.com' }
 *   }),
 * })
 *
 * @example
 * // With simulated delay
 * export const loader = createDemoLoader({
 *   loader: realLoader,
 *   isEnabled: isDemoMode,
 *   fixture: demoData,
 *   delay: 200, // Simulate 200ms network latency
 * })
 */
export function createDemoLoader<T = unknown>(
  options: CreateDemoLoaderOptions<T>
): (args: LoaderFunctionArgs) => Promise<T> {
  const { loader, isEnabled = () => false, fixture, delay = 0, onDemo } = options

  return async (args: LoaderFunctionArgs): Promise<T> => {
    // Check if demo mode is enabled
    if (!isEnabled()) {
      return loader(args)
    }

    // If no fixture provided, fall back to real loader
    if (fixture === undefined) {
      return loader(args)
    }

    // Build context for fixture handler
    const context: LoaderFixtureContext = {
      params: args.params,
      request: args.request,
      path: new URL(args.request.url).pathname,
    }

    // Notify callback
    onDemo?.(context)

    // Apply delay if configured
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // Execute fixture
    return executeFixture(fixture, context)
  }
}

/**
 * Create a demo-aware action function
 *
 * Returns an action that intercepts requests when demo mode is enabled
 * and returns fixture data instead of calling the real action.
 *
 * @example
 * // Basic usage with inline fixture
 * export const action = createDemoAction({
 *   action: async ({ request }) => {
 *     const formData = await request.formData()
 *     const user = await db.users.create({ data: Object.fromEntries(formData) })
 *     return { user }
 *   },
 *   isEnabled: () => localStorage.getItem('demoMode') === 'true',
 *   fixture: async ({ formData }) => ({
 *     user: { id: crypto.randomUUID(), ...Object.fromEntries(formData!) }
 *   }),
 * })
 *
 * @example
 * // With method-specific fixtures
 * export const action = createDemoAction({
 *   action: realAction,
 *   isEnabled: isDemoMode,
 *   fixture: {
 *     POST: ({ formData }) => ({ created: true, id: crypto.randomUUID() }),
 *     DELETE: ({ params }) => ({ deleted: true, id: params.id }),
 *   },
 * })
 */
export function createDemoAction<T = unknown>(
  options: CreateDemoActionOptions<T>
): (args: ActionFunctionArgs) => Promise<T> {
  const { action, isEnabled = () => false, fixture, delay = 0, onDemo } = options

  return async (args: ActionFunctionArgs): Promise<T> => {
    // Check if demo mode is enabled
    if (!isEnabled()) {
      return action(args)
    }

    // If no fixture provided, fall back to real action
    if (fixture === undefined) {
      return action(args)
    }

    // Parse form data for convenience
    let formData: FormData | undefined
    try {
      formData = await args.request.clone().formData()
    } catch {
      // Not form data, that's fine
    }

    // Build context for fixture handler
    const context: ActionFixtureContext = {
      params: args.params,
      request: args.request,
      path: new URL(args.request.url).pathname,
      formData,
    }

    // Notify callback
    onDemo?.(context)

    // Apply delay if configured
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // Check if fixture is method-specific
    if (isMethodActionHandlers(fixture)) {
      const method = args.request.method.toUpperCase() as keyof MethodActionHandlers
      const handler = fixture[method]
      if (handler) {
        return executeFixture(handler, context) as Promise<T>
      }
      // No handler for this method, fall back to real action
      return action(args)
    }

    // Execute fixture
    return executeFixture(fixture as ActionFixtureHandler<T>, context)
  }
}

/**
 * Execute a fixture handler (static value or function)
 */
async function executeFixture<T, C extends LoaderFixtureContext | ActionFixtureContext>(
  fixture: T | ((context: C) => T | Promise<T>),
  context: C
): Promise<T> {
  if (typeof fixture === 'function') {
    return (fixture as (context: C) => T | Promise<T>)(context)
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
 * Helper to create a demo loader with state from context
 *
 * Use this with DemoRouterProvider for centralized fixture management.
 *
 * @example
 * import { withDemoLoader } from '@demokit-ai/react-router'
 *
 * export const loader = withDemoLoader(
 *   async ({ params }) => {
 *     return db.users.findUnique({ where: { id: params.id } })
 *   },
 *   '/users/:id' // Route path for fixture lookup
 * )
 */
export function withDemoLoader<T = unknown>(
  loader: (args: LoaderFunctionArgs) => T | Promise<T>,
  _routePath?: string
): (args: LoaderFunctionArgs) => Promise<T> {
  // This is a placeholder - the actual implementation would use context
  // For now, it just returns the loader as-is
  // Real implementation would check DemoRouterContext for fixtures
  return async (args: LoaderFunctionArgs): Promise<T> => {
    return loader(args)
  }
}

/**
 * Helper to create a demo action with state from context
 *
 * Use this with DemoRouterProvider for centralized fixture management.
 *
 * @example
 * import { withDemoAction } from '@demokit-ai/react-router'
 *
 * export const action = withDemoAction(
 *   async ({ request }) => {
 *     const formData = await request.formData()
 *     return db.users.create({ data: Object.fromEntries(formData) })
 *   },
 *   '/users' // Route path for fixture lookup
 * )
 */
export function withDemoAction<T = unknown>(
  action: (args: ActionFunctionArgs) => T | Promise<T>,
  _routePath?: string
): (args: ActionFunctionArgs) => Promise<T> {
  // This is a placeholder - the actual implementation would use context
  // For now, it just returns the action as-is
  // Real implementation would check DemoRouterContext for fixtures
  return async (args: ActionFunctionArgs): Promise<T> => {
    return action(args)
  }
}