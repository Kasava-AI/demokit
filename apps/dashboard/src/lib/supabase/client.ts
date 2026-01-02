import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Check if auth is enabled.
 * Defaults to true, can be disabled by setting NEXT_PUBLIC_USE_AUTH=false
 */
export function isAuthEnabled(): boolean {
  const useAuth = process.env.NEXT_PUBLIC_USE_AUTH
  // Default to true if not set, only disable if explicitly set to 'false'
  return useAuth !== 'false'
}

// Singleton instance for browser client
let browserClient: SupabaseClient | null = null

/**
 * Create a Supabase client for browser usage.
 * When auth is disabled (USE_AUTH=false), returns null.
 */
export function createClient(): SupabaseClient | null {
  // If auth is disabled, return null
  if (!isAuthEnabled()) {
    return null
  }

  // Return singleton if already created
  if (browserClient) {
    return browserClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('[Supabase] Missing environment variables, auth will be disabled')
    return null
  }

  console.log('[Supabase] Creating browser client singleton')
  browserClient = createBrowserClient(url, key)
  return browserClient
}
