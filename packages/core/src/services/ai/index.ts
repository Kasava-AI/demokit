/**
 * @demokit/ai
 *
 * AI-powered narrative generation for DemoKit.
 *
 * This package provides Level 3 (narrative-driven) demo data generation
 * using Mastra agents and Anthropic Claude. Supports BYOK (Bring Your Own Key)
 * for self-hosted deployments.
 *
 * ## Quick Start
 *
 * Set your API key:
 * ```bash
 * export ANTHROPIC_API_KEY=sk-ant-xxx
 * ```
 *
 * Generate narrative-driven demo data:
 * ```typescript
 * import { generateNarrativeData, createNarrative } from '@demokit/ai'
 * import { importFromOpenAPI, inferAppContext } from '@demokit/schema'
 *
 * const schema = await importFromOpenAPI('./openapi.yaml')
 * const appContext = inferAppContext(schema)
 *
 * const narrative = createNarrative(
 *   'E-commerce holiday rush with one delayed order',
 *   ['High volume of sales', 'One frustrated customer', 'Resolution story']
 * )
 *
 * const result = await generateNarrativeData({
 *   schema,
 *   appContext,
 *   narrative,
 * })
 *
 * console.log(result.data) // Generated demo data
 * ```
 *
 * ## Features
 *
 * - **Level 3 Generation**: Creates data that tells a coherent story
 * - **Schema-Guided**: Uses Zod structured output for type-safe generation
 * - **BYOK Support**: Works with your own Anthropic API key
 * - **Streaming**: Real-time progress for UI integration
 * - **Observability**: Optional Langfuse integration for tracing
 *
 * @license Apache-2.0
 * @packageDocumentation
 */

// AI-powered generation
export {
  generateNarrativeData,
  streamNarrativeData,
  createNarrative,
  buildSourceIntelligenceContext,
  type AIGeneratorConfig,
  type NarrativeGenerationOptions,
  type SourceIntelligence,
  type ExtendedGenerationMetadata,
  type ExtendedGenerationResult,
} from './generation/ai-generator'

// Mastra configuration and agents
export {
  createMastra,
  createMastraSync,
  mastra,
  createNarrativeAgent,
  createContextAgent,
  inferAppContextWithAgent,
  buildSchemaContext,
  modelToZodSchema,
  createDemoDataSchema,
  createPartialDemoDataSchema,
  AppContextSchema,
  EntityContextSchema,
  type MastraOptions,
} from './mastra'

// Agent aliases for convenience
export {
  createNarrativeAgent as narrativeAgent,
  createContextAgent as contextAgent,
} from './mastra'
