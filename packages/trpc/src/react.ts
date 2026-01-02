/**
 * @demokit-ai/trpc/react
 *
 * React-specific exports for tRPC DemoKit integration.
 *
 * @example
 * import { DemoTRPCProvider, useDemoTRPC } from '@demokit-ai/trpc/react'
 *
 * function App() {
 *   return (
 *     <DemoTRPCProvider fixtures={fixtures} enabled={true}>
 *       <YourApp />
 *     </DemoTRPCProvider>
 *   )
 * }
 *
 * function MyComponent() {
 *   const { isDemoMode, setFixture } = useDemoTRPC()
 *
 *   return (
 *     <div>Demo mode: {isDemoMode ? 'ON' : 'OFF'}</div>
 *   )
 * }
 *
 * @packageDocumentation
 */

// Provider
export { DemoTRPCProvider } from './provider'

// Hooks
export {
  useDemoTRPC,
  useIsDemoTRPCMode,
  useSetTRPCFixture,
  useGetTRPCFixtures,
} from './hooks'

// Context (for advanced use cases)
export { DemoTRPCContext } from './context'

// Re-export core types for convenience
export type {
  DemoTRPCProviderConfig,
  DemoTRPCProviderProps,
  DemoTRPCState,
  TRPCFixtureHandler,
  FlatFixtureMap,
} from './types'

// Re-export link functions for one-stop imports
export { createDemoLink, createDemoLinkWithState } from './link'
export { defineTRPCFixtures, defineFixtureMap } from './fixtures'
