'use client'

import { useState, createContext, useContext, useCallback, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc, createTRPCClient } from '@/src/lib/trpc'

/**
 * Demo mode context for managing demo state across the app
 */
interface DemoContextValue {
  isDemoMode: boolean
  isHydrated: boolean
  enableDemo: () => void
  disableDemo: () => void
  toggleDemo: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

/**
 * Hook to access demo mode state and controls
 */
export function useDemoMode() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoMode must be used within Providers')
  }
  return context
}

/**
 * Root providers for the application
 *
 * Sets up:
 * - TanStack Query client
 * - tRPC React Query integration
 * - Demo mode state management
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Don't refetch on window focus in demo mode
        refetchOnWindowFocus: false,
        // Retry failed requests once
        retry: 1,
      },
    },
  }))

  const [trpcClient] = useState(() => createTRPCClient())
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate demo mode state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('demoMode')
    setIsDemoMode(stored === 'true')
    setIsHydrated(true)
  }, [])

  const enableDemo = useCallback(() => {
    localStorage.setItem('demoMode', 'true')
    setIsDemoMode(true)
    // Invalidate all queries to refetch with fixtures
    queryClient.invalidateQueries()
  }, [queryClient])

  const disableDemo = useCallback(() => {
    localStorage.removeItem('demoMode')
    setIsDemoMode(false)
    // Invalidate all queries to refetch from real API
    queryClient.invalidateQueries()
  }, [queryClient])

  const toggleDemo = useCallback(() => {
    if (isDemoMode) {
      disableDemo()
    } else {
      enableDemo()
    }
  }, [isDemoMode, enableDemo, disableDemo])

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        isHydrated,
        enableDemo,
        disableDemo,
        toggleDemo,
      }}
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </DemoContext.Provider>
  )
}
