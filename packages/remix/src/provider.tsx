import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import type {
  DemoRemixProviderProps,
  DemoRemixState,
  LoaderFixtureMap,
  ActionFixtureMap,
  LoaderFixtureMapObject,
  ActionFixtureMapObject,
  LoaderFixtureHandler,
  ActionFixtureHandler,
} from './types'

/**
 * Context value for demo remix state
 */
interface DemoRemixContextValue extends DemoRemixState {
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

const DemoRemixContext = createContext<DemoRemixContextValue | null>(null)

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
 * Provider for demo remix state (client-side)
 *
 * Wrap your Remix app with this provider to enable client-side fixture management
 * and demo mode toggle. For server-side demo mode detection, use the server utilities.
 *
 * @example
 * import { DemoRemixProvider } from '@demokit-ai/remix'
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
 * export default function App() {
 *   return (
 *     <DemoRemixProvider loaders={loaders} actions={actions} enabled>
 *       <Outlet />
 *     </DemoRemixProvider>
 *   )
 * }
 */
export function DemoRemixProvider({
  children,
  enabled: initialEnabled = false,
  loaders: initialLoaders,
  actions: initialActions,
  delay = 0,
}: DemoRemixProviderProps) {
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

  const value = useMemo<DemoRemixContextValue>(
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

  return <DemoRemixContext.Provider value={value}>{children}</DemoRemixContext.Provider>
}

/**
 * Hook to access demo remix state and controls
 *
 * @example
 * function DemoModeToggle() {
 *   const { enabled, toggle } = useDemoRemix()
 *   return (
 *     <button onClick={toggle}>
 *       Demo Mode: {enabled ? 'ON' : 'OFF'}
 *     </button>
 *   )
 * }
 */
export function useDemoRemix(): DemoRemixContextValue {
  const context = useContext(DemoRemixContext)
  if (!context) {
    throw new Error('useDemoRemix must be used within a DemoRemixProvider')
  }
  return context
}

/**
 * Hook to check if demo mode is enabled
 *
 * @example
 * function DataDisplay() {
 *   const isDemo = useIsDemoRemixMode()
 *   return isDemo ? <DemoBanner /> : null
 * }
 */
export function useIsDemoRemixMode(): boolean {
  const context = useContext(DemoRemixContext)
  return context?.enabled ?? false
}

/**
 * Get the demo remix context (may be null if not in provider)
 *
 * Use this for optional demo mode integration.
 */
export function useDemoRemixOptional(): DemoRemixContextValue | null {
  return useContext(DemoRemixContext)
}
