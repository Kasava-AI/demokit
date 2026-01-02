import { DemoQueryProvider } from '@demokit-ai/tanstack-query'
import { queryFixtures, mutationFixtures } from '@/demo/fixtures'
import { isDemoEnabled } from '@/lib/demo-mode'
import type { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Application providers wrapper
 *
 * Sets up TanStack Query with DemoKit integration.
 * When demo mode is enabled, queries and mutations use fixtures
 * instead of making real API calls.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <DemoQueryProvider
      enabled={isDemoEnabled()}
      queries={queryFixtures}
      mutations={mutationFixtures}
      delay={200}
      staleTime={Infinity}
    >
      {children}
    </DemoQueryProvider>
  )
}
