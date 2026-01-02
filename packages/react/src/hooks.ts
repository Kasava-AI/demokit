'use client'

import { useContext } from 'react'
import { DemoModeContext } from './context'
import type { DemoModeContextValue } from './types'

/**
 * Hook to access demo mode state and controls
 *
 * @returns Demo mode context value with state and control methods
 * @throws Error if used outside of DemoKitProvider
 *
 * @example
 * function MyComponent() {
 *   const { isDemoMode, isHydrated, toggle } = useDemoMode()
 *
 *   // Wait for hydration before rendering demo-dependent UI
 *   if (!isHydrated) {
 *     return <Loading />
 *   }
 *
 *   return (
 *     <div>
 *       <p>Demo mode: {isDemoMode ? 'ON' : 'OFF'}</p>
 *       <button onClick={toggle}>Toggle</button>
 *     </div>
 *   )
 * }
 */
export function useDemoMode(): DemoModeContextValue {
  const context = useContext(DemoModeContext)

  if (context === undefined) {
    throw new Error(
      'useDemoMode must be used within a DemoKitProvider. ' +
        'Make sure to wrap your app with <DemoKitProvider>.'
    )
  }

  return context
}

/**
 * Hook to check if demo mode is enabled
 * Shorthand for useDemoMode().isDemoMode
 *
 * @returns Whether demo mode is enabled
 */
export function useIsDemoMode(): boolean {
  return useDemoMode().isDemoMode
}

/**
 * Hook to check if the component has hydrated
 * Shorthand for useDemoMode().isHydrated
 *
 * @returns Whether the component has hydrated
 */
export function useIsHydrated(): boolean {
  return useDemoMode().isHydrated
}

/**
 * Hook to access the session state
 * Shorthand for useDemoMode().getSession()
 *
 * @returns The session state, or null if not yet initialized
 *
 * @example
 * function MyComponent() {
 *   const session = useDemoSession()
 *
 *   const cart = session?.get<CartItem[]>('cart') || []
 *   const addToCart = (item: CartItem) => {
 *     session?.set('cart', [...cart, item])
 *   }
 *
 *   return <CartView items={cart} onAdd={addToCart} />
 * }
 */
export function useDemoSession() {
  return useDemoMode().getSession()
}
