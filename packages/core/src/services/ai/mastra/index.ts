/**
 * Mastra Configuration
 *
 * Central Mastra instance for DemoKit's AI-powered generation.
 *
 * Observability is provided by Mastra Cloud — no additional configuration here.
 *
 * @license Apache-2.0
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

/**
 * Create a Mastra instance.
 */
export function createMastra(): Mastra {
  return new Mastra({})
}

/**
 * Default Mastra instance.
 */
export const mastra = createMastra()
