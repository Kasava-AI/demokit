/**
 * App Intelligence Module
 *
 * Multi-source app understanding and dynamic template generation.
 *
 * @module
 */

// Configuration
export { INTELLIGENCE_DEFAULTS, INTELLIGENCE_LIMITS } from './config'

// Types and Zod schemas
export * from './types'

// Synthesis agent and functions
export {
  createSynthesisAgent,
  createTemplateAgent,
  synthesizeIntelligence,
  generateTemplates,
  buildIntelligence,
  buildSourceContext,
  SynthesisResultSchema,
  TemplateGenerationResultSchema,
  type SynthesisResult,
} from './synthesis-agent'

// Web scraper (basic fetch-based)
export {
  scrapeUrl,
  scrapeUrls,
  fetchSource,
  fetchSources,
  scrapeHelpCenter,
  scrapeWebsite,
  type ScrapeOptions,
  type ScrapeResult,
} from './web-scraper'

// Firecrawl scraper (recommended for production)
export {
  scrapeUrlWithFirecrawl,
  scrapeUrlsWithFirecrawl,
  scrapeWebsiteWithFirecrawl,
  scrapeHelpCenterWithFirecrawl,
  fetchSourceWithFirecrawl,
  fetchSourcesWithFirecrawl,
  type FirecrawlScrapeOptions,
} from './firecrawl-scraper'

// Orchestrator
export {
  buildAppIntelligence,
  buildIntelligenceFromSchema,
  quickAnalyze,
  type ProgressCallback,
  type OrchestratorOptions,
} from './orchestrator'

// Source analysis agent
export {
  createSourceAnalysisAgent,
  analyzeSource,
  hasSourceAnalysis,
  parseSourceAnalysis,
  SourceAnalysisSchema,
  type SourceAnalysis,
  type SourceAnalysisInput,
} from './source-analysis-agent'

// Source linker
export {
  linkSourceToEntities,
  type FeatureInfo,
  type JourneyInfo,
  type SourceContribution,
  type LinkingResult,
} from './source-linker'
