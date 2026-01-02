/**
 * Supabase client stub for OSS mode.
 *
 * This file exists only for import compatibility.
 * OSS mode does not use Supabase - it operates in single-user local mode without authentication.
 */

export function createClient(): never {
  throw new Error(
    'Supabase is not available in OSS mode. ' +
    'The OSS dashboard operates in single-user local mode without authentication.'
  )
}
