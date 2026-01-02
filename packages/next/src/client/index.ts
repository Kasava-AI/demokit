/**
 * Client-side exports for @demokit-ai/next
 */

export { DemoKitNextProvider } from './provider'

export {
  useNextDemoMode,
  useIsNextDemoMode,
  // Re-exports from @demokit-ai/react
  useDemoMode,
  useIsDemoMode,
  useIsHydrated,
  useDemoSession,
} from './hooks'

export { NextDemoModeBanner, DemoModeBanner, type NextDemoModeBannerProps } from './banner'
