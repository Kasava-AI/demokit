import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables - .env.local takes precedence over .env
dotenv.config({ path: join(__dirname, '../../../../.env.local') });
dotenv.config({ path: join(__dirname, '../../../../.env') });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  console.log('Connecting to database...');

  // Create a postgres connection for migrations
  const sql = postgres(connectionString, {
    max: 1,
    onnotice: () => {}, // Suppress notices during migration
  });

  const db = drizzle(sql);

  try {
    console.log('Running database migrations...');

    // Run migrations from the drizzle folder
    await migrate(db, {
      migrationsFolder: join(__dirname, '../drizzle'),
    });

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Always close the connection
    await sql.end();
  }
}

// Run migrations if this file is executed directly
runMigrations().catch((error) => {
  console.error('Failed to run migrations:', error);
  process.exit(1);
});

export { runMigrations };
