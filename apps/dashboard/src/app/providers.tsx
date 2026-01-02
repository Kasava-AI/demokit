'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/contexts/auth-context'
import { OrganizationProvider } from '@/contexts/organization-context'
import { getQueryClient } from '@/lib/query-client'

/**
 * App Providers - Wraps the application with required context providers
 *
 * Includes:
 * - TanStack Query (QueryClientProvider)
 * - Theme (ThemeProvider from next-themes)
 * - Auth (AuthProvider - supports both Supabase auth and local mode)
 * - Organization (OrganizationProvider)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

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
