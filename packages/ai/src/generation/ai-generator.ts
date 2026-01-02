/**
 * AI-powered Narrative Data Generator (Mastra Edition)
 *
 * This module provides Level 3 (narrative-driven) data generation using Mastra agents.
 * Unlike Level 1 (schema-valid) or Level 2 (relationship-valid) generation,
 * narrative-driven generation creates data that tells a coherent story.
 *
 * Key features:
 * - Schema-guided output via Zod structured output
 * - Simple retry with exponential backoff
 * - Fail fast - no "best attempt" returns
 * - **Streaming support** for real-time progress updates
 *
 * @example
 * ```typescript
 * // Non-streaming (returns complete result)
 * const result = await generateNarrativeData({
 *   schema,
 *   appContext: inferAppContext(schema),
 *   narrative: createNarrative('E-commerce demo', ['Show orders']),
 * })
 *
 * // Streaming (returns Mastra agent stream for AI SDK integration)
 * const stream = await streamNarrativeData({
 *   schema,
 *   appContext: inferAppContext(schema),
 *   narrative: createNarrative('E-commerce demo', ['Show orders']),
 * })
 * // Use with @mastra/ai-sdk toAISdkFormat() for client streaming
 * ```
 *
 * @module
 */

import type { DemokitSchema } from '@demokit-ai/core'
import {
  validateData,
  generateDemoData,
  type AppContext,
  type DemoNarrative,
  type DemoData,
  type GenerationMetadata,
  type GenerationResult,
  type Character,
  type MetricTarget,
  type TimelineEvent,
} from '@demokit-ai/core'
import {
  createNarrativeAgent,
  buildSchemaContext,
  createDemoDataSchema,
} from '../mastra'

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the AI generator
 *
 * Controls retry behavior and fallback options.
 *
 * @example
 * ```typescript
 * const config: AIGeneratorConfig = {
 *   maxRetries: 3,
 *   useAI: true,
 * }
 * ```
 */
export interface AIGeneratorConfig {
  /** Maximum retries for generation failures. Defaults to 3. */
  maxRetries?: number

  /** Whether to use AI. When false, falls back to Level 2 generation. */
  useAI?: boolean
}

/**
 * Source intelligence from project data sources (website, docs, etc.)
 *
 * This provides additional context from scraped sources to make
 * generated data more realistic and relevant to the specific application.
 */
export interface SourceIntelligence {
  /** App identity extracted from sources */
  appIdentity?: {
    name?: string | null
    description?: string | null
    domain?: string | null
    industry?: string | null
    targetAudience?: string | null
    valueProposition?: string | null
    competitiveAdvantages?: string[] | null
  }
  /** Detected features from the application */
  features?: Array<{
    name: string
    description?: string | null
    category?: string | null
  }>
  /** User journeys discovered from sources */
  journeys?: Array<{
    name: string
    description?: string | null
    persona?: string | null
  }>
  /** Business meaning for data models */
  entityMaps?: Array<{
    modelName: string
    displayName?: string | null
    purpose?: string | null
  }>
}

/**
 * Options for narrative generation
 *
 * Combines schema, app context, and narrative to generate story-driven data.
 *
 * @example
 * ```typescript
 * const options: NarrativeGenerationOptions = {
 *   schema,
 *   appContext: inferAppContext(schema),
 *   narrative: createNarrative('Sales demo', ['Show dashboards', 'Highlight trends']),
 *   counts: { Customer: 10, Order: 50 },
 *   format: 'typescript',
 *   sourceIntelligence: {
 *     appIdentity: { name: 'Acme Corp', domain: 'e-commerce' },
 *     features: [{ name: 'Order Management', description: '...' }],
 *   },
 * }
 * ```
 */
export interface NarrativeGenerationOptions {
  /** Schema to generate data for. Must have models and relationships defined. */
  schema: DemokitSchema

  /** App context (inferred via inferAppContext or manually provided). */
  appContext: AppContext

  /** Narrative describing the demo scenario and key story points. */
  narrative: DemoNarrative

  /** Number of records per model. Keys are model names, values are counts. */
  counts?: Record<string, number>

  /** Base timestamp (epoch ms) for reproducible, consistent timestamps. */
  baseTimestamp?: number

  /** AI configuration (retries, fallback). */
  aiConfig?: AIGeneratorConfig

  /** Output format. 'typescript' generates fixture code, 'json' is data only. */
  format?: 'typescript' | 'json'

  /** Intelligence from project sources (website, docs, etc.) for richer context. */
  sourceIntelligence?: SourceIntelligence
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Generate narrative-driven demo data using Mastra agents
 *
 * This is the main entry point for Level 3 generation. The process:
 *
 * 1. Check if AI is enabled and API key is available
 * 2. Create a schema-guided Mastra agent with Zod structured output
 * 3. Call the agent to generate data
 * 4. Validate the generated data against the schema
 * 5. If generation fails, retry with exponential backoff
 * 6. Fail fast if all retries exhausted (no fallback to Level 2)
 *
 * @param options - Generation options including schema, context, and narrative
 * @returns Promise resolving to generated data with validation results
 * @throws Error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await generateNarrativeData({
 *   schema,
 *   appContext: inferAppContext(schema),
 *   narrative: createNarrative('Demo scenario', ['Point 1', 'Point 2']),
 * })
 *
 * if (result.validation.valid) {
 *   console.log('Generated', result.metadata.totalRecords, 'records')
 * }
 * ```
 */
export async function generateNarrativeData(
  options: NarrativeGenerationOptions
): Promise<ExtendedGenerationResult> {
  const {
    schema,
    appContext,
    narrative,
    counts,
    baseTimestamp,
    aiConfig = {},
    format,
    sourceIntelligence,
  } = options

  const { useAI = true, maxRetries = 3 } = aiConfig

  // -------------------------------------------------------------------------
  // Fallback Check: If AI is disabled or no API key, use Level 2 generation
  // -------------------------------------------------------------------------
  if (!useAI || !hasAPIKey()) {
    console.warn('AI generation disabled or no API key - falling back to relationship-valid generation')
    // L2 generation doesn't have token usage, so tokensUsed will be undefined
    return generateDemoData(schema, {
      level: 'relationship-valid',
      counts,
      baseTimestamp,
      format,
    }) as ExtendedGenerationResult
  }

  // -------------------------------------------------------------------------
  // Create Mastra Agent with Schema-Guided Output
  // -------------------------------------------------------------------------
  const agent = createNarrativeAgent(schema)
  const outputSchema = createDemoDataSchema(schema)

  // Build the generation prompt with source intelligence
  const prompt = buildGenerationPrompt(schema, appContext, narrative, counts, sourceIntelligence)

  // -------------------------------------------------------------------------
  // Retry Loop with Exponential Backoff
  // -------------------------------------------------------------------------
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Exponential backoff (skip on first attempt)
      if (attempt > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await sleep(delayMs)
      }

      // Call Mastra agent with structured output
      const result = await agent.generate(prompt, { structuredOutput: { schema: outputSchema } })

      // Extract the structured output and token usage
      const data = result.object as DemoData
      const tokensUsed = result.usage?.totalTokens

      // Validate the generated data
      const validation = validateData(data, { schema })

      if (validation.valid) {
        // Success! Return the validated result
        return buildResult(data, validation, narrative, format, tokensUsed)
      }

      // Validation failed - store error for potential retry
      lastError = new Error(
        `Validation failed: ${validation.errors.slice(0, 3).map(e => e.message).join(', ')}`
      )

      // Try to fix with a follow-up prompt if retries remain
      if (attempt < maxRetries - 1) {
        const fixPrompt = buildFixPrompt(data, validation.errors)
        const fixResult = await agent.generate(fixPrompt, { structuredOutput: { schema: outputSchema } })
        const fixedData = fixResult.object as DemoData
        const fixedValidation = validateData(fixedData, { schema })

        if (fixedValidation.valid) {
          // Accumulate tokens from both attempts
          const totalTokens = (tokensUsed ?? 0) + (fixResult.usage?.totalTokens ?? 0)
          return buildResult(fixedData, fixedValidation, narrative, format, totalTokens || undefined)
        }
      }
    } catch (error) {
      // Log error and continue to next retry attempt
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`AI generation attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message)
    }
  }

  // -------------------------------------------------------------------------
  // All Retries Exhausted - Fail Fast
  // -------------------------------------------------------------------------
  throw new Error(
    `AI generation failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`
  )
}

// ============================================================================
// Streaming Entry Point
// ============================================================================

/**
 * Stream narrative-driven demo data generation
 *
 * Returns a Mastra agent stream that can be transformed using @mastra/ai-sdk's
 * toAISdkFormat() for client-side consumption with AI SDK's useChat hook.
 *
 * Use this for real-time progress updates in the UI.
 *
 * @param options - Generation options (same as generateNarrativeData)
 * @returns Promise resolving to a Mastra agent stream
 *
 * @example
 * ```typescript
 * // In a Next.js API route
 * import { toAISdkFormat } from '@mastra/ai-sdk'
 * import { createUIMessageStreamResponse } from 'ai'
 *
 * export async function POST(req: Request) {
 *   const { schema, narrative, counts } = await req.json()
 *
 *   const stream = await streamNarrativeData({
 *     schema,
 *     appContext: inferAppContext(schema),
 *     narrative,
 *     counts,
 *   })
 *
 *   const aiSdkStream = toAISdkFormat(stream, { from: 'agent' })
 *   return createUIMessageStreamResponse({ stream: aiSdkStream })
 * }
 * ```
 */
export async function streamNarrativeData(
  options: NarrativeGenerationOptions
) {
  const {
    schema,
    appContext,
    narrative,
    counts,
    aiConfig = {},
  } = options

  const { useAI = true } = aiConfig

  // Check if AI is available
  if (!useAI || !hasAPIKey()) {
    throw new Error('AI generation requires ANTHROPIC_API_KEY environment variable')
  }

  // Create agent and prompt
  const agent = createNarrativeAgent(schema)
  const prompt = buildGenerationPrompt(schema, appContext, narrative, counts)

  // Return the stream directly - caller handles AI SDK transformation
  return agent.stream(prompt)
}

// ============================================================================
// API Key Detection
// ============================================================================

/**
 * Check if we have an API key for Anthropic
 *
 * Mastra uses @ai-sdk/anthropic which reads from ANTHROPIC_API_KEY.
 *
 * @returns true if an API key is available
 */
function hasAPIKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Build source intelligence context for the prompt
 *
 * Formats features, journeys, and entity mappings from scraped sources
 * into a readable context section for the AI.
 *
 * @param sourceIntelligence - Intelligence from project sources
 * @returns Formatted context string or empty string if no intelligence
 */
export function buildSourceIntelligenceContext(sourceIntelligence?: SourceIntelligence): string {
  if (!sourceIntelligence) {
    return ''
  }

  const sections: string[] = []

  // Add detected features
  if (sourceIntelligence.features && sourceIntelligence.features.length > 0) {
    const featureList = sourceIntelligence.features
      .slice(0, 10) // Limit to top 10 features
      .map(f => `- **${f.name}**${f.category ? ` (${f.category})` : ''}: ${f.description || 'No description'}`)
      .join('\n')
    sections.push(`
## Detected Product Features (from website/docs analysis)

These features were detected from the product website and documentation. Generated data should support demonstrating these capabilities:

${featureList}`)
  }

  // Add user journeys
  if (sourceIntelligence.journeys && sourceIntelligence.journeys.length > 0) {
    const journeyList = sourceIntelligence.journeys
      .slice(0, 5) // Limit to top 5 journeys
      .map(j => `- **${j.name}**${j.persona ? ` (${j.persona})` : ''}: ${j.description || 'No description'}`)
      .join('\n')
    sections.push(`
## Common User Journeys

The generated data should support these typical user flows:

${journeyList}`)
  }

  // Add entity context
  if (sourceIntelligence.entityMaps && sourceIntelligence.entityMaps.length > 0) {
    const entityList = sourceIntelligence.entityMaps
      .map(e => `- **${e.modelName}** → "${e.displayName || e.modelName}": ${e.purpose || 'Core entity'}`)
      .join('\n')
    sections.push(`
## Business Context for Data Models

Use these business meanings when generating realistic field values:

${entityList}`)
  }

  // Add competitive advantages as context
  if (sourceIntelligence.appIdentity?.competitiveAdvantages?.length) {
    const advantages = sourceIntelligence.appIdentity.competitiveAdvantages
      .map(a => `- ${a}`)
      .join('\n')
    sections.push(`
## Product Differentiators

The generated demo should highlight these unique value propositions:

${advantages}`)
  }

  return sections.join('\n')
}

/**
 * Build the prompt for AI data generation
 *
 * Creates a detailed prompt that includes:
 * - Application context (name, description, domain, features)
 * - Source intelligence (from website, docs, etc.) for richer context
 * - Data models with field definitions
 * - Relationships between models
 * - Narrative requirements (scenario, characters, timeline, metrics)
 * - Record count requirements
 * - Output format instructions
 *
 * @param schema - The schema with models and relationships
 * @param appContext - Application context (domain, features, entities)
 * @param narrative - Demo narrative with scenario and key points
 * @param counts - Optional record counts per model
 * @param sourceIntelligence - Optional intelligence from project sources
 * @returns Formatted prompt string for the AI
 */
function buildGenerationPrompt(
  schema: DemokitSchema,
  appContext: AppContext,
  narrative: DemoNarrative,
  counts?: Record<string, number>,
  sourceIntelligence?: SourceIntelligence
): string {
  // Format characters if provided in narrative
  const characterDescriptions = narrative.characters
    ? narrative.characters.map(c => `- ${c.name}: ${c.role}${c.description ? ` - ${c.description}` : ''}`).join('\n')
    : 'None specified'

  // Format timeline events if provided
  const timelineDescriptions = narrative.timeline
    ? narrative.timeline.map(t => `- ${t.when}: ${t.event}`).join('\n')
    : 'None specified'

  // Format metric targets if provided
  const metricDescriptions = narrative.metrics
    ? narrative.metrics.map(m => `- ${m.name}: ${m.trend || 'stable'}${m.amount ? ` (${m.amount})` : ''}`).join('\n')
    : 'None specified'

  // Format record count requirements
  const countDescriptions = counts
    ? Object.entries(counts).map(([model, count]) => `- ${model}: ${count} records`).join('\n')
    : 'Use default counts (5 per model)'

  // Include schema context for the agent
  const schemaContext = buildSchemaContext(schema)

  // Build source intelligence context if available
  const sourceContext = buildSourceIntelligenceContext(sourceIntelligence)

  // Assemble the complete prompt
  return `Generate demo data for this application.

## Application Context
- **Name**: ${sourceIntelligence?.appIdentity?.name || appContext.name}
- **Description**: ${sourceIntelligence?.appIdentity?.description || appContext.description}
- **Domain**: ${sourceIntelligence?.appIdentity?.domain || appContext.domain}
- **Features**: ${appContext.features.join(', ')}
${sourceIntelligence?.appIdentity?.industry ? `- **Industry**: ${sourceIntelligence.appIdentity.industry}` : ''}
${sourceIntelligence?.appIdentity?.targetAudience ? `- **Target Audience**: ${sourceIntelligence.appIdentity.targetAudience}` : ''}
${sourceIntelligence?.appIdentity?.valueProposition ? `- **Value Proposition**: ${sourceIntelligence.appIdentity.valueProposition}` : ''}
${sourceContext}
${schemaContext}

## Demo Narrative

**Scenario**: ${narrative.scenario}

**Key Points**:
${narrative.keyPoints.map(p => `- ${p}`).join('\n')}

**Characters**:
${characterDescriptions}

**Timeline**:
${timelineDescriptions}

**Metric Targets**:
${metricDescriptions}

## Record Counts

${countDescriptions}

## Requirements

1. Generate data that matches the schema exactly
2. **CRITICAL: Every record MUST have a UNIQUE ID** - generate a different UUID for each record
3. All foreign key references must point to existing IDs from the related model
4. Timestamps should be in ISO 8601 format
5. Data should support the narrative and key points
6. Characters should appear in the appropriate records
7. Metrics should reflect the specified trends
8. Timeline events should be reflected in timestamps
9. **Each record must be unique** - do NOT duplicate records

Generate the data now. Return an object where each key is a model name and each value is an array of UNIQUE records with UNIQUE IDs.`
}

// ============================================================================
// Error Fix Prompt
// ============================================================================

/**
 * Build a prompt to fix validation errors
 *
 * When AI-generated data fails validation, this prompt asks the AI
 * to fix specific errors while maintaining narrative coherence.
 *
 * @param data - The invalid generated data
 * @param errors - List of validation errors to fix
 * @returns Formatted fix prompt string
 */
function buildFixPrompt(
  data: DemoData,
  errors: Array<{ model: string; field: string; message: string }>
): string {
  // Limit to first 10 errors to avoid prompt bloat
  const errorDescriptions = errors
    .slice(0, 10)
    .map(e => `- ${e.model}.${e.field}: ${e.message}`)
    .join('\n')

  return `The generated data has validation errors. Please fix them.

## Current Data

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

## Validation Errors

${errorDescriptions}

## Fix Requirements

1. **CRITICAL: Ensure every record has a UNIQUE ID** - no duplicate IDs within the same model
2. Fix all foreign key references to point to existing IDs
3. Ensure all required fields are present
4. Ensure all values match their expected types and formats
5. Maintain the narrative coherence
6. Each record should be different - don't just copy the same data

Return the corrected data with the same structure. Every ID must be unique.`
}

// ============================================================================
// Result Building
// ============================================================================

/**
 * Extended metadata that includes token usage for L3 generation
 */
export interface ExtendedGenerationMetadata extends GenerationMetadata {
  /** Total tokens used for L3 AI generation */
  tokensUsed?: number
}

/**
 * Extended result type that includes token usage
 */
export interface ExtendedGenerationResult extends GenerationResult {
  metadata: ExtendedGenerationMetadata
}

/**
 * Build the final generation result
 *
 * Assembles the result object with:
 * - Generated data
 * - Validation results
 * - Generation metadata (counts, IDs, timing, token usage)
 * - Optional TypeScript fixtures
 *
 * @param data - The generated and validated data
 * @param validation - Validation results
 * @param narrative - The narrative (for fixture comments)
 * @param format - Output format ('typescript' generates fixtures)
 * @param tokensUsed - Total tokens used from AI generation
 * @returns Complete generation result
 */
function buildResult(
  data: DemoData,
  validation: ReturnType<typeof validateData>,
  narrative: DemoNarrative,
  format?: 'typescript' | 'json',
  tokensUsed?: number
): ExtendedGenerationResult {
  // Calculate metadata: record counts per model
  const recordsByModel: Record<string, number> = {}
  const usedIds: Record<string, string[]> = {}
  let totalRecords = 0

  for (const [modelName, records] of Object.entries(data)) {
    recordsByModel[modelName] = records.length
    totalRecords += records.length

    // Extract IDs from records (check common ID field names)
    usedIds[modelName] = records
      .map(r => String(r.id || r.ID || r._id || ''))
      .filter(Boolean)
  }

  const metadata: ExtendedGenerationMetadata = {
    level: 'narrative-driven',
    generatedAt: new Date().toISOString(),
    totalRecords,
    recordsByModel,
    usedIds,
    durationMs: 0, // Not tracked for AI generation (async by nature)
    tokensUsed,
  }

  // Generate TypeScript fixtures if requested
  const fixtures = format === 'typescript'
    ? generateTypeScriptFixtures(data, narrative)
    : undefined

  return {
    data,
    fixtures,
    validation,
    metadata,
  }
}

// ============================================================================
// TypeScript Fixture Generation
// ============================================================================

/**
 * Generate TypeScript fixture code with narrative comments
 *
 * Creates exportable TypeScript constants with:
 * - Header comment with scenario and key points
 * - Individual exports per model (DEMO_CUSTOMER, DEMO_ORDER, etc.)
 * - Combined DEMO_DATA export with all models
 * - 'as const' assertions for type safety
 *
 * @param data - The generated demo data
 * @param narrative - Narrative for header comments
 * @returns TypeScript source code string
 *
 * @example
 * Output:
 * ```typescript
 * /**
 *  * Auto-generated narrative-driven demo fixtures
 *  * Scenario: E-commerce demo
 *  * Key points:
 *  * - Show dashboard
 *  * - Process orders
 *  *‍/
 * export const DEMO_CUSTOMER = [...] as const
 * export const DEMO_DATA = { Customer: DEMO_CUSTOMER, ... } as const
 * ```
 */
function generateTypeScriptFixtures(data: DemoData, narrative: DemoNarrative): string {
  // Build header comment with narrative info
  const lines: string[] = [
    '/**',
    ' * Auto-generated narrative-driven demo fixtures',
    ` * Generated at: ${new Date().toISOString()}`,
    ' *',
    ` * Scenario: ${narrative.scenario}`,
    ' *',
    ' * Key points:',
    ...narrative.keyPoints.map(p => ` * - ${p}`),
    ' */',
    '',
  ]

  // Generate individual exports for each model
  for (const [modelName, records] of Object.entries(data)) {
    const varName = `DEMO_${toConstantCase(modelName)}`
    lines.push(`export const ${varName} = ${JSON.stringify(records, null, 2)} as const`)
    lines.push('')
  }

  // Generate combined DEMO_DATA export
  const modelNames = Object.keys(data)
  lines.push('export const DEMO_DATA = {')
  for (const name of modelNames) {
    lines.push(`  ${name}: DEMO_${toConstantCase(name)},`)
  }
  lines.push('} as const')

  return lines.join('\n')
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a name to CONSTANT_CASE
 *
 * Transforms camelCase or PascalCase to SCREAMING_SNAKE_CASE.
 *
 * @param name - Input name (e.g., "CustomerOrder", "userId")
 * @returns CONSTANT_CASE name (e.g., "CUSTOMER_ORDER", "USER_ID")
 *
 * @example
 * toConstantCase('CustomerOrder')  // 'CUSTOMER_ORDER'
 * toConstantCase('userId')         // 'USER_ID'
 */
function toConstantCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Insert underscore between lower and upper
    .replace(/[^a-zA-Z0-9]/g, '_')       // Replace non-alphanumeric with underscore
    .toUpperCase()
}

// ============================================================================
// Narrative Builder
// ============================================================================

/**
 * Create a narrative from scenario and key points
 *
 * Convenience function to build a DemoNarrative object with optional
 * characters, timeline, and metrics.
 *
 * @param scenario - Brief description of the demo scenario
 * @param keyPoints - List of important story points to highlight
 * @param options - Optional characters, timeline events, and metric targets
 * @returns Complete DemoNarrative object
 *
 * @example
 * ```typescript
 * // Simple narrative
 * const simple = createNarrative(
 *   'E-commerce demo',
 *   ['Show catalog', 'Complete checkout']
 * )
 *
 * // Narrative with characters and timeline
 * const detailed = createNarrative(
 *   'Customer support scenario',
 *   ['Issue reported', 'Resolution achieved'],
 *   {
 *     characters: [
 *       { name: 'Sarah', role: 'customer' },
 *       { name: 'Mike', role: 'support agent' },
 *     ],
 *     timeline: [
 *       { when: 'Day 1', event: 'Issue reported' },
 *       { when: 'Day 2', event: 'Issue resolved' },
 *     ],
 *     metrics: [
 *       { name: 'satisfaction', trend: 'increasing' },
 *     ],
 *   }
 * )
 * ```
 */
export function createNarrative(
  scenario: string,
  keyPoints: string[],
  options?: {
    characters?: Character[]
    timeline?: TimelineEvent[]
    metrics?: MetricTarget[]
  }
): DemoNarrative {
  return {
    scenario,
    keyPoints,
    characters: options?.characters,
    timeline: options?.timeline,
    metrics: options?.metrics,
  }
}
