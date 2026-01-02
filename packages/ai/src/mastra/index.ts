/**
 * Mastra Configuration
 *
 * Central Mastra instance for DemoKit's AI-powered generation.
 *
 * Features:
 * - Schema-guided agents for narrative data generation
 * - Simple retry with exponential backoff
 *
 * Note: Langfuse observability support requires @mastra/observability package.
 * See Mastra docs for advanced observability configuration.
 *
 * @module
 */

import { Mastra } from '@mastra/core/mastra'

// Re-export agents from top-level agents module
export * from '../agents'

// Re-export schema-to-zod utilities
export {
  modelToZodSchema,
  createDemoDataSchema,
  createPartialDemoDataSchema,
} from './schema-to-zod'

// ============================================================================
// Mastra Instance
// ============================================================================

/**
 * Create a Mastra instance
 *
 * @returns Configured Mastra instance
 *
 * @example
 * ```typescript
 * const mastra = createMastra()
 * ```
 */
export function createMastra(): Mastra {
  return new Mastra({})
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default Mastra instance
 *
 * For advanced observability configuration (Langfuse, etc.),
 * see the @mastra/observability package and Mastra docs.
 */
export const mastra = createMastra()
