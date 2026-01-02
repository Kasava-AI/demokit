'use client'

import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import { createDemoLink } from '@demokit-ai/trpc'
import { fixtures } from '../demo/fixtures'
import type { AppRouter } from '../server/router'

/**
 * tRPC React hooks with full type safety
 */
export const trpc = createTRPCReact<AppRouter>()

/**
 * Check if demo mode is enabled
 * Reads from localStorage on the client
 */
function isDemoModeEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('demoMode') === 'true'
}

/**
 * Get the base URL for the API
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return ''
  }
  // SSR should use localhost
  return `http://localhost:${process.env.PORT ?? 3000}`
}

/**
 * Create the tRPC client with demo link support
 *
 * The demo link is placed before httpBatchLink in the chain.
 * When demo mode is enabled, it intercepts all tRPC calls and
 * returns fixture data instead of making real API requests.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      // Demo link - intercepts when demo mode is enabled
      createDemoLink<AppRouter>({
        fixtures,
        isEnabled: isDemoModeEnabled,
        delay: 100, // Simulate 100ms network latency
        onMissing: (path, input) => {
          console.warn(`[DemoKit] No fixture found for: ${path}`, input)
        },
      }),
      // Real API link - used when demo mode is disabled
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
      }),
    ],
  })
}

// Re-export the AppRouter type for convenience
export type { AppRouter }
