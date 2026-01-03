'use client'

import { useCallback } from 'react'
import { useDemoMode } from '@demokit-ai/react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Hook for Next.js-specific demo mode controls
 *
 * Extends useDemoMode with URL-based scenario switching
 *
 * @example
 * function DemoControls() {
 *   const { isDemoMode, enableWithScenario, disableDemo, currentScenario } = useNextDemoMode()
 *
 *   return (
 *     <div>
 *       <button onClick={() => enableWithScenario('empty-state')}>
 *         Empty State Demo
 *       </button>
 *       <button onClick={() => enableWithScenario('error-state')}>
 *         Error State Demo
 *       </button>
 *       <button onClick={disableDemo}>
 *         Exit Demo
 *       </button>
 *       {currentScenario && <span>Scenario: {currentScenario}</span>}
 *     </div>
 *   )
 * }
 */
export function useNextDemoMode(options: { urlParam?: string } = {}) {
  const { urlParam = 'demo' } = options
  const demoMode = useDemoMode()
  const router = useRouter()
  const searchParams = useSearchParams()

  /**
   * Enable demo mode with a specific scenario via URL
   */
  const enableWithScenario = useCallback(
    (scenario: string) => {
      // Enable demo mode in the interceptor
      demoMode.enable()
      // Update URL for persistence and middleware
      const params = new URLSearchParams(searchParams.toString())
      params.set(urlParam, scenario)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams, urlParam, demoMode]
  )

  /**
   * Enable demo mode without a scenario
   */
  const enableDemo = useCallback(() => {
    // Enable demo mode in the interceptor
    demoMode.enable()
    // Update URL for persistence and middleware
    const params = new URLSearchParams(searchParams.toString())
    params.set(urlParam, 'true')
    router.push(`?${params.toString()}`)
  }, [router, searchParams, urlParam, demoMode])

  /**
   * Disable demo mode via URL
   */
  const disableDemo = useCallback(() => {
    // Disable demo mode in the interceptor
    demoMode.disable()
    // Update URL for persistence and middleware
    const params = new URLSearchParams(searchParams.toString())
    params.set(urlParam, 'false')
    router.push(`?${params.toString()}`)
  }, [router, searchParams, urlParam, demoMode])

  /**
   * Get current scenario from URL
   */
  const currentScenario = searchParams.get(urlParam)
  const isScenario =
    currentScenario !== null &&
    currentScenario !== 'true' &&
    currentScenario !== 'false' &&
    currentScenario !== '1' &&
    currentScenario !== '0'

  return {
    ...demoMode,
    enableWithScenario,
    enableDemo,
    disableDemo,
    currentScenario: isScenario ? currentScenario : null,
  }
}

/**
 * Hook to check if we're in demo mode on the client
 * Shorthand for useNextDemoMode().isDemoMode
 */
export function useIsNextDemoMode(): boolean {
  return useNextDemoMode().isDemoMode
}

// Re-export base hooks from @demokit-ai/react
export { useDemoMode, useIsDemoMode, useIsHydrated, useDemoSession } from '@demokit-ai/react'
