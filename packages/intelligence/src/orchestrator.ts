/**
 * Intelligence Orchestrator
 *
 * Main entry point that orchestrates the complete intelligence building process:
 * 1. Schema parsing
 * 2. Web scraping (website, help center, documentation)
 * 3. Intelligence synthesis
 * 4. Template generation
 *
 * @module
 */

import { parseOpenAPIFromString, type DemokitSchema } from '@demokit-ai/core'
import type {
  AppIntelligence,
  IntelligenceSource,
  IntelligenceBuildOptions,
  IntelligenceProgress,
  IntelligencePhase,
} from './types'
import { buildIntelligence } from './synthesis-agent'
import { scrapeWebsite, scrapeHelpCenter, type ScrapeOptions } from './web-scraper'
import {
  scrapeWebsiteWithFirecrawl,
  scrapeHelpCenterWithFirecrawl,
  type FirecrawlScrapeOptions,
} from './firecrawl-scraper'
import { INTELLIGENCE_DEFAULTS } from './config'

// ============================================================================
// Types
// ============================================================================

/**
 * Callback for progress updates during intelligence building
 */
export type ProgressCallback = (progress: IntelligenceProgress) => void

/**
 * Extended options for the orchestrator
 */
export interface OrchestratorOptions extends IntelligenceBuildOptions {
  /** Callback for progress updates */
  onProgress?: ProgressCallback
  /** Scrape options for web fetching */
  scrapeOptions?: ScrapeOptions
  /** Skip web scraping (schema only) */
  schemaOnly?: boolean
  /** Use Firecrawl for web scraping (recommended for production) */
  useFirecrawl?: boolean
  /** Firecrawl-specific options */
  firecrawlOptions?: FirecrawlScrapeOptions
}

// ============================================================================
// Progress Helpers
// ============================================================================

/**
 * Create a progress update
 */
function createProgress(
  phase: IntelligencePhase,
  progress: number,
  message: string,
  errors?: string[]
): IntelligenceProgress {
  return { phase, progress, message, errors }
}

/**
 * Report progress if callback is provided
 */
function reportProgress(
  callback: ProgressCallback | undefined,
  phase: IntelligencePhase,
  progress: number,
  message: string,
  errors?: string[]
): void {
  if (callback) {
    callback(createProgress(phase, progress, message, errors))
  }
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Build complete app intelligence from options
 *
 * This is the main entry point for building app intelligence.
 * It orchestrates all steps and provides progress updates.
 *
 * @param options - Build options with schema content and source URLs
 * @returns Complete AppIntelligence
 *
 * @example
 * ```typescript
 * const intelligence = await buildAppIntelligence({
 *   schemaContent: openApiYaml,
 *   websiteUrl: 'https://myapp.com',
 *   helpCenterUrl: 'https://help.myapp.com',
 *   onProgress: (p) => console.log(`${p.phase}: ${p.progress}%`),
 * })
 *
 * console.log(intelligence.features) // Detected features
 * console.log(intelligence.templates) // Generated templates
 * ```
 */
export async function buildAppIntelligence(
  options: OrchestratorOptions
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
    useFirecrawl = true, // Default to Firecrawl for better scraping
    firecrawlOptions = {},
  } = options

  // Validate that either schemaContent or schema is provided
  if (!schemaContent && !providedSchema) {
    throw new Error('Either schemaContent or schema must be provided')
  }

  const sources: IntelligenceSource[] = []

  // Step 1: Parse OpenAPI schema (or use provided parsed schema)
  reportProgress(onProgress, 'parsing_schema', 5, 'Parsing OpenAPI schema...')

  let schema: DemokitSchema
  try {
    if (providedSchema) {
      // Use pre-parsed schema directly
      schema = providedSchema as unknown as DemokitSchema
      sources.push({
        type: 'schema',
        location: 'provided',
        content: JSON.stringify(providedSchema),
        status: 'success',
      })
    } else {
      // Parse from raw content
      schema = await parseOpenAPIFromString(schemaContent!)
      sources.push({
        type: 'schema',
        location: 'provided',
        content: schemaContent!,
        status: 'success',
      })
    }
    reportProgress(onProgress, 'parsing_schema', 15, `Schema parsed: ${Object.keys(schema.models).length} models`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    reportProgress(onProgress, 'failed', 0, `Failed to parse schema: ${message}`, [message])
    throw new Error(`Failed to parse OpenAPI schema: ${message}`)
  }

  // If schemaOnly mode, skip web scraping
  if (schemaOnly) {
    reportProgress(onProgress, 'synthesizing', 50, 'Synthesizing intelligence (schema only)...')
    const result = await buildIntelligence(schema, sources, {
      maxFeatures,
      maxJourneys,
      maxTemplates,
    })
    reportProgress(onProgress, 'complete', 100, 'Intelligence building complete (schema only)')
    return result
  }

  // Step 2: Fetch website content
  if (websiteUrl) {
    reportProgress(onProgress, 'fetching_website', 20, `Fetching website: ${websiteUrl}...`)
    try {
      const result = useFirecrawl
        ? await scrapeWebsiteWithFirecrawl(websiteUrl, firecrawlOptions)
        : await scrapeWebsite(websiteUrl, scrapeOptions)

      if (result.success) {
        sources.push({
          type: 'website',
          location: websiteUrl,
          content: result.content,
          status: 'success',
        })
        reportProgress(onProgress, 'fetching_website', 30, 'Website content fetched')
      } else {
        // Fail-fast: throw immediately on scraping failure
        const errorMessage = `Website scraping failed: ${result.error}`
        reportProgress(onProgress, 'failed', 0, errorMessage, [errorMessage])
        throw new Error(errorMessage)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      reportProgress(onProgress, 'failed', 0, message, [message])
      throw new Error(`Website scraping failed: ${message}`)
    }
  }

  // Step 3: Fetch help center content
  if (helpCenterUrl) {
    reportProgress(onProgress, 'fetching_help_center', 35, `Fetching help center: ${helpCenterUrl}...`)
    try {
      const result = useFirecrawl
        ? await scrapeHelpCenterWithFirecrawl(helpCenterUrl, firecrawlOptions)
        : await scrapeHelpCenter(helpCenterUrl, scrapeOptions)

      if (result.success) {
        sources.push({
          type: 'helpCenter',
          location: helpCenterUrl,
          content: result.content,
          status: 'success',
        })
        reportProgress(onProgress, 'fetching_help_center', 45, 'Help center content fetched')
      } else {
        // Fail-fast: throw immediately on scraping failure
        const errorMessage = `Help center scraping failed: ${result.error}`
        reportProgress(onProgress, 'failed', 0, errorMessage, [errorMessage])
        throw new Error(errorMessage)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      reportProgress(onProgress, 'failed', 0, message, [message])
      throw new Error(`Help center scraping failed: ${message}`)
    }
  }

  // Step 4: Add README content
  if (readmeContent) {
    reportProgress(onProgress, 'analyzing_readme', 50, 'Processing README...')
    sources.push({
      type: 'readme',
      location: 'provided',
      content: readmeContent,
      status: 'success',
    })
    reportProgress(onProgress, 'analyzing_readme', 55, 'README processed')
  }

  // Step 5: Fetch additional documentation
  if (documentationUrls && documentationUrls.length > 0) {
    for (let i = 0; i < documentationUrls.length; i++) {
      const url = documentationUrls[i]
      const progress = 55 + (i / documentationUrls.length) * 10
      reportProgress(onProgress, 'analyzing_readme', progress, `Fetching docs: ${url}...`)

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'DemoKit/1.0' },
          signal: AbortSignal.timeout(scrapeOptions.timeout || 30000),
        })
        if (response.ok) {
          const content = await response.text()
          sources.push({
            type: 'documentation',
            location: url,
            content,
            status: 'success',
          })
        } else {
          // Fail-fast: throw immediately on documentation fetch failure
          const errorMessage = `Documentation fetch failed for ${url}: HTTP ${response.status}`
          reportProgress(onProgress, 'failed', 0, errorMessage, [errorMessage])
          throw new Error(errorMessage)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        reportProgress(onProgress, 'failed', 0, message, [message])
        throw new Error(`Documentation fetch failed for ${url}: ${message}`)
      }
    }
  }

  // Step 6: Synthesize intelligence
  reportProgress(onProgress, 'synthesizing', 70, 'Synthesizing intelligence from all sources...')
  let intelligence: AppIntelligence
  try {
    intelligence = await buildIntelligence(schema, sources, {
      maxFeatures,
      maxJourneys,
      maxTemplates: 0, // We'll generate templates in the next step
    })
    reportProgress(onProgress, 'synthesizing', 85, `Synthesized ${intelligence.features.length} features, ${intelligence.journeys.length} journeys`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    reportProgress(onProgress, 'failed', 0, `Synthesis failed: ${message}`, [message])
    throw new Error(`Intelligence synthesis failed: ${message}`)
  }

  // Step 7: Generate templates
  reportProgress(onProgress, 'generating_templates', 90, `Generating up to ${maxTemplates} templates...`)
  // Templates are already generated in buildIntelligence, but if maxTemplates was 0, regenerate
  if (intelligence.templates.length === 0 && maxTemplates > 0) {
    // Re-run with templates
    intelligence = await buildIntelligence(schema, sources, {
      maxFeatures,
      maxJourneys,
      maxTemplates,
    })
  }

  reportProgress(
    onProgress,
    'complete',
    100,
    `Complete: ${intelligence.features.length} features, ${intelligence.journeys.length} journeys, ${intelligence.templates.length} templates`
  )

  return intelligence
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Build intelligence from schema only (no web scraping)
 *
 * Faster version that only uses the OpenAPI schema.
 *
 * @param schemaContent - OpenAPI schema as string
 * @param options - Optional settings
 * @returns AppIntelligence from schema only
 */
export async function buildIntelligenceFromSchema(
  schemaContent: string,
  options: {
    maxFeatures?: number
    maxJourneys?: number
    maxTemplates?: number
    onProgress?: ProgressCallback
  } = {}
): Promise<AppIntelligence> {
  return buildAppIntelligence({
    schemaContent,
    schemaOnly: true,
    ...options,
  })
}

/**
 * Quick analysis - returns just features and journeys without templates
 *
 * Useful for initial exploration of an API.
 *
 * @param schemaContent - OpenAPI schema as string
 * @returns Basic intelligence without templates
 */
export async function quickAnalyze(
  schemaContent: string
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
