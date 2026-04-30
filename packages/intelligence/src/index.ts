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

// Mastra tools (scraper tools with toModelOutput)
export {
  scrapeUrlTool,
  scrapeWebsiteTool,
  scrapeHelpCenterTool,
  fetchDocumentationTool,
} from './tools'

// Quality processors (Mastra outputProcessors + sync validators)
export {
  validateSynthesisQuality,
  validateTemplateQuality,
  synthesisQualityProcessor,
  templateQualityProcessor,
  SynthesisQualityProcessor,
  TemplateQualityProcessor,
  SYNTHESIS_CONTEXT_KEY,
  TEMPLATE_CONTEXT_KEY,
  MIN_QUALITY_SCORE,
  type QualityValidationResult,
  type TemplateRefs,
  type SynthesisQualityMetadata,
  type TemplateQualityMetadata,
} from './processors'

// Evals / Scorers (Mastra createScorer instances + sync compute helpers)
export {
  featureCompletenessScorer,
  journeyCoherenceScorer,
  templateRelevanceScorer,
  intelligenceQualityScorer,
  intelligenceScorers,
  computeFeatureCompleteness,
  computeJourneyCoherence,
  computeTemplateRelevance,
  computeIntelligenceQuality,
  type ScorerResult,
  type FeatureCompletenessInput,
  type JourneyCoherenceInput,
  type TemplateRelevanceInput,
  type IntelligenceQualityInput,
  type IntelligenceQualityOutput,
} from './evals'

// Workflow + Mastra instance
export {
  intelligenceWorkflow,
  intelligenceMastra,
  executeIntelligenceWorkflow,
  streamIntelligenceWorkflow,
  type WorkflowInput,
} from './workflow'
