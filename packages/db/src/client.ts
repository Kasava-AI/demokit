import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Type for database instance with schema
export type Database = ReturnType<typeof drizzle<typeof schema>>;

// For local development and migrations
let migrationClient: postgres.Sql | undefined;
let queryClient: postgres.Sql | undefined;
let db: Database | undefined;

// Initialize from environment if available (for scripts and local dev)
if (typeof process !== 'undefined' && process.env?.DATABASE_URL) {
  const connectionString = process.env.DATABASE_URL;

  // Create a postgres client for migrations and admin operations
  migrationClient = postgres(connectionString, { max: 1 });

  // Create a postgres client for regular operations
  queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

  // Create the drizzle instance with schema
  db = drizzle(queryClient, { schema });
}

export { migrationClient, queryClient, db };

/**
 * Get database instance, throwing if not initialized
 * Use this in services to avoid undefined checks everywhere
 */
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Set DATABASE_URL environment variable.');
  }
  return db;
}

/**
 * Create a database connection from a connection string
 * Use this for serverless environments where you need to create connections per-request
 */
export function createDatabase(connectionString: string): Database {
  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 10,
    max_lifetime: 60,
  });

  return drizzle(client, { schema });
}

/**
 * Create a database connection from environment config
 * Useful for Cloudflare Workers or similar serverless environments
 */
export function createDatabaseFromEnv(env: { DATABASE_URL: string }): Database {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured in environment');
  }

  return createDatabase(env.DATABASE_URL);
}

// Re-export schema and postgres for convenience
export { schema, postgres };
