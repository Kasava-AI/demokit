import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit Configuration for OSS Dashboard
 *
 * Uses the OSS schema from @demokit-ai/db package.
 * No enterprise tables (users, organizations, billing) are included.
 *
 * For development: pnpm db:push (direct schema push)
 * For production: pnpm db:generate && pnpm db:migrate
 */
export default defineConfig({
  // Point to the local db wrapper that imports from @demokit-ai/db
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
