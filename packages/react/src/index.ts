/**
 * @demokit-ai/react
 *
 * React bindings for DemoKit - provider, hooks, and components.
 *
 * @example
 * import { DemoKitProvider, useDemoMode, DemoModeBanner } from '@demokit-ai/react'
 *
 * const fixtures = {
 *   'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 * }
 *
 * function App() {
 *   return (
 *     <DemoKitProvider fixtures={fixtures}>
 *       <DemoModeBanner />
 *       <YourApp />
 *     </DemoKitProvider>
 *   )
 * }
 *
 * // In any component
 * function MyComponent() {
 *   const { isDemoMode, isHydrated, toggle } = useDemoMode()
 *   // ...
 * }
 *
 * @packageDocumentation
 */

// Provider
export { DemoKitProvider } from './provider'

// Config helpers
export { createRemoteSource } from './config'

// Hooks
export { useDemoMode, useIsDemoMode, useIsHydrated, useDemoSession } from './hooks'

// Components
export { DemoModeBanner } from './banner'
export { DemoModeToggle } from './toggle'
export { PoweredByBadge } from './powered-by'

// Context (for advanced use cases)
export { DemoModeContext } from './context'

// Types
export type {
  DemoKitProviderProps,
  DemoModeContextValue,
  DemoModeBannerProps,
} from './types'

// Component types (from component files)
export type { DemoModeToggleProps } from './toggle'
export type { PoweredByBadgeProps } from './powered-by'

// Re-export core types for convenience
export type {
  FixtureMap,
  FixtureHandler,
  RequestContext,
  SessionState,
  RemoteConfig,
} from '@demokit-ai/core'
