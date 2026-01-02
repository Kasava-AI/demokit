import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import type {
  DemoRouterProviderProps,
  DemoRouterState,
  LoaderFixtureMap,
  ActionFixtureMap,
  LoaderFixtureMapObject,
  ActionFixtureMapObject,
  LoaderFixtureHandler,
  ActionFixtureHandler,
} from './types'

/**
 * Context value for demo router state
 */
interface DemoRouterContextValue extends DemoRouterState {
  /** Enable demo mode */
  enable: () => void
  /** Disable demo mode */
  disable: () => void
  /** Toggle demo mode */
  toggle: () => boolean
  /** Set a loader fixture */
  setLoader: (path: string, handler: LoaderFixtureHandler) => void
  /** Remove a loader fixture */
  removeLoader: (path: string) => void
  /** Set an action fixture */
  setAction: (path: string, handler: ActionFixtureHandler) => void
  /** Remove an action fixture */
  removeAction: (path: string) => void
  /** Clear all fixtures */
  clearFixtures: () => void
  /** Get delay setting */
  delay: number
}

const DemoRouterContext = createContext<DemoRouterContextValue | null>(null)

/**
 * Convert object fixture map to Map
 */
function toLoaderMap(obj?: LoaderFixtureMapObject): LoaderFixtureMap {
  if (!obj) return new Map()
  return new Map(Object.entries(obj))
}

/**
 * Convert object fixture map to Map
 */
function toActionMap(obj?: ActionFixtureMapObject): ActionFixtureMap {
  if (!obj) return new Map()
  return new Map(Object.entries(obj))
}

/**
 * Provider for demo router state
 *
 * Wrap your app with this provider to enable centralized fixture management.
 * Use with `useDemoRouter` hook to access demo state and controls.
 *
 * @example
 * import { DemoRouterProvider } from '@demokit-ai/react-router'
 *
 * const loaders = {
 *   '/users': [{ id: '1', name: 'Demo User' }],
 *   '/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 * }
 *
 * const actions = {
 *   '/users': ({ formData }) => ({
 *     id: crypto.randomUUID(),
 *     name: formData?.get('name'),
 *   }),
 * }
 *
 * function App() {
 *   return (
 *     <DemoRouterProvider loaders={loaders} actions={actions} enabled>
 *       <RouterProvider router={router} />
 *     </DemoRouterProvider>
 *   )
 * }
 */
export function DemoRouterProvider({
  children,
  enabled: initialEnabled = false,
  loaders: initialLoaders,
  actions: initialActions,
  delay = 0,
}: DemoRouterProviderProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loaders, setLoaders] = useState<LoaderFixtureMap>(() => toLoaderMap(initialLoaders))
  const [actions, setActions] = useState<ActionFixtureMap>(() => toActionMap(initialActions))

  const enable = useCallback(() => setEnabled(true), [])
  const disable = useCallback(() => setEnabled(false), [])
  const toggle = useCallback(() => {
    setEnabled((prev) => !prev)
    return !enabled
  }, [enabled])

  const setLoader = useCallback((path: string, handler: LoaderFixtureHandler) => {
    setLoaders((prev) => new Map(prev).set(path, handler))
  }, [])

  const removeLoader = useCallback((path: string) => {
    setLoaders((prev) => {
      const next = new Map(prev)
      next.delete(path)
      return next
    })
  }, [])

  const setAction = useCallback((path: string, handler: ActionFixtureHandler) => {
    setActions((prev) => new Map(prev).set(path, handler))
  }, [])

  const removeAction = useCallback((path: string) => {
    setActions((prev) => {
      const next = new Map(prev)
      next.delete(path)
      return next
    })
  }, [])

  const clearFixtures = useCallback(() => {
    setLoaders(new Map())
    setActions(new Map())
  }, [])

  const value = useMemo<DemoRouterContextValue>(
    () => ({
      enabled,
      loaders,
      actions,
      delay,
      enable,
      disable,
      toggle,
      setLoader,
      removeLoader,
      setAction,
      removeAction,
      clearFixtures,
    }),
    [
      enabled,
      loaders,
      actions,
      delay,
      enable,
      disable,
      toggle,
      setLoader,
      removeLoader,
      setAction,
      removeAction,
      clearFixtures,
    ]
  )

  return <DemoRouterContext.Provider value={value}>{children}</DemoRouterContext.Provider>
}

/**
 * Hook to access demo router state and controls
 *
 * @example
 * function DemoModeToggle() {
 *   const { enabled, toggle } = useDemoRouter()
 *   return (
 *     <button onClick={toggle}>
 *       Demo Mode: {enabled ? 'ON' : 'OFF'}
 *     </button>
 *   )
 * }
 */
export function useDemoRouter(): DemoRouterContextValue {
  const context = useContext(DemoRouterContext)
  if (!context) {
    throw new Error('useDemoRouter must be used within a DemoRouterProvider')
  }
  return context
}

/**
 * Hook to check if demo mode is enabled
 *
 * @example
 * function DataDisplay() {
 *   const isDemo = useIsDemoRouterMode()
 *   return isDemo ? <DemoBanner /> : null
 * }
 */
export function useIsDemoRouterMode(): boolean {
  const context = useContext(DemoRouterContext)
  return context?.enabled ?? false
}

/**
 * Get the demo router context (may be null if not in provider)
 *
 * Use this for optional demo mode integration.
 */
export function useDemoRouterOptional(): DemoRouterContextValue | null {
  return useContext(DemoRouterContext)
}