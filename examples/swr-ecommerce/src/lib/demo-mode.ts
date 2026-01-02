/**
 * Demo mode utilities
 *
 * Provides localStorage-based demo mode state management
 */

const DEMO_MODE_KEY = 'demoMode'

/**
 * Check if demo mode is enabled
 */
export function isDemoEnabled(): boolean {
  if (typeof window === 'undefined') return true // Default to demo mode
  const stored = localStorage.getItem(DEMO_MODE_KEY)
  // Default to true (demo mode) if not set
  return stored === null || stored === 'true'
}

/**
 * Enable demo mode
 */
export function enableDemoMode(): void {
  localStorage.setItem(DEMO_MODE_KEY, 'true')
}

/**
 * Disable demo mode
 */
export function disableDemoMode(): void {
  localStorage.setItem(DEMO_MODE_KEY, 'false')
}

/**
 * Toggle demo mode
 */
export function toggleDemoMode(): boolean {
  const newState = !isDemoEnabled()
  localStorage.setItem(DEMO_MODE_KEY, String(newState))
  return newState
}
