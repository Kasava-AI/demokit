/**
 * DemoKit OSS Database Schema
 *
 * This package exports schema tables only - no migrations.
 * Consuming applications (OSS dashboard, Cloud) are responsible for migrations.
 *
 * ## Usage in OSS Dashboard
 * ```typescript
 * import * as schema from '@demokit-ai/db/schema';
 * // Use drizzle-kit push for development
 * ```
 *
 * ## Usage in DemoKit Cloud (extending with enterprise tables)
 * ```typescript
 * // demokit-cloud/src/db/schema/index.ts
 *
 * // Re-export all OSS tables
 * export * from '@demokit-ai/db/schema';
 *
 * // Add cloud-only tables
 * export * from './users';
 * export * from './organizations';
 * export * from './billing';
 * export * from './api-keys';
 * ```
 *
 * Then point drizzle.config.ts to your combined schema:
 * ```typescript
 * // demokit-cloud/drizzle.config.ts
 * export default {
 *   schema: './src/db/schema/index.ts',
 *   out: './drizzle',
 *   // ...
 * };
 * ```
 *
 * @module @demokit-ai/db/schema
 */

// Re-export all enums
export * from './enums';

// Re-export project tables
export * from './projects';

// Re-export intelligence tables
export * from './intelligence';

// Re-export template tables
export * from './templates';

// Re-export fixture tables
export * from './fixtures';

// Re-export demo tables
export * from './demos';
