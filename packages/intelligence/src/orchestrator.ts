/**
 * Intelligence Orchestrator
 *
 * Thin entry point that delegates to the Mastra workflow. When a progress
 * callback is supplied, we use `run.stream()` and translate workflow step
 * events into `IntelligenceProgress` updates — no parallel imperative path.
 *
 * @module
 */

import type {
  AppIntelligence,
  IntelligenceBuildOptions,
  IntelligenceProgress,
  IntelligencePhase,
} from './types'
import type { ScrapeOptions } from './web-scraper'
import type { FirecrawlScrapeOptions } from './firecrawl-scraper'
import { INTELLIGENCE_DEFAULTS } from './config'
import {
  executeIntelligenceWorkflow,
  streamIntelligenceWorkflow,
  type WorkflowInput,
} from './workflow'

// ============================================================================
// Public types
// ============================================================================

export type ProgressCallback = (progress: IntelligenceProgress) => void

export interface OrchestratorOptions extends IntelligenceBuildOptions {
  /** Progress callback invoked on workflow step transitions. */
  onProgress?: ProgressCallback
  /** Scrape options for web fetching. */
  scrapeOptions?: ScrapeOptions
  /** Skip web scraping (schema only). */
  schemaOnly?: boolean
  /** Use Firecrawl for web scraping (recommended for production). */
  useFirecrawl?: boolean
  /** Firecrawl-specific options (currently unused — Firecrawl uses its own envs). */
  firecrawlOptions?: FirecrawlScrapeOptions
}

// ============================================================================
// Step ID → progress mapping
// ============================================================================

interface StepMilestone {
  startPhase: IntelligencePhase
  startProgress: number
  endProgress: number
  /** Status message shown when the step starts. */
  startMessage: string
}

const STEP_MILESTONES: Record<string, StepMilestone> = {
  'parse-schema': {
    startPhase: 'parsing_schema',
    startProgress: 5,
    endProgress: 15,
    startMessage: 'Parsing schema...',
  },
  'fetch-sources': {
    startPhase: 'fetching_website',
    startProgress: 20,
    endProgress: 65,
    startMessage: 'Fetching sources...',
  },
  'synthesize-intelligence': {
    startPhase: 'synthesizing',
    startProgress: 70,
    endProgress: 85,
    startMessage: 'Synthesizing intelligence...',
  },
  'generate-templates': {
    startPhase: 'generating_templates',
    startProgress: 90,
    endProgress: 99,
    startMessage: 'Generating templates...',
  },
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Build complete app intelligence.
 *
 * Delegates to the Mastra workflow. With `onProgress`, streams step events
 * and translates them into `IntelligenceProgress` updates.
 */
export async function buildAppIntelligence(
  options: OrchestratorOptions,
): Promise<AppIntelligence> {
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
    onProgress,
    scrapeOptions = {},
    schemaOnly = false,
    useFirecrawl = true,
  } = options

  if (!schemaContent && !providedSchema) {
    throw new Error('Either schemaContent or schema must be provided')
  }

  const input: WorkflowInput = {
    schemaContent,
    schema: providedSchema,
    websiteUrl,
    helpCenterUrl,
    readmeContent,
    documentationUrls,
    maxFeatures,
    maxJourneys,
    maxTemplates,
    schemaOnly,
    useFirecrawl,
    scrapeTimeout: scrapeOptions.timeout ?? 30000,
  }

  if (!onProgress) {
    return executeIntelligenceWorkflow(input)
  }

  onProgress({ phase: 'parsing_schema', progress: 1, message: 'Starting intelligence workflow...' })

  try {
    const { stream, result } = await streamIntelligenceWorkflow(input)

    for await (const chunk of stream.fullStream) {
      const event = chunk as { type?: string; payload?: { id?: string; output?: unknown } }
      if (!event.type) continue

      const stepId = event.payload?.id
      if (!stepId) continue
      const milestone = STEP_MILESTONES[stepId]
      if (!milestone) continue

      if (event.type === 'workflow-step-start') {
        onProgress({
          phase: milestone.startPhase,
          progress: milestone.startProgress,
          message: milestone.startMessage,
        })
      } else if (event.type === 'workflow-step-result') {
        onProgress({
          phase: milestone.startPhase,
          progress: milestone.endProgress,
          message: `${milestone.startMessage} done`,
        })
      }
    }

    const intelligence = await result
    onProgress({
      phase: 'complete',
      progress: 100,
      message: `Complete: ${intelligence.features.length} features, ${intelligence.journeys.length} journeys, ${intelligence.templates.length} templates`,
    })
    return intelligence
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    onProgress({ phase: 'failed', progress: 0, message, errors: [message] })
    throw error
  }
}

// ============================================================================
// Convenience wrappers
// ============================================================================

/**
 * Build intelligence from schema only (no web scraping).
 */
export async function buildIntelligenceFromSchema(
  schemaContent: string,
  options: {
    maxFeatures?: number
    maxJourneys?: number
    maxTemplates?: number
    onProgress?: ProgressCallback
  } = {},
): Promise<AppIntelligence> {
  return buildAppIntelligence({
    schemaContent,
    schemaOnly: true,
    ...options,
  })
}

/**
 * Quick analysis — returns just features and journeys without templates.
 */
export async function quickAnalyze(
  schemaContent: string,
): Promise<Pick<AppIntelligence, 'appName' | 'appDescription' | 'domain' | 'features' | 'journeys'>> {
  const intelligence = await buildAppIntelligence({
    schemaContent,
    schemaOnly: true,
    maxFeatures: 10,
    maxJourneys: 5,
    maxTemplates: 0,
  })

  return {
    appName: intelligence.appName,
    appDescription: intelligence.appDescription,
    domain: intelligence.domain,
    features: intelligence.features,
    journeys: intelligence.journeys,
  }
}
