/**
 * App Providers
 *
 * Sets up the DemoSWRProvider with fixtures for demo mode
 */

import { ReactNode, useState, useEffect } from 'react'
import { DemoSWRProvider } from '@demokit-ai/swr'
import { fixtures, mutationFixtures } from '@/demo/fixtures'
import { isDemoEnabled } from '@/lib/demo-mode'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Root providers component
 *
 * Wraps the app with DemoSWRProvider to enable demo mode functionality
 */
export function Providers({ children }: ProvidersProps) {
  const [enabled, setEnabled] = useState(true)

  // Sync with localStorage on mount
  useEffect(() => {
    setEnabled(isDemoEnabled())
  }, [])

  return (
    <DemoSWRProvider
      enabled={enabled}
      fixtures={fixtures}
      mutationFixtures={mutationFixtures}
      delay={200} // Simulate network latency
      onMissing={(key) => {
        console.warn(`[DemoKit] No fixture found for: ${key}`)
      }}
    >
      {children}
    </DemoSWRProvider>
  )
}
