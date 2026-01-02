import { createDatabase, type Database } from '@db'

let cachedDb: Database | null = null

/**
 * Get a database connection for API routes.
 * Creates a new connection per-request in serverless environments,
 * but caches for development efficiency.
 */
export function getDb(): Database {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL not configured. Set it in your environment variables.'
    )
  }

  // In development, reuse the connection to avoid connection pool exhaustion
  if (process.env.NODE_ENV === 'development') {
    if (!cachedDb) {
      cachedDb = createDatabase(connectionString)
    }
    return cachedDb
  }

  // In production/serverless, create a fresh connection per request
  return createDatabase(connectionString)
}

/**
 * Check if database is configured.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}
