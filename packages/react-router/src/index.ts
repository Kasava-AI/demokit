/**
 * @demokit-ai/react-router
 *
 * React Router v7 adapter for DemoKit.
 * Demo-aware loader and action wrappers for data router APIs.
 *
 * @example
 * // Individual loader/action wrapping
 * import { createDemoLoader, createDemoAction } from '@demokit-ai/react-router'
 *
 * export const loader = createDemoLoader({
 *   loader: async ({ params }) => {
 *     return db.users.findUnique({ where: { id: params.id } })
 *   },
 *   isEnabled: () => localStorage.getItem('demoMode') === 'true',
 *   fixture: ({ params }) => ({
 *     id: params.id,
 *     name: 'Demo User',
 *     email: 'demo@example.com',
 *   }),
 * })
 *
 * export const action = createDemoAction({
 *   action: async ({ request }) => {
 *     const formData = await request.formData()
 *     return db.users.update({ where: { id: formData.get('id') }, data: { ... } })
 *   },
 *   isEnabled: () => localStorage.getItem('demoMode') === 'true',
 *   fixture: {
 *     PUT: ({ formData }) => ({ updated: true, name: formData?.get('name') }),
 *     DELETE: ({ params }) => ({ deleted: true, id: params.id }),
 *   },
 * })
 *
 * @example
 * // Route configuration wrapping
 * import { createBrowserRouter } from 'react-router'
 * import { createDemoRoutes, defineLoaderFixtures, defineActionFixtures } from '@demokit-ai/react-router'
 *
 * const routes = [
 *   {
 *     path: '/',
 *     Component: Root,
 *     children: [
 *       { path: 'users', Component: UserList, loader: fetchUsers },
 *       { path: 'users/:id', Component: UserDetail, loader: fetchUser, action: updateUser },
 *     ],
 *   },
 * ]
 *
 * const loaders = defineLoaderFixtures({
 *   '/users': [{ id: '1', name: 'Demo User' }],
 *   '/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 * })
 *
 * const actions = defineActionFixtures({
 *   '/users/:id': ({ formData }) => ({ updated: true }),
 * })
 *
 * const demoRoutes = createDemoRoutes(routes, {
 *   isEnabled: () => localStorage.getItem('demoMode') === 'true',
 *   loaders,
 *   actions,
 *   delay: 100,
 * })
 *
 * const router = createBrowserRouter(demoRoutes)
 *
 * @example
 * // With provider for state management
 * import { DemoRouterProvider, useDemoRouter } from '@demokit-ai/react-router'
 *
 * function App() {
 *   return (
 *     <DemoRouterProvider loaders={loaders} actions={actions} enabled>
 *       <RouterProvider router={router} />
 *       <DemoControls />
 *     </DemoRouterProvider>
 *   )
 * }
 *
 * function DemoControls() {
 *   const { enabled, toggle, setLoader } = useDemoRouter()
 *   return (
 *     <div>
 *       <button onClick={toggle}>Demo: {enabled ? 'ON' : 'OFF'}</button>
 *       <button onClick={() => setLoader('/custom', () => ({ custom: true }))}>
 *         Add Custom Fixture
 *       </button>
 *     </div>
 *   )
 * }
 *
 * @packageDocumentation
 */

// Wrapper utilities
export { createDemoLoader, createDemoAction, withDemoLoader, withDemoAction } from './wrappers'

// Route utilities
export { createDemoRoutes, defineLoaderFixtures, defineActionFixtures } from './routes'

// Config helpers
export { createRemoteSource } from './config'

// Provider and hooks
export { DemoRouterProvider, useDemoRouter, useIsDemoRouterMode, useDemoRouterOptional } from './provider'

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
  DemoRouterState,
  DemoRouterProviderConfig,
  DemoRouterProviderProps,
  RemoteSourceConfig,
} from './types'
