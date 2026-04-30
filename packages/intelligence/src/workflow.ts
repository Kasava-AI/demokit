/**
 * Intelligence Workflow
 *
 * Declarative Mastra workflow that drives intelligence building. Steps are
 * Zod-typed end-to-end (no `z.any()` pass-throughs), the workflow is
 * registered on a Mastra instance so observability/scorers/Studio see it,
 * and callers can either `.start()` for the final result or `.stream()` to
 * track per-step progress.
 *
 * Pipeline: parseSchema → fetchSources → synthesize → generateTemplates
 *
 * @module
 */

import { createWorkflow, createStep } from '@mastra/core/workflows'
import { Mastra } from '@mastra/core/mastra'
import { z } from 'zod'
import { parseOpenAPIFromString, type DemokitSchema } from '@demokit-ai/core'
import {
  IntelligenceSourceSchema,
  type AppIntelligence,
  type IntelligenceSource,
} from './types'
import {
  synthesizeIntelligence,
  generateTemplates,
  type SynthesisResult,
} from './synthesis-agent'
import { scrapeWebsite, scrapeHelpCenter } from './web-scraper'
import {
  scrapeWebsiteWithFirecrawl,
  scrapeHelpCenterWithFirecrawl,
} from './firecrawl-scraper'
import { INTELLIGENCE_DEFAULTS } from './config'
import { intelligenceScorers } from './evals'

// ============================================================================
// Schemas — each piece of opaque structured state gets a real Zod type
// ============================================================================

const SchemaPayloadSchema = z.custom<DemokitSchema>(
  (v) => typeof v === 'object' && v !== null && 'models' in v && 'endpoints' in v,
  { message: 'Expected a parsed DemokitSchema' },
)

const ScrapeOptionsSchema = z.object({
  websiteUrl: z.string().optional(),
  helpCenterUrl: z.string().optional(),
  readmeContent: z.string().optional(),
  documentationUrls: z.array(z.string()).optional(),
  schemaOnly: z.boolean(),
  useFirecrawl: z.boolean(),
  scrapeTimeout: z.number(),
})

const SynthesisOptionsSchema = z.object({
  maxFeatures: z.number(),
  maxJourneys: z.number(),
  maxTemplates: z.number(),
})

const WorkflowInputSchema = z
  .object({
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
  .refine((v) => v.schemaContent != null || v.schema != null, {
    message: 'Either schemaContent or schema must be provided',
  })

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>

const ParsedSchemaOutputSchema = z.object({
  schema: SchemaPayloadSchema,
  sources: z.array(IntelligenceSourceSchema),
  scrapeOptions: ScrapeOptionsSchema,
  synthesisOptions: SynthesisOptionsSchema,
})

const SourcesOutputSchema = z.object({
  schema: SchemaPayloadSchema,
  sources: z.array(IntelligenceSourceSchema),
  synthesisOptions: SynthesisOptionsSchema,
})

/**
 * SynthesisResult is shaped slightly differently from its agent-output Zod
 * schema (e.g. exampleValues is a Record at the type level but an array in
 * structured-output JSON). Use a structural pass-through schema so the
 * workflow type matches the runtime-normalized form.
 */
const SynthesisResultPayloadSchema = z.custom<SynthesisResult>(
  (v) => typeof v === 'object' && v !== null && 'features' in v && 'journeys' in v,
  { message: 'Expected a SynthesisResult' },
)

const SynthesisOutputSchema = z.object({
  schema: SchemaPayloadSchema,
  sources: z.array(IntelligenceSourceSchema),
  synthesis: SynthesisResultPayloadSchema,
  synthesisOptions: SynthesisOptionsSchema,
})

const AppIntelligencePayloadSchema = z.custom<AppIntelligence>(
  (v) =>
    typeof v === 'object' &&
    v !== null &&
    'features' in v &&
    'journeys' in v &&
    'templates' in v,
  { message: 'Expected an AppIntelligence' },
)

const IntelligenceOutputSchema = z.object({
  intelligence: AppIntelligencePayloadSchema,
})

// ============================================================================
// Steps
// ============================================================================

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
      scrapeOptions: {
        websiteUrl,
        helpCenterUrl,
        readmeContent,
        documentationUrls,
        schemaOnly,
        useFirecrawl,
        scrapeTimeout,
      },
      synthesisOptions: { maxFeatures, maxJourneys, maxTemplates },
    }
  },
})

const fetchSourcesStep = createStep({
  id: 'fetch-sources',
  description: 'Fetch website, help center, docs, and README content in parallel',
  inputSchema: ParsedSchemaOutputSchema,
  outputSchema: SourcesOutputSchema,
  retries: 1,
  execute: async ({ inputData }) => {
    const { schema, sources, scrapeOptions, synthesisOptions } = inputData
    const updatedSources: IntelligenceSource[] = [...sources]

    if (scrapeOptions.schemaOnly) {
      return { schema, sources: updatedSources, synthesisOptions }
    }

    const work: Promise<void>[] = []

    if (scrapeOptions.websiteUrl) {
      work.push(
        (async () => {
          const result = scrapeOptions.useFirecrawl
            ? await scrapeWebsiteWithFirecrawl(scrapeOptions.websiteUrl!)
            : await scrapeWebsite(scrapeOptions.websiteUrl!)
          if (result.success) {
            updatedSources.push({
              type: 'website',
              location: scrapeOptions.websiteUrl!,
              content: result.content,
              status: 'success',
            })
          } else {
            throw new Error(`Website scraping failed: ${result.error}`)
          }
        })(),
      )
    }

    if (scrapeOptions.helpCenterUrl) {
      work.push(
        (async () => {
          const result = scrapeOptions.useFirecrawl
            ? await scrapeHelpCenterWithFirecrawl(scrapeOptions.helpCenterUrl!)
            : await scrapeHelpCenter(scrapeOptions.helpCenterUrl!)
          if (result.success) {
            updatedSources.push({
              type: 'helpCenter',
              location: scrapeOptions.helpCenterUrl!,
              content: result.content,
              status: 'success',
            })
          } else {
            throw new Error(`Help center scraping failed: ${result.error}`)
          }
        })(),
      )
    }

    if (scrapeOptions.readmeContent) {
      updatedSources.push({
        type: 'readme',
        location: 'provided',
        content: scrapeOptions.readmeContent,
        status: 'success',
      })
    }

    if (scrapeOptions.documentationUrls?.length) {
      for (const url of scrapeOptions.documentationUrls) {
        work.push(
          (async () => {
            const response = await fetch(url, {
              headers: { 'User-Agent': 'DemoKit/1.0' },
              signal: AbortSignal.timeout(scrapeOptions.scrapeTimeout),
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
          })(),
        )
      }
    }

    await Promise.all(work)
    return { schema, sources: updatedSources, synthesisOptions }
  },
})

const synthesizeStep = createStep({
  id: 'synthesize-intelligence',
  description: 'Synthesize features, journeys, and entity maps from all sources',
  inputSchema: SourcesOutputSchema,
  outputSchema: SynthesisOutputSchema,
  retries: 1,
  execute: async ({ inputData }) => {
    const { schema, sources, synthesisOptions } = inputData
    const synthesis = await synthesizeIntelligence(schema, sources, {
      maxFeatures: synthesisOptions.maxFeatures,
      maxJourneys: synthesisOptions.maxJourneys,
    })
    return { schema, sources, synthesis, synthesisOptions }
  },
})

const generateTemplatesStep = createStep({
  id: 'generate-templates',
  description: 'Generate narrative demo templates from synthesized intelligence',
  inputSchema: SynthesisOutputSchema,
  outputSchema: IntelligenceOutputSchema,
  retries: 1,
  execute: async ({ inputData }) => {
    const { schema, sources, synthesis, synthesisOptions } = inputData
    const templates = await generateTemplates(synthesis, schema, {
      maxTemplates: synthesisOptions.maxTemplates,
    })

    const intelligence: AppIntelligence = {
      appName: synthesis.appName,
      appDescription: synthesis.appDescription,
      domain: synthesis.domain,
      industry: synthesis.industry,
      sources,
      features: synthesis.features,
      journeys: synthesis.journeys,
      entityMaps: synthesis.entityMaps as AppIntelligence['entityMaps'],
      templates,
      generatedAt: new Date().toISOString(),
      overallConfidence: calculateWorkflowConfidence(synthesis, sources),
      suggestions: synthesis.suggestions,
    }

    return { intelligence }
  },
})

// ============================================================================
// Workflow definition + Mastra registration
// ============================================================================

/**
 * The intelligence workflow — declarative pipeline for building app intelligence.
 *
 * Pipeline: parseSchema → fetchSources → synthesize → generateTemplates
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

/**
 * Mastra instance with the intelligence workflow + scorers registered.
 *
 * Use this when you want Studio/Mastra Cloud observability or want to
 * resolve the workflow via `intelligenceMastra.getWorkflow('intelligenceWorkflow')`.
 */
export const intelligenceMastra = new Mastra({
  workflows: { intelligenceWorkflow },
  scorers: intelligenceScorers,
})

// ============================================================================
// Execution helpers
// ============================================================================

/**
 * Execute the intelligence workflow and return the final result.
 *
 * Prefer this when you only need the final `AppIntelligence`. Use
 * `streamIntelligenceWorkflow` when you want per-step progress events.
 */
export async function executeIntelligenceWorkflow(
  input: WorkflowInput,
): Promise<AppIntelligence> {
  const run = await intelligenceWorkflow.createRun()
  const result = await run.start({ inputData: input })

  if (result.status === 'success') {
    return result.result.intelligence
  }
  if (result.status === 'failed') {
    throw new Error(`Intelligence workflow failed: ${result.error.message}`)
  }
  throw new Error(`Intelligence workflow ended with status: ${result.status}`)
}

/**
 * Stream execution of the intelligence workflow.
 *
 * Returns the run-stream alongside a `result` promise that resolves to the
 * final `AppIntelligence`. Iterate the stream's `fullStream` to get per-step
 * `step-start` / `step-result` events for progress reporting.
 */
export async function streamIntelligenceWorkflow(input: WorkflowInput) {
  const run = await intelligenceWorkflow.createRun()
  const stream = run.stream({ inputData: input })
  return {
    stream,
    result: (async (): Promise<AppIntelligence> => {
      const result = await stream.result
      if (result.status === 'success') return result.result.intelligence
      if (result.status === 'failed')
        throw new Error(`Intelligence workflow failed: ${result.error.message}`)
      throw new Error(`Intelligence workflow ended with status: ${result.status}`)
    })(),
  }
}

// ============================================================================
// Helpers
// ============================================================================

function calculateWorkflowConfidence(
  synthesis: SynthesisResult,
  sources: IntelligenceSource[],
): number {
  const featureConfidence = synthesis.features.length > 0
    ? synthesis.features.reduce((sum, f) => sum + f.confidence, 0) / synthesis.features.length
    : 0.3

  const successfulSources = sources.filter((s) => s.status === 'success').length
  const sourceBonus = Math.min(successfulSources * 0.1, 0.3)
  const journeyPenalty = synthesis.journeys.length === 0 ? 0.1 : 0

  return Math.min(1, Math.max(0, featureConfidence + sourceBonus - journeyPenalty))
}
