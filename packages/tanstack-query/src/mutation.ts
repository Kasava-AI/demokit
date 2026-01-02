'use client'

import { useMutation, useQueryClient, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { MutationFixtureContext, MutationFixtureHandler } from './types'
import { useDemoQuery } from './hooks'

/**
 * Options for useDemoMutation hook
 */
export interface UseDemoMutationOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  /**
   * The real mutation function to use when demo mode is disabled
   */
  mutationFn: (variables: TVariables) => Promise<TData>

  /**
   * Name used to look up the demo fixture
   * If not provided, uses mutationKey as string
   */
  demoName?: string

  /**
   * Demo fixture handler for this mutation
   * If provided, overrides the fixture from DemoQueryProvider
   */
  demoFixture?: MutationFixtureHandler<TData, TVariables>

  /**
   * Delay in ms before returning demo data
   * @default 0
   */
  demoDelay?: number
}

/**
 * A mutation hook that automatically uses demo fixtures when demo mode is enabled
 *
 * @example
 * const createUser = useDemoMutation({
 *   mutationFn: async (data) => api.createUser(data),
 *   demoName: 'createUser',
 *   demoFixture: ({ variables, queryClient }) => {
 *     // Create demo user
 *     const newUser = { id: crypto.randomUUID(), ...variables }
 *
 *     // Update the users query cache
 *     queryClient.setQueryData(['users'], (old: User[] = []) => [...old, newUser])
 *
 *     return newUser
 *   },
 *   onSuccess: (data) => {
 *     console.log('Created user:', data)
 *   },
 * })
 *
 * // Use like normal useMutation
 * createUser.mutate({ name: 'New User', email: 'user@example.com' })
 */
export function useDemoMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: UseDemoMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { mutationFn, demoName, demoFixture, demoDelay = 0, ...mutationOptions } = options

  const queryClient = useQueryClient()

  // Try to get demo state - may not be in DemoQueryProvider context
  let isDemoMode = false
  try {
    const demoState = useDemoQuery()
    isDemoMode = demoState.isDemoMode
  } catch {
    // Not in DemoQueryProvider context, use real mutation
  }

  // Create the demo-aware mutation function
  const demoAwareMutationFn = useCallback(
    async (variables: TVariables): Promise<TData> => {
      // If not in demo mode, use real mutation
      if (!isDemoMode) {
        return mutationFn(variables)
      }

      // Apply delay if configured
      if (demoDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, demoDelay))
      }

      // If a demo fixture is provided, use it
      if (demoFixture !== undefined) {
        const context: MutationFixtureContext<TVariables> = {
          mutationKey: mutationOptions.mutationKey,
          variables,
          queryClient,
        }

        if (typeof demoFixture === 'function') {
          // Cast to the function type to help TypeScript understand
          const fixtureFn = demoFixture as (context: MutationFixtureContext<TVariables>) => TData | Promise<TData>
          return fixtureFn(context)
        }
        return demoFixture as TData
      }

      // No fixture found, fall back to real mutation
      console.warn(
        `[DemoKit] No mutation fixture found for "${demoName || mutationOptions.mutationKey?.join('/') || 'unknown'}". ` +
          'Using real mutation function.'
      )
      return mutationFn(variables)
    },
    [isDemoMode, mutationFn, demoFixture, demoDelay, demoName, mutationOptions.mutationKey, queryClient]
  )

  return useMutation({
    ...mutationOptions,
    mutationFn: demoAwareMutationFn,
  })
}

/**
 * Create a set of demo mutations with fixtures
 *
 * @example
 * const mutations = createDemoMutations({
 *   createUser: {
 *     mutationFn: api.createUser,
 *     fixture: ({ variables, queryClient }) => {
 *       const newUser = { id: 'demo-1', ...variables }
 *       queryClient.setQueryData(['users'], (old = []) => [...old, newUser])
 *       return newUser
 *     },
 *   },
 *   deleteUser: {
 *     mutationFn: api.deleteUser,
 *     fixture: ({ variables, queryClient }) => {
 *       queryClient.setQueryData(['users'], (old: User[] = []) =>
 *         old.filter(u => u.id !== variables.id)
 *       )
 *       return { success: true }
 *     },
 *   },
 * })
 *
 * // Use in components
 * const { createUser, deleteUser } = mutations
 */
export type DemoMutationConfig<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>
  fixture: MutationFixtureHandler<TData, TVariables>
  delay?: number
}

/**
 * Helper to create mutation options with demo fixture
 */
export function createMutationOptions<TData, TVariables>(
  config: DemoMutationConfig<TData, TVariables>
): Pick<UseDemoMutationOptions<TData, unknown, TVariables, unknown>, 'mutationFn' | 'demoFixture' | 'demoDelay'> {
  return {
    mutationFn: config.mutationFn,
    demoFixture: config.fixture,
    demoDelay: config.delay,
  }
}
