/**
 * @demokit-cloud/ai
 *
 * AI-powered narrative generation for DemoKit.
 *
 * This package provides Level 3 (narrative-driven) demo data generation
 * using Mastra agents and Anthropic Claude.
 *
 * @example
 * ```typescript
 * import { generateNarrativeData, createNarrative } from '@demokit-cloud/ai'
 *
 * const narrative = createNarrative(
 *   'E-commerce holiday rush with one delayed order',
 *   ['High volume of sales', 'One frustrated customer', 'Resolution story']
 * )
 *
 * const result = await generateNarrativeData({
 *   schema,
 *   appContext: inferAppContext(schema),
 *   narrative,
 * })
 * ```
 *
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
} from './generation/ai-generator'

// Mastra configuration and agents
export {
  createMastra,
  mastra,
  createNarrativeAgent,
  createContextAgent,
  inferAppContextWithAgent,
  buildSchemaContext,
  AppContextSchema,
  EntityContextSchema,
} from './mastra'

// Agent aliases for convenience
export {
  createNarrativeAgent as narrativeAgent,
  createContextAgent as contextAgent,
} from './mastra'
