'use client'

import { DemoModeBanner, type DemoModeBannerProps } from '@demokit-ai/react'
import { useNextDemoMode } from './hooks'

export interface NextDemoModeBannerProps extends Omit<DemoModeBannerProps, 'onExit'> {
  /**
   * Whether to include the current scenario in the banner
   * @default true
   */
  showScenario?: boolean

  /**
   * Custom exit handler
   * If not provided, will use URL-based navigation
   */
  onExit?: () => void
}

/**
 * Demo mode banner for Next.js
 *
 * Extends DemoModeBanner with scenario display and URL-based exit
 *
 * @example
 * // In your layout
 * <NextDemoModeBanner />
 *
 * // With custom labels
 * <NextDemoModeBanner
 *   demoLabel="Preview Mode"
 *   exitLabel="Exit Preview"
 *   showScenario={true}
 * />
 */
export function NextDemoModeBanner({
  showScenario = true,
  onExit,
  description,
  ...props
}: NextDemoModeBannerProps) {
  const { currentScenario, disableDemo, isDemoMode, isHydrated } = useNextDemoMode()

  // Don't render if not hydrated or not in demo mode
  if (!isHydrated || !isDemoMode) {
    return null
  }

  // Build description with scenario
  let bannerDescription = description ?? 'Changes are simulated and not saved'
  if (showScenario && currentScenario) {
    bannerDescription = `Scenario: ${currentScenario} • ${bannerDescription}`
  }

  return (
    <DemoModeBanner
      {...props}
      description={bannerDescription}
      onExit={onExit ?? disableDemo}
    />
  )
}

// Re-export base banner
export { DemoModeBanner } from '@demokit-ai/react'
