'use client'

import { useContext } from 'react'
import { DemoQueryContext } from './context'
import type { DemoQueryState } from './types'

/**
 * Hook to access DemoQuery state and controls
 *
 * @returns DemoQuery context value
 * @throws Error if used outside of DemoQueryProvider
 *
 * @example
 * function MyComponent() {
 *   const { isDemoMode, setQueryFixture, invalidateAll } = useDemoQuery()
 *
 *   // Dynamically add a fixture
 *   const handleAddFixture = () => {
 *     setQueryFixture(['users', 'custom'], { id: 'custom', name: 'Custom User' })
 *     invalidateAll() // Trigger refetch
 *   }
 *
 *   return (
 *     <button onClick={handleAddFixture}>Add Custom Fixture</button>
 *   )
 * }
 */
export function useDemoQuery(): DemoQueryState {
  const context = useContext(DemoQueryContext)

  if (context === undefined) {
    throw new Error(
      'useDemoQuery must be used within a DemoQueryProvider. ' +
        'Make sure to wrap your app with <DemoQueryProvider>.'
    )
  }

  return context
}

/**
 * Hook to check if demo mode is enabled
 * Shorthand for useDemoQuery().isDemoMode
 *
 * @example
 * function MyComponent() {
 *   const isDemoMode = useIsDemoQueryMode()
 *
 *   return isDemoMode ? <DemoBadge /> : null
 * }
 */
export function useIsDemoQueryMode(): boolean {
  return useDemoQuery().isDemoMode
}
