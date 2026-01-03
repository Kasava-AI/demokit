'use client'

import { useEffect, useState, useMemo } from 'react'
import { DemoKitProvider, type DemoKitProviderProps } from '@demokit-ai/react'
import type { FixtureMap } from '@demokit-ai/core'
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
  source,
}: DemoKitNextProviderProps) {
  // Debug: log source prop on every render
  console.log('[DemoKit Provider] source prop received:', source)

  const [isHydrated, setIsHydrated] = useState(false)
  const [scenario, setScenario] = useState<string | null>(null)
  const [remoteFixtures, setRemoteFixtures] = useState<FixtureMap | null>(null)
  const [remoteError, setRemoteError] = useState<Error | null>(null)
  const [sourceMode, setSourceMode] = useState<'local' | 'remote' | 'auto'>('auto')

  // Check URL for source parameter on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const sourceParam = params.get('source')
    if (sourceParam === 'local' || sourceParam === 'remote') {
      setSourceMode(sourceParam)
      console.log('[DemoKit] Source mode from URL:', sourceParam)
    }
  }, [])

  // Fetch remote fixtures from DemoKit Cloud if configured
  useEffect(() => {
    const apiKey = source?.apiKey
    const apiUrl = source?.apiUrl

    console.log('[DemoKit] Remote config check:', { apiKey: !!apiKey, apiUrl, sourceMode })

    // Skip if source=local is set
    if (sourceMode === 'local') {
      console.log('[DemoKit] Skipping remote fetch - source=local')
      return
    }

    if (!apiKey || !apiUrl) {
      console.log('[DemoKit] Missing apiKey or apiUrl, skipping remote fetch')
      return
    }

    const fetchRemoteFixtures = async () => {
      try {
        console.log('[DemoKit] Fetching remote fixtures from:', apiUrl)
        const response = await fetch(`${apiUrl}/fixtures`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch fixtures: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log('[DemoKit] Received remote fixtures:', data)

        // Convert remote fixture data to FixtureMap handlers
        const fixtureMap: FixtureMap = {}
        for (const [pattern, fixtureData] of Object.entries(data.fixtures || data)) {
          fixtureMap[pattern] = () => fixtureData
        }

        setRemoteFixtures(fixtureMap)
      } catch (error) {
        console.error('[DemoKit] Failed to fetch remote fixtures:', error)
        setRemoteError(error instanceof Error ? error : new Error(String(error)))
      }
    }

    fetchRemoteFixtures()
  }, [source, sourceMode])

  // Read initial state from cookie on mount
  useEffect(() => {
    const cookieEnabled = getDemoModeFromCookie(cookieName)
    const cookieScenario = getScenarioFromCookie(cookieName)
    setScenario(cookieScenario)
    setIsHydrated(true)
  }, [cookieName])

  // Merge fixtures with scenario fixtures and remote fixtures
  const activeFixtures = useMemo(() => {
    let result: FixtureMap

    // Determine which fixtures to use based on source mode
    if (sourceMode === 'local') {
      // Force local only
      result = fixtures
      console.log('[DemoKit Provider] Using LOCAL fixtures (forced)')
    } else if (sourceMode === 'remote' && remoteFixtures) {
      // Force remote only (if available)
      result = remoteFixtures
      console.log('[DemoKit Provider] Using REMOTE fixtures (forced)')
    } else if (remoteFixtures) {
      // Auto mode: merge local + remote (remote overrides)
      result = { ...fixtures, ...remoteFixtures }
      console.log('[DemoKit Provider] Using MERGED fixtures (local + remote)')
    } else {
      // No remote fixtures available, use local
      result = fixtures
      console.log('[DemoKit Provider] Using LOCAL fixtures (remote not available)')
    }

    // Apply scenario overrides
    if (scenario && scenarios[scenario]) {
      result = { ...result, ...scenarios[scenario] }
    }

    console.log('[DemoKit Provider] Active fixtures:', Object.keys(result))
    console.log('[DemoKit Provider] Scenario:', scenario)
    console.log('[DemoKit Provider] Source mode:', sourceMode)
    if (remoteError) {
      console.warn('[DemoKit Provider] Remote fixture error:', remoteError.message)
    }
    return result
  }, [fixtures, scenarios, scenario, remoteFixtures, remoteError, sourceMode])

  // Determine initial enabled state from cookie
  const enabled = useMemo(() => {
    if (initialEnabled !== undefined) {
      return initialEnabled
    }
    if (!isHydrated) {
      return false // Will be updated once hydrated
    }
    const cookieValue = getDemoModeFromCookie(cookieName)
    console.log('[DemoKit Next Provider] Demo mode from cookie:', { cookieName, enabled: cookieValue })
    return cookieValue
  }, [initialEnabled, isHydrated, cookieName])

  // Use key to force DemoKitProvider to re-mount when hydration completes
  // This ensures it initializes with the correct cookie value
  const providerKey = isHydrated ? `hydrated-${enabled}` : 'pre-hydration'

  return (
    <DemoKitProvider
      key={providerKey}
      fixtures={activeFixtures}
      storageKey={storageKey}
      initialEnabled={enabled}
      baseUrl={baseUrl}
    >
      {children}
    </DemoKitProvider>
  )
}
