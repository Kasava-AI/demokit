/**
 * OSS Dashboard Database Schema
 *
 * Re-exports all schema tables from @demokit-ai/db.
 * This file is used by drizzle-kit for migrations.
 *
 * Note: This is the OSS version - no users, organizations, or billing tables.
 * DemoKit Cloud extends this schema with enterprise tables.
 */

// Re-export all OSS schema tables
export * from '@demokit-ai/db/schema';
