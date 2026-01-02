'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'
import { AuthProvider } from '@/contexts/auth-context'
import { OrganizationProvider } from '@/contexts/organization-context'

/**
 * App Providers - Wraps the application with required context providers
 *
 * Includes:
 * - TanStack Query (QueryClientProvider)
 * - Theme (ThemeProvider from next-themes)
 * - Auth (AuthProvider - OSS mode: local user only)
 * - Organization (OrganizationProvider)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create a client for each render to prevent cross-request data leakage
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <OrganizationProvider>
            {children}
          </OrganizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
