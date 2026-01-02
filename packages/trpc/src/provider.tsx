'use client'

import { useMemo, useRef } from 'react'
import type { AnyRouter } from '@trpc/server'
import { DemoTRPCContext } from './context'
import type {
  DemoTRPCProviderProps,
  DemoTRPCState,
  TRPCFixtureHandler,
  FlatFixtureMap,
} from './types'
import { normalizeFixtures } from './fixtures'

/**
 * Provider component for DemoKit tRPC integration
 *
 * This provider enables demo mode state management and fixture controls
 * for tRPC procedures in your React app.
 *
 * Note: This provider manages state for React components. You still need to
 * use `createDemoLink` in your tRPC client configuration for actual interception.
 *
 * @example
 * // Basic usage
 * import { DemoTRPCProvider } from '@demokit-ai/trpc/react'
 * import { trpc } from './utils/trpc'
 *
 * const fixtures = {
 *   user: {
 *     list: () => [{ id: '1', name: 'Demo User' }],
 *   },
 * }
 *
 * function App() {
 *   return (
 *     <DemoTRPCProvider fixtures={fixtures} enabled={true}>
 *       <trpc.Provider client={trpcClient} queryClient={queryClient}>
 *         <YourApp />
 *       </trpc.Provider>
 *     </DemoTRPCProvider>
 *   )
 * }
 *
 * @example
 * // With DemoKitProvider for unified demo mode
 * import { DemoKitProvider } from '@demokit-ai/react'
 * import { DemoTRPCProvider } from '@demokit-ai/trpc/react'
 *
 * function App() {
 *   const [isDemoMode, setIsDemoMode] = useState(false)
 *
 *   return (
 *     <DemoKitProvider enabled={isDemoMode}>
 *       <DemoTRPCProvider fixtures={trpcFixtures}>
 *         <YourApp />
 *       </DemoTRPCProvider>
 *     </DemoKitProvider>
 *   )
 * }
 */
export function DemoTRPCProvider<TRouter extends AnyRouter = AnyRouter>({
  children,
  fixtures: rawFixtures,
  enabled = false,
  delay = 0,
  include,
  exclude,
}: DemoTRPCProviderProps<TRouter>) {
  // Store fixtures in a ref so they persist across renders
  const fixturesRef = useRef<FlatFixtureMap>(
    normalizeFixtures(rawFixtures as Record<string, unknown>)
  )

  // Create context value
  const contextValue = useMemo<DemoTRPCState>(
    () => ({
      isDemoMode: enabled,

      setFixture: (path: string, handler: TRPCFixtureHandler) => {
        fixturesRef.current.set(path, handler)
      },

      removeFixture: (path: string) => {
        fixturesRef.current.delete(path)
      },

      getFixtures: () => fixturesRef.current,
    }),
    [enabled]
  )

  return (
    <DemoTRPCContext.Provider value={contextValue}>
      {children}
    </DemoTRPCContext.Provider>
  )
}
