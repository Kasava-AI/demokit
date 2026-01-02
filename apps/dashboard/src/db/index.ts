/**
 * Database Client for OSS Dashboard
 *
 * Provides database access using the OSS schema from @demokit-ai/db.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Type for database instance with schema
export type Database = ReturnType<typeof drizzle<typeof schema>>;

// Connection instances
let queryClient: postgres.Sql | undefined;
let db: Database | undefined;

/**
 * Get or create the database connection
 */
export function getDb(): Database {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    queryClient = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });

    db = drizzle(queryClient, { schema });
  }

  return db;
}

/**
 * Create a database connection from a connection string
 * Use this for serverless environments or one-off operations
 */
export function createDatabase(connectionString: string): Database {
  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 10,
    max_lifetime: 60,
  });

  return drizzle(client, { schema });
}

// Re-export schema and types
export { schema };
export type { Database as DbClient };
