/**
 * Mastra Configuration
 *
 * Central Mastra instance for DemoKit's AI-powered generation.
 *
 * Features:
 * - Schema-guided agents for narrative data generation
 * - Langfuse observability via AI Tracing (optional)
 * - Simple retry with exponential backoff
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

// ============================================================================
// Mastra Instance
// ============================================================================

/**
 * Create a Mastra instance with optional Langfuse observability
 *
 * Uses the new AI Tracing system (not deprecated OTEL telemetry).
 *
 * @param options - Configuration options
 * @returns Configured Mastra instance
 *
 * @example
 * ```typescript
 * // Without observability (local development)
 * const mastra = createMastra()
 *
 * // With Langfuse observability
 * const mastra = createMastra({
 *   observability: {
 *     enabled: true,
 *     langfusePublicKey: process.env.LANGFUSE_PUBLIC_KEY,
 *     langfuseSecretKey: process.env.LANGFUSE_SECRET_KEY,
 *     langfuseBaseUrl: process.env.LANGFUSE_BASE_URL,
 *   }
 * })
 * ```
 */
export async function createMastra(options: MastraOptions = {}): Promise<Mastra> {
  const { observability } = options

  // TODO: Re-enable Langfuse observability once Mastra API stabilizes
  // The observability config format changed in recent Mastra versions
  if (observability?.enabled) {
    console.warn(
      '[demokit] Langfuse observability is temporarily disabled pending Mastra API updates. ' +
        'Using default Mastra instance without observability.'
    )
  }

  return new Mastra({})
}

/**
 * Create a Mastra instance synchronously (without Langfuse)
 *
 * Use this when you don't need observability or want to avoid async initialization.
 *
 * @returns Configured Mastra instance without observability
 */
export function createMastraSync(): Mastra {
  return new Mastra({})
}

/**
 * Options for creating a Mastra instance
 */
export interface MastraOptions {
  /**
   * Langfuse observability configuration
   *
   * Uses the new AI Tracing system for LLM-specific analytics:
   * - Token usage and costs
   * - Latency breakdown
   * - Conversation tracking
   * - Quality scoring
   */
  observability?: {
    /** Enable Langfuse observability */
    enabled: boolean
    /** Langfuse public key (from Langfuse Settings → API Keys) */
    langfusePublicKey?: string
    /** Langfuse secret key (from Langfuse Settings → API Keys) */
    langfuseSecretKey?: string
    /** Langfuse base URL (default: https://cloud.langfuse.com) */
    langfuseBaseUrl?: string
    /** Send traces immediately (true for dev, false for production batching) */
    realtime?: boolean
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default Mastra instance (no observability)
 *
 * Use createMastra() for custom configuration with Langfuse.
 */
export const mastra = createMastraSync()
