'use client'

import { useContext } from 'react'
import { DemoTRPCContext } from './context'
import type { DemoTRPCState, TRPCFixtureHandler, FlatFixtureMap } from './types'

/**
 * Hook to access demo tRPC state and controls
 *
 * @returns Demo tRPC state including enable/disable controls and fixture management
 *
 * @example
 * function MyComponent() {
 *   const { isDemoMode, setFixture, removeFixture } = useDemoTRPC()
 *
 *   const addCustomUser = () => {
 *     setFixture('user.get', ({ input }) => ({
 *       id: input.id,
 *       name: 'Custom User',
 *     }))
 *   }
 *
 *   return (
 *     <div>
 *       <p>Demo mode: {isDemoMode ? 'ON' : 'OFF'}</p>
 *       <button onClick={addCustomUser}>Add Custom User Fixture</button>
 *     </div>
 *   )
 * }
 */
export function useDemoTRPC(): DemoTRPCState {
  return useContext(DemoTRPCContext)
}

/**
 * Hook to check if demo mode is enabled
 *
 * @returns Whether demo mode is currently enabled
 *
 * @example
 * function MyComponent() {
 *   const isDemoMode = useIsDemoTRPCMode()
 *
 *   return isDemoMode ? <DemoBanner /> : null
 * }
 */
export function useIsDemoTRPCMode(): boolean {
  const { isDemoMode } = useContext(DemoTRPCContext)
  return isDemoMode
}

/**
 * Hook to set fixtures dynamically
 *
 * @returns Function to set a fixture for a procedure path
 *
 * @example
 * function MyComponent() {
 *   const setFixture = useSetTRPCFixture()
 *
 *   useEffect(() => {
 *     // Set custom fixture when component mounts
 *     setFixture('analytics.dashboard', () => ({
 *       visits: 1000,
 *       conversions: 50,
 *     }))
 *   }, [])
 *
 *   return <Dashboard />
 * }
 */
export function useSetTRPCFixture(): (path: string, handler: TRPCFixtureHandler) => void {
  const { setFixture } = useContext(DemoTRPCContext)
  return setFixture
}

/**
 * Hook to get all registered fixtures
 *
 * @returns The current fixture map
 *
 * @example
 * function FixtureDebugger() {
 *   const getFixtures = useGetTRPCFixtures()
 *   const fixtures = getFixtures()
 *
 *   return (
 *     <ul>
 *       {Array.from(fixtures.keys()).map(path => (
 *         <li key={path}>{path}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 */
export function useGetTRPCFixtures(): () => FlatFixtureMap {
  const { getFixtures } = useContext(DemoTRPCContext)
  return getFixtures
}
