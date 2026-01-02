/**
 * @demokit-ai/remix
 *
 * Remix adapter for DemoKit.
 * Demo-aware loader and action mocking for Remix applications.
 *
 * Since Remix loaders run on the server, demo mode detection happens server-side
 * via cookies, headers, or environment variables. This package provides both
 * server-side utilities and client-side state management.
 *
 * ## Server-Side Usage
 *
 * For loaders and actions, use the server utilities:
 *
 * @example
 * // In your loader file
 * import { createDemoLoader } from '@demokit-ai/remix'
 * import { isDemoMode } from '@demokit-ai/remix/server'
 *
 * export const loader = createDemoLoader({
 *   loader: async ({ params }) => {
 *     const user = await db.users.findUnique({ where: { id: params.id } })
 *     return json({ user })
 *   },
 *   isEnabled: isDemoMode,
 *   fixture: ({ params }) => ({
 *     user: { id: params.id, name: 'Demo User', email: 'demo@example.com' }
 *   }),
 * })
 *
 * @example
 * // Action with method-specific fixtures
 * import { createDemoAction } from '@demokit-ai/remix'
 * import { isDemoMode } from '@demokit-ai/remix/server'
 *
 * export const action = createDemoAction({
 *   action: async ({ request }) => {
 *     const formData = await request.formData()
 *     return json(await db.users.update({ ... }))
 *   },
 *   isEnabled: isDemoMode,
 *   fixture: {
 *     PUT: ({ formData }) => json({ updated: true, name: formData?.get('name') }),
 *     DELETE: ({ params }) => json({ deleted: true, id: params.id }),
 *   },
 * })
 *
 * ## Direct Demo Mode Check
 *
 * For more control, use isDemoMode directly:
 *
 * @example
 * import { isDemoMode, getDemoData } from '@demokit-ai/remix/server'
 *
 * export async function loader({ request, params }: LoaderFunctionArgs) {
 *   if (isDemoMode(request)) {
 *     return json({
 *       user: { id: params.id, name: 'Demo User' }
 *     })
 *   }
 *   return json({
 *     user: await db.users.findFirst({ where: { id: params.id } })
 *   })
 * }
 *
 * ## Fixture Store (Centralized)
 *
 * For larger apps, use a centralized fixture store:
 *
 * @example
 * // In entry.server.tsx or root.tsx loader
 * import { setupDemoFixtures } from '@demokit-ai/remix/server'
 *
 * setupDemoFixtures({
 *   loaders: {
 *     '/users': [{ id: '1', name: 'Demo User' }],
 *     '/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *     '/projects': async () => fetchDemoProjects(),
 *   },
 *   actions: {
 *     '/users': {
 *       POST: ({ formData }) => ({ id: crypto.randomUUID(), name: formData?.get('name') }),
 *     },
 *   },
 * })
 *
 * ## Client-Side State (Optional)
 *
 * For client-side demo mode toggle UI:
 *
 * @example
 * import { DemoRemixProvider, useDemoRemix } from '@demokit-ai/remix'
 *
 * export default function App() {
 *   return (
 *     <DemoRemixProvider enabled={isDemoFromCookie}>
 *       <Outlet />
 *       <DemoControls />
 *     </DemoRemixProvider>
 *   )
 * }
 *
 * function DemoControls() {
 *   const { enabled, toggle } = useDemoRemix()
 *   return (
 *     <button onClick={toggle}>
 *       Demo: {enabled ? 'ON' : 'OFF'}
 *     </button>
 *   )
 * }
 *
 * ## Cookie-Based Demo Mode
 *
 * Enable demo mode via URL parameter or cookie:
 *
 * @example
 * // Enable with URL: /any-page?demo=true
 * // Enable with cookie: Set 'demokit-demo-mode=true' cookie
 * // Enable with header: Set 'x-demokit-demo-mode: true' header
 * // Enable globally: Set DEMOKIT_DEMO_MODE=true env var
 *
 * @packageDocumentation
 */

// Wrapper utilities (client + server compatible)
export { createDemoLoader, createDemoAction, withDemoLoader, withDemoAction } from './wrappers'

// Fixture utilities
export {
  FixtureStore,
  createFixtureStore,
  defineRemixLoaderFixtures,
  defineRemixActionFixtures,
  defineRemixFixtures,
} from './fixtures'

// Provider and hooks (client-side)
export {
  DemoRemixProvider,
  useDemoRemix,
  useIsDemoRemixMode,
  useDemoRemixOptional,
} from './provider'

// Types
export type {
  LoaderFixtureContext,
  ActionFixtureContext,
  LoaderFixtureHandler,
  ActionFixtureHandler,
  LoaderFixtureMap,
  LoaderFixtureMapObject,
  ActionFixtureMap,
  ActionFixtureMapObject,
  MethodActionHandlers,
  CreateDemoLoaderOptions,
  CreateDemoActionOptions,
  DemoRouteOptions,
  DemoRemixState,
  DemoRemixProviderConfig,
  DemoRemixProviderProps,
  DemoModeOptions,
  FixtureStoreConfig,
  RemixResponse,
} from './types'
