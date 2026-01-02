/**
 * Server-side auth utilities for OSS mode.
 *
 * In OSS mode, there is no authentication. All API routes
 * are accessible by the single local user.
 */

/**
 * Local user type for OSS mode.
 */
export interface LocalUser {
  id: string
  email: string
}

/**
 * Default local user for OSS mode.
 */
const LOCAL_USER: LocalUser = {
  id: 'local-user',
  email: 'local@demokit.local',
}

/**
 * Get the authenticated user.
 * In OSS mode, always returns the local user.
 */
export async function getAuthenticatedUser(): Promise<LocalUser> {
  return LOCAL_USER
}

/**
 * Check if authentication is configured.
 * In OSS mode, always returns false (no auth needed).
 */
export function isSupabaseConfigured(): boolean {
  return false
}
