/**
 * Intelligence Workflow
 *
 * Declarative Mastra workflow that replaces the imperative orchestrator.
 * Benefits over the old approach:
 * - Type-safe state propagation between steps (Zod-validated)
 * - Built-in retry per step
 * - Declarative .then() chaining
 * - Streaming support for real-time progress
 *
 * @module
 */

import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { parseOpenAPIFromString, type DemokitSchema } from '@demokit-ai/core'
import type { AppIntelligence, IntelligenceSource } from './types'
import { synthesizeIntelligence, generateTemplates } from './synthesis-agent'
import type { SynthesisResult } from './synthesis-agent'
import { scrapeWebsite, scrapeHelpCenter } from './web-scraper'
import {
  scrapeWebsiteWithFirecrawl,
  scrapeHelpCenterWithFirecrawl,
} from './firecrawl-scraper'
import { INTELLIGENCE_DEFAULTS } from './config'

// ============================================================================
// Step Schemas
// ============================================================================

const WorkflowInputSchema = z.object({
  schemaContent: z.string().optional().describe('Raw OpenAPI spec string'),
  schema: z.record(z.string(), z.unknown()).optional().describe('Pre-parsed schema object'),
  websiteUrl: z.string().optional(),
  helpCenterUrl: z.string().optional(),
  readmeContent: z.string().optional(),
  documentationUrls: z.array(z.string()).optional(),
  maxFeatures: z.number().optional(),
  maxJourneys: z.number().optional(),
  maxTemplates: z.number().optional(),
  schemaOnly: z.boolean().optional(),
  useFirecrawl: z.boolean().optional(),
  scrapeTimeout: z.number().optional(),
})

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>

const ParsedSchemaOutputSchema = z.object({
  schema: z.any().describe('Parsed DemokitSchema'),
  sources: z.array(z.any()).describe('Initial sources array'),
  options: z.object({
    websiteUrl: z.string().optional(),
    helpCenterUrl: z.string().optional(),
    readmeContent: z.string().optional(),
    documentationUrls: z.array(z.string()).optional(),
    maxFeatures: z.number(),
    maxJourneys: z.number(),
    maxTemplates: z.number(),
    schemaOnly: z.boolean(),
    useFirecrawl: z.boolean(),
    scrapeTimeout: z.number(),
  }),
})

const SourcesOutputSchema = z.object({
  schema: z.any(),
  sources: z.array(z.any()),
  options: z.object({
    maxFeatures: z.number(),
    maxJourneys: z.number(),
    maxTemplates: z.number(),
  }),
})

const SynthesisOutputSchema = z.object({
  schema: z.any(),
  synthesis: z.any(),
  sources: z.array(z.any()),
  options: z.object({
    maxTemplates: z.number(),
  }),
})

const IntelligenceOutputSchema = z.object({
  intelligence: z.any().describe('Complete AppIntelligence object'),
})

// ============================================================================
// Steps
// ============================================================================

/**
 * Step 1: Parse OpenAPI schema
 */
const parseSchemaStep = createStep({
  id: 'parse-schema',
  description: 'Parse OpenAPI schema and prepare initial state',
  inputSchema: WorkflowInputSchema,
  outputSchema: ParsedSchemaOutputSchema,
  retries: 0,
  execute: async ({ inputData }) => {
    const {
      schemaContent,
      schema: providedSchema,
      websiteUrl,
      helpCenterUrl,
      readmeContent,
      documentationUrls,
      maxFeatures = INTELLIGENCE_DEFAULTS.maxFeatures,
      maxJourneys = INTELLIGENCE_DEFAULTS.maxJourneys,
      maxTemplates = INTELLIGENCE_DEFAULTS.maxTemplates,
      schemaOnly = false,
      useFirecrawl = true,
      scrapeTimeout = 30000,
    } = inputData

    if (!schemaContent && !providedSchema) {
      throw new Error('Either schemaContent or schema must be provided')
    }

    const sources: IntelligenceSource[] = []
    let schema: DemokitSchema

    if (providedSchema) {
      schema = providedSchema as unknown as DemokitSchema
      sources.push({
        type: 'schema',
        location: 'provided',
        content: JSON.stringify(providedSchema),
        status: 'success',
      })
    } else {
      schema = await parseOpenAPIFromString(schemaContent!)
      sources.push({
        type: 'schema',
        location: 'provided',
        content: schemaContent!,
        status: 'success',
      })
    }

    return {
      schema,
      sources,
      options: {
        websiteUrl,
        helpCenterUrl,
        readmeContent,
        documentationUrls,
        maxFeatures,
        maxJourneys,
        maxTemplates,
        schemaOnly,
        useFirecrawl,
        scrapeTimeout,
      },
    }
  },
})

/**
 * Step 2: Fetch all sources (website, help center, docs, readme)
 *
 * Runs scraping operations in parallel within the step for efficiency.
 * Uses Firecrawl by default for production-grade scraping.
 */
const fetchSourcesStep = createStep({
  id: 'fetch-sources',
  description: 'Fetch website, help center, docs, and README content in parallel',
  inputSchema: ParsedSchemaOutputSchema,
  outputSchema: SourcesOutputSchema,
  retries: 1,
  execute: async ({ inputData }) => {
    const { schema, sources, options } = inputData
    const updatedSources = [...sources]

    if (options.schemaOnly) {
      return {
        schema,
        sources: updatedSources,
        options: {
          maxFeatures: options.maxFeatures,
          maxJourneys: options.maxJourneys,
          maxTemplates: options.maxTemplates,
        },
      }
    }

    // Run all scraping operations in parallel
    const scrapePromises: Promise<void>[] = []

    // Website scraping
    if (options.websiteUrl) {
      scrapePromises.push(
        (async () => {
          const result = options.useFirecrawl
            ? await scrapeWebsiteWithFirecrawl(options.websiteUrl!)
            : await scrapeWebsite(options.websiteUrl!)

          if (result.success) {
            updatedSources.push({
              type: 'website',
              location: options.websiteUrl!,
              content: result.content,
              status: 'success',
            })
          } else {
            throw new Error(`Website scraping failed: ${result.error}`)
          }
        })()
      )
    }

    // Help center scraping
    if (options.helpCenterUrl) {
      scrapePromises.push(
        (async () => {
          const result = options.useFirecrawl
            ? await scrapeHelpCenterWithFirecrawl(options.helpCenterUrl!)
            : await scrapeHelpCenter(options.helpCenterUrl!)

          if (result.success) {
            updatedSources.push({
              type: 'helpCenter',
              location: options.helpCenterUrl!,
              content: result.content,
              status: 'success',
            })
          } else {
            throw new Error(`Help center scraping failed: ${result.error}`)
          }
        })()
      )
    }

    // README
    if (options.readmeContent) {
      updatedSources.push({
        type: 'readme',
        location: 'provided',
        content: options.readmeContent,
        status: 'success',
      })
    }

    // Documentation URLs — fetch in parallel
    if (options.documentationUrls && options.documentationUrls.length > 0) {
      for (const url of options.documentationUrls) {
        scrapePromises.push(
          (async () => {
            const response = await fetch(url, {
              headers: { 'User-Agent': 'DemoKit/1.0' },
              signal: AbortSignal.timeout(options.scrapeTimeout),
            })
            if (response.ok) {
              const content = await response.text()
              updatedSources.push({
                type: 'documentation',
                location: url,
                content,
                status: 'success',
              })
            } else {
              throw new Error(`Documentation fetch failed for ${url}: HTTP ${response.status}`)
            }
          })()
        )
      }
    }

    // Wait for all scraping to complete
    await Promise.all(scrapePromises)

    return {
      schema,
      sources: updatedSources,
      options: {
        maxFeatures: options.maxFeatures,
        maxJourneys: options.maxJourneys,
        maxTemplates: options.maxTemplates,
      },
    }
  },
})

/**
 * Step 3: Synthesize intelligence from all sources
 *
 * Uses the synthesis agent with quality guardrails and fallback error strategy.
 */
const synthesizeStep = createStep({
  id: 'synthesize-intelligence',
  description: 'Synthesize features, journeys, and entity maps from all sources',
  inputSchema: SourcesOutputSchema,
  outputSchema: SynthesisOutputSchema,
  retries: 1,
  execute: async ({ inputData }) => {
    const { schema, sources, options } = inputData

    const synthesis = await synthesizeIntelligence(
      schema as DemokitSchema,
      sources as IntelligenceSource[],
      {
        maxFeatures: options.maxFeatures,
        maxJourneys: options.maxJourneys,
      }
    )

    return {
      schema,
      synthesis,
      sources,
      options: {
        maxTemplates: options.maxTemplates,
      },
    }
  },
})

/**
 * Step 4: Generate narrative templates from synthesis
 */
const generateTemplatesStep = createStep({
  id: 'generate-templates',
  description: 'Generate narrative demo templates from synthesized intelligence',
  inputSchema: SynthesisOutputSchema,
  outputSchema: IntelligenceOutputSchema,
  retries: 1,
  execute: async ({ inputData }) => {
    const { schema, synthesis, sources, options } = inputData
    const typedSchema = schema as DemokitSchema
    const typedSynthesis = synthesis as SynthesisResult
    const typedSources = sources as IntelligenceSource[]

    const templates = await generateTemplates(typedSynthesis, typedSchema, {
      maxTemplates: options.maxTemplates,
    })

    // Assemble complete intelligence
    const intelligence: AppIntelligence = {
      appName: typedSynthesis.appName,
      appDescription: typedSynthesis.appDescription,
      domain: typedSynthesis.domain,
      industry: typedSynthesis.industry,
      sources: typedSources,
      features: typedSynthesis.features,
      journeys: typedSynthesis.journeys,
      entityMaps: typedSynthesis.entityMaps as AppIntelligence['entityMaps'],
      templates,
      generatedAt: new Date().toISOString(),
      overallConfidence: calculateWorkflowConfidence(typedSynthesis, typedSources),
      suggestions: typedSynthesis.suggestions,
    }

    return { intelligence }
  },
})

// ============================================================================
// Workflow Definition
// ============================================================================

/**
 * The intelligence workflow — declarative pipeline for building app intelligence.
 *
 * Pipeline: parseSchema → fetchSources → synthesize → generateTemplates
 *
 * Each step has its own retry policy and Zod-validated input/output schemas.
 */
export const intelligenceWorkflow = createWorkflow({
  id: 'build-app-intelligence',
  inputSchema: WorkflowInputSchema,
  outputSchema: IntelligenceOutputSchema,
})
  .then(parseSchemaStep)
  .then(fetchSourcesStep)
  .then(synthesizeStep)
  .then(generateTemplatesStep)

intelligenceWorkflow.commit()

// ============================================================================
// Workflow Execution Helper
// ============================================================================

/**
 * Execute the intelligence workflow and return the result.
 *
 * This is a convenience wrapper that handles workflow run lifecycle.
 */
export async function executeIntelligenceWorkflow(
  input: WorkflowInput
): Promise<AppIntelligence> {
  const run = await intelligenceWorkflow.createRun()
  const result = await run.start({ inputData: input })

  if (result.status === 'success') {
    const output = result.result as { intelligence: AppIntelligence }
    return output.intelligence
  }

  if (result.status === 'failed') {
    throw new Error(`Intelligence workflow failed: ${result.error.message}`)
  }

  throw new Error(`Intelligence workflow ended with status: ${result.status}`)
}

// ============================================================================
// Helpers
// ============================================================================

function calculateWorkflowConfidence(
  synthesis: SynthesisResult,
  sources: IntelligenceSource[]
): number {
  const featureConfidence = synthesis.features.length > 0
    ? synthesis.features.reduce((sum, f) => sum + f.confidence, 0) / synthesis.features.length
    : 0.3

  const successfulSources = sources.filter(s => s.status === 'success').length
  const sourceBonus = Math.min(successfulSources * 0.1, 0.3)
  const journeyPenalty = synthesis.journeys.length === 0 ? 0.1 : 0

  return Math.min(1, Math.max(0, featureConfidence + sourceBonus - journeyPenalty))
}
