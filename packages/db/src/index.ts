// DemoKit Database Package
// PostgreSQL database abstraction with Drizzle ORM

export * from './schema';
export * from './client';

// Re-export commonly used drizzle-orm operators to avoid duplicate package issues in monorepos
export { eq, and, or, ne, gt, gte, lt, lte, desc, asc, sql, inArray, notInArray, isNull, isNotNull } from 'drizzle-orm';
