'use client'

import { useContext, useCallback } from 'react'
import useSWRMutation, { type SWRMutationConfiguration, type SWRMutationResponse } from 'swr/mutation'
import { useSWRConfig } from 'swr'
import { DemoSWRContext } from './context'
import type { DemoSWRState, SWRMutationFixtureContext, SWRMutationFixtureHandler } from './types'

/**
 * Hook to access DemoSWR state and controls
 *
 * @returns DemoSWR context value
 * @throws Error if used outside of DemoSWRProvider
 *
 * @example
 * function MyComponent() {
 *   const { isDemoMode, setFixture } = useDemoSWR()
 *
 *   // Dynamically add a fixture
 *   const handleAddFixture = () => {
 *     setFixture(['/api/users', 'custom'], { id: 'custom', name: 'Custom User' })
 *   }
 *
 *   return (
 *     <button onClick={handleAddFixture}>Add Custom Fixture</button>
 *   )
 * }
 */
export function useDemoSWR(): DemoSWRState {
  const context = useContext(DemoSWRContext)

  if (context === undefined) {
    throw new Error(
      'useDemoSWR must be used within a DemoSWRProvider. ' +
        'Make sure to wrap your app with <DemoSWRProvider>.'
    )
  }

  return context
}

/**
 * Hook to check if demo mode is enabled
 * Shorthand for useDemoSWR().isDemoMode
 *
 * @example
 * function MyComponent() {
 *   const isDemoMode = useIsDemoSWRMode()
 *
 *   return isDemoMode ? <DemoBadge /> : null
 * }
 */
export function useIsDemoSWRMode(): boolean {
  return useDemoSWR().isDemoMode
}

/**
 * Options for useDemoSWRMutation hook
 */
export interface UseDemoSWRMutationOptions<TData, TError, TArg>
  extends Omit<SWRMutationConfiguration<TData, TError, string, TArg>, 'fetcher'> {
  /**
   * The real mutation function to use when demo mode is disabled
   */
  fetcher: (key: string, options: { arg: TArg }) => Promise<TData>

  /**
   * Demo fixture handler for this mutation
   */
  demoFixture?: SWRMutationFixtureHandler<TData, TArg>

  /**
   * Delay in ms before returning demo data
   * @default 0
   */
  demoDelay?: number
}

/**
 * A mutation hook that automatically uses demo fixtures when demo mode is enabled
 *
 * Works with useSWRMutation from swr/mutation.
 *
 * @example
 * const { trigger: createUser, isMutating } = useDemoSWRMutation('/api/users', {
 *   fetcher: async (key, { arg }) => api.createUser(arg),
 *   demoFixture: ({ arg, mutate }) => {
 *     // Create demo user
 *     const newUser = { id: crypto.randomUUID(), ...arg }
 *
 *     // Update the users cache
 *     mutate('/api/users', (current: User[] = []) => [...current, newUser])
 *
 *     return newUser
 *   },
 *   onSuccess: (data) => {
 *     console.log('Created user:', data)
 *   },
 * })
 *
 * // Use like normal useSWRMutation
 * createUser({ name: 'New User', email: 'user@example.com' })
 */
export function useDemoSWRMutation<TData = unknown, TError = unknown, TArg = unknown>(
  key: string,
  options: UseDemoSWRMutationOptions<TData, TError, TArg>
): SWRMutationResponse<TData, TError, string, TArg> {
  const { fetcher, demoFixture, demoDelay = 0, ...mutationOptions } = options

  const { mutate } = useSWRConfig()

  // Try to get demo state - may not be in DemoSWRProvider context
  let isDemoMode = false
  try {
    const demoState = useDemoSWR()
    isDemoMode = demoState.isDemoMode
  } catch {
    // Not in DemoSWRProvider context, use real mutation
  }

  // Create the demo-aware mutation function
  const demoAwareFetcher = useCallback(
    async (mutationKey: string, { arg }: { arg: TArg }): Promise<TData> => {
      // If not in demo mode, use real mutation
      if (!isDemoMode) {
        return fetcher(mutationKey, { arg })
      }

      // Apply delay if configured
      if (demoDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, demoDelay))
      }

      // If a demo fixture is provided, use it
      if (demoFixture !== undefined) {
        const context: SWRMutationFixtureContext<TData, TArg> = {
          key: mutationKey,
          arg,
          currentData: undefined, // SWR mutation doesn't have direct access to current data
          mutate: mutate as SWRMutationFixtureContext<TData, TArg>['mutate'],
        }

        if (typeof demoFixture === 'function') {
          const fixtureFn = demoFixture as (
            context: SWRMutationFixtureContext<TData, TArg>
          ) => TData | Promise<TData>
          return fixtureFn(context)
        }
        return demoFixture as TData
      }

      // No fixture found, fall back to real mutation
      console.warn(
        `[DemoKit SWR] No mutation fixture found for "${key}". Using real mutation function.`
      )
      return fetcher(mutationKey, { arg })
    },
    [isDemoMode, fetcher, demoFixture, demoDelay, key, mutate]
  )

  return useSWRMutation(key, demoAwareFetcher, mutationOptions)
}
