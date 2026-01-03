'use client'

import { useEffect, useState, useMemo } from 'react'
import { DemoKitProvider, type DemoKitProviderProps } from '@demokit-ai/react'
import type { DemoKitNextProviderProps } from '../types'

/**
 * Get initial demo mode state from cookie
 */
function getDemoModeFromCookie(cookieName: string): boolean {
  if (typeof document === 'undefined') return false

  const cookies = document.cookie.split(';')
  const demoCookie = cookies.find((c) => c.trim().startsWith(`${cookieName}=`))

  return demoCookie !== undefined
}

/**
 * Get scenario from cookie
 */
function getScenarioFromCookie(cookieName: string): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  const demoCookie = cookies.find((c) => c.trim().startsWith(`${cookieName}=`))

  if (!demoCookie) return null

  const value = demoCookie.split('=')[1]?.trim()
  if (!value || value === 'true') return null

  return value
}

/**
 * Next.js-aware DemoKit provider
 *
 * This provider:
 * - Reads initial state from cookies (set by middleware)
 * - Supports scenario switching
 * - Works with both App Router and Pages Router
 *
 * @example
 * // app/providers.tsx
 * 'use client'
 *
 * import { DemoKitNextProvider } from '@demokit-ai/next/client'
 * import { fixtures, scenarios } from '@/lib/demo-fixtures'
 *
 * export function Providers({ children }: { children: React.ReactNode }) {
 *   return (
 *     <DemoKitNextProvider
 *       fixtures={fixtures}
 *       scenarios={scenarios}
 *     >
 *       {children}
 *     </DemoKitNextProvider>
 *   )
 * }
 */
export function DemoKitNextProvider({
  children,
  fixtures,
  scenarios = {},
  storageKey = 'demokit-mode',
  cookieName = 'demokit-mode',
  initialEnabled,
  baseUrl,
}: DemoKitNextProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [scenario, setScenario] = useState<string | null>(null)

  // Read initial state from cookie on mount
  useEffect(() => {
    const cookieEnabled = getDemoModeFromCookie(cookieName)
    const cookieScenario = getScenarioFromCookie(cookieName)
    setScenario(cookieScenario)
    setIsHydrated(true)
  }, [cookieName])

  // Merge fixtures with scenario fixtures
  const activeFixtures = useMemo(() => {
    if (scenario && scenarios[scenario]) {
      return { ...fixtures, ...scenarios[scenario] }
    }
    return fixtures
  }, [fixtures, scenarios, scenario])

  // Determine initial enabled state
  const enabled = useMemo(() => {
    if (initialEnabled !== undefined) {
      return initialEnabled
    }
    if (!isHydrated) {
      // Return undefined so DemoKitProvider can fall back to checking storage
      return undefined
    }
    return getDemoModeFromCookie(cookieName)
  }, [initialEnabled, isHydrated, cookieName])

  return (
    <DemoKitProvider
      fixtures={activeFixtures}
      storageKey={storageKey}
      initialEnabled={enabled}
      baseUrl={baseUrl}
    >
      {children}
    </DemoKitProvider>
  )
}
