import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import type {
  CreateDemoLoaderOptions,
  CreateDemoActionOptions,
  LoaderFixtureContext,
  ActionFixtureContext,
  ActionFixtureHandler,
  MethodActionHandlers,
} from './types'

/**
 * Create a demo-aware loader function for Remix
 *
 * Returns a loader that intercepts requests when demo mode is enabled
 * and returns fixture data instead of calling the real loader.
 * Demo mode is checked server-side via cookies, headers, or request context.
 *
 * @example
 * // Basic usage with inline fixture
 * export const loader = createDemoLoader({
 *   loader: async ({ params }) => {
 *     const user = await db.users.findUnique({ where: { id: params.id } })
 *     return json({ user })
 *   },
 *   isEnabled: (request) => request.headers.get('cookie')?.includes('demo=true') ?? false,
 *   fixture: ({ params }) => ({
 *     user: { id: params.id, name: 'Demo User', email: 'demo@example.com' }
 *   }),
 * })
 *
 * @example
 * // With cookie-based detection
 * import { isDemoMode } from '@demokit-ai/remix/server'
 *
 * export const loader = createDemoLoader({
 *   loader: realLoader,
 *   isEnabled: (request) => isDemoMode(request),
 *   fixture: demoData,
 *   delay: 200, // Simulate 200ms network latency
 * })
 */
export function createDemoLoader<T = unknown>(
  options: CreateDemoLoaderOptions<T>
): (args: LoaderFunctionArgs) => Promise<T> {
  const { loader, isEnabled = () => false, fixture, delay = 0, onDemo } = options

  return async (args: LoaderFunctionArgs): Promise<T> => {
    // Check if demo mode is enabled (async to support cookie parsing)
    const enabled = await isEnabled(args.request)
    if (!enabled) {
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
 * Create a demo-aware action function for Remix
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
 *     return json({ user })
 *   },
 *   isEnabled: (request) => request.headers.get('cookie')?.includes('demo=true') ?? false,
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
 *     POST: ({ formData }) => json({ created: true, id: crypto.randomUUID() }),
 *     DELETE: ({ params }) => json({ deleted: true, id: params.id }),
 *   },
 * })
 */
export function createDemoAction<T = unknown>(
  options: CreateDemoActionOptions<T>
): (args: ActionFunctionArgs) => Promise<T> {
  const { action, isEnabled = () => false, fixture, delay = 0, onDemo } = options

  return async (args: ActionFunctionArgs): Promise<T> => {
    // Check if demo mode is enabled (async to support cookie parsing)
    const enabled = await isEnabled(args.request)
    if (!enabled) {
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
 * Helper to create a demo loader with context from request
 *
 * Simplified version that uses request-based demo mode detection.
 *
 * @example
 * import { withDemoLoader, isDemoMode } from '@demokit-ai/remix'
 *
 * export const loader = withDemoLoader(
 *   async ({ params }) => {
 *     return json(await db.users.findUnique({ where: { id: params.id } }))
 *   },
 *   {
 *     isEnabled: isDemoMode,
 *     fixture: ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *   }
 * )
 */
export function withDemoLoader<T = unknown>(
  loader: (args: LoaderFunctionArgs) => T | Promise<T>,
  options: Omit<CreateDemoLoaderOptions<T>, 'loader'>
): (args: LoaderFunctionArgs) => Promise<T> {
  return createDemoLoader({ ...options, loader })
}

/**
 * Helper to create a demo action with context from request
 *
 * Simplified version that uses request-based demo mode detection.
 *
 * @example
 * import { withDemoAction, isDemoMode } from '@demokit-ai/remix'
 *
 * export const action = withDemoAction(
 *   async ({ request }) => {
 *     const formData = await request.formData()
 *     return json(await db.users.create({ data: Object.fromEntries(formData) }))
 *   },
 *   {
 *     isEnabled: isDemoMode,
 *     fixture: ({ formData }) => ({ id: crypto.randomUUID(), name: formData?.get('name') }),
 *   }
 * )
 */
export function withDemoAction<T = unknown>(
  action: (args: ActionFunctionArgs) => T | Promise<T>,
  options: Omit<CreateDemoActionOptions<T>, 'action'>
): (args: ActionFunctionArgs) => Promise<T> {
  return createDemoAction({ ...options, action })
}
