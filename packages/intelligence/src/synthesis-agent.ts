/**
 * Intelligence Synthesis Agent
 *
 * Mastra agents that synthesize multi-source data into AppIntelligence.
 * Takes schema + website content + help center + README and outputs
 * features, user journeys, and entity mappings.
 *
 * Best practices applied:
 * - Prompt caching: static instructions cached, dynamic context per-request
 * - Structured output with fallback error strategy
 * - Quality guardrails with retry on poor output
 * - Agent delegation for source analysis
 *
 * @module
 */

import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { DemokitSchema } from '@demokit-ai/core'
import type {
  AppIntelligence,
  DynamicNarrativeTemplate,
  IntelligenceSource,
} from './types'
import {
  FeatureSchema,
  UserJourneySchema,
  DataEntityMapSchema,
  DynamicNarrativeTemplateSchema,
} from './types'
import { INTELLIGENCE_DEFAULTS } from './config'
import {
  validateSynthesisQuality,
  buildSynthesisRetryPrompt,
  validateTemplateQuality,
  buildTemplateRetryPrompt,
} from './processors'

// ============================================================================
// Constants
// ============================================================================

/** Maximum retries when quality guardrails fail */
const MAX_QUALITY_RETRIES = 2

/** Minimum quality score to accept without retry */
const MIN_QUALITY_SCORE = 0.6

// ============================================================================
// Static Instructions (cached by Anthropic for 5-min TTL)
// ============================================================================

/**
 * Static synthesis instructions — large block that benefits from prompt caching.
 * Separated from dynamic per-request context following the kasava pattern.
 *
 * When using Anthropic models, this block is cached via providerOptions
 * on the generate() call with cacheControl: 'ephemeral' (5-min TTL).
 */
const SYNTHESIS_STATIC_INSTRUCTIONS = `You are an expert at understanding applications from multiple sources.

Your job is to analyze:
1. **API Schema**: Models, relationships, endpoints
2. **Website Content**: Marketing copy, feature descriptions
3. **Help Center**: User documentation, how-to guides
4. **README**: Developer documentation, setup guides

From these sources, synthesize a complete understanding of the application:

## Features Detection
Identify distinct features of the application. For each feature:
- Give it a kebab-case ID and human-readable name
- Describe what it does
- List which models it uses
- Estimate confidence (0-1) based on evidence strength

## User Journeys
Identify common paths users take through the application. For each journey:
- Name the journey and who it's for (persona)
- List the steps with actions and outcomes
- Note which models are touched at each step

## Entity Mapping
For each significant model in the schema:
- Explain its business meaning (not just technical)
- Identify which fields need realistic data vs generic data
- Describe relationships in business terms

## Tips
- Cross-reference sources to increase confidence
- If website mentions a feature but schema doesn't support it, note lower confidence
- Focus on features that would make compelling demos
- Think about what story the data should tell

Be thorough but practical. Focus on information that helps generate better demo data.`

/**
 * Static template generation instructions — cached separately.
 */
const TEMPLATE_STATIC_INSTRUCTIONS = `You are an expert at creating compelling demo scenarios.

Given an application's features and user journeys, generate narrative templates that:

1. **Tell Stories**: Each template should tell a coherent story
2. **Showcase Features**: Highlight the app's capabilities
3. **Vary Scenarios**: Cover different use cases (happy path, edge cases, growth, decline)
4. **Be Realistic**: Suggest data that feels real and relevant
5. **Support Sales**: Think about what would impress prospects

## Template Categories
- onboarding: First-time user experience
- happyPath: Everything works perfectly
- edgeCase: Handling unusual situations
- recovery: Problem resolution
- growth: Positive trends, scaling
- decline: Churn, issues (useful for "problem → solution" demos)
- comparison: Before/after scenarios
- demo: Sales demo scenarios
- training: Training/tutorial scenarios

## For Each Template
- Create a compelling scenario description
- List 3-5 key story points
- Suggest characters/personas
- Estimate good record counts per model
- Note any special data conditions (e.g., "one order should be delayed")

Focus on templates that would make the demo memorable and impactful.`

/**
 * Anthropic provider options for prompt caching.
 * Static instruction blocks are cached for 5 minutes, reducing
 * cost and latency on repeated calls.
 */
const ANTHROPIC_CACHE_OPTIONS = {
  anthropic: {
    cacheControl: { type: 'ephemeral' as const },
  },
}

// ============================================================================
// Synthesis Result Schema
// ============================================================================

/**
 * Schema for the synthesis result (what the AI returns)
 */
export const SynthesisResultSchema = z.object({
  appName: z.string().describe('Application name'),
  appDescription: z.string().describe('What the application does'),
  domain: z.string().describe('Domain category (e-commerce, b2b-saas, etc.)'),
  industry: z.string().optional().describe('Industry vertical if identifiable'),
  features: z.array(FeatureSchema).describe('Detected application features'),
  journeys: z.array(UserJourneySchema).describe('Common user journeys'),
  entityMaps: z.array(DataEntityMapSchema).describe('Business meaning of entities'),
  suggestions: z.array(z.string()).optional().describe('Suggestions for improving demo data'),
})

export type SynthesisResult = z.infer<typeof SynthesisResultSchema>

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create an intelligence synthesis agent with prompt caching
 *
 * Uses Anthropic's ephemeral cache control on static instructions
 * so repeated calls within 5 minutes reuse the cached prompt prefix.
 */
export function createSynthesisAgent(): Agent {
  return new Agent({
    id: 'demokit-intelligence-synthesis',
    name: 'DemoKit Intelligence Synthesis',
    instructions: SYNTHESIS_STATIC_INSTRUCTIONS,
    model: anthropic('claude-haiku-4-5-20251001'),
  })
}

// ============================================================================
// Synthesis Functions
// ============================================================================

/**
 * Build context from multiple sources for the synthesis agent
 */
export function buildSourceContext(
  schema: DemokitSchema,
  sources: IntelligenceSource[]
): string {
  const sections: string[] = []

  // Schema section
  sections.push('## API Schema\n')
  sections.push(`Title: ${schema.info.title || 'Unknown'}`)
  sections.push(`Description: ${schema.info.description || 'No description'}`)
  sections.push(`\nModels (${Object.keys(schema.models).length}):`)

  for (const [name, model] of Object.entries(schema.models)) {
    const fields = Object.keys(model.properties || {})
    sections.push(`- ${name}: ${model.description || 'No description'} [${fields.join(', ')}]`)
  }

  sections.push(`\nRelationships (${schema.relationships.length}):`)
  for (const rel of schema.relationships) {
    sections.push(`- ${rel.from.model}.${rel.from.field} -> ${rel.to.model}.${rel.to.field} (${rel.type})`)
  }

  sections.push(`\nEndpoints (${schema.endpoints.length}):`)
  for (const ep of schema.endpoints.slice(0, 30)) {
    sections.push(`- ${ep.method.toUpperCase()} ${ep.path}: ${ep.summary || 'No summary'}`)
  }
  if (schema.endpoints.length > 30) {
    sections.push(`... and ${schema.endpoints.length - 30} more endpoints`)
  }

  // Website section
  const websiteSource = sources.find(s => s.type === 'website' && s.status === 'success')
  if (websiteSource?.content) {
    sections.push('\n## Website Content\n')
    const content = websiteSource.content.length > 10000
      ? websiteSource.content.slice(0, 10000) + '\n... [truncated]'
      : websiteSource.content
    sections.push(content)
  }

  // Help center section
  const helpSource = sources.find(s => s.type === 'helpCenter' && s.status === 'success')
  if (helpSource?.content) {
    sections.push('\n## Help Center Content\n')
    const content = helpSource.content.length > 10000
      ? helpSource.content.slice(0, 10000) + '\n... [truncated]'
      : helpSource.content
    sections.push(content)
  }

  // README section
  const readmeSource = sources.find(s => s.type === 'readme' && s.status === 'success')
  if (readmeSource?.content) {
    sections.push('\n## README\n')
    const content = readmeSource.content.length > 5000
      ? readmeSource.content.slice(0, 5000) + '\n... [truncated]'
      : readmeSource.content
    sections.push(content)
  }

  // Documentation sections
  const docSources = sources.filter(s => s.type === 'documentation' && s.status === 'success')
  for (const doc of docSources) {
    if (doc.content) {
      sections.push(`\n## Documentation: ${doc.location}\n`)
      const content = doc.content.length > 5000
        ? doc.content.slice(0, 5000) + '\n... [truncated]'
        : doc.content
      sections.push(content)
    }
  }

  return sections.join('\n')
}

/**
 * Synthesize app intelligence from schema and sources
 *
 * Includes quality guardrails: validates output and retries with
 * targeted feedback if quality is below threshold.
 *
 * @param schema - Parsed DemokitSchema
 * @param sources - Intelligence sources with content
 * @param options - Synthesis options
 * @returns Synthesized intelligence (without templates)
 */
export async function synthesizeIntelligence(
  schema: DemokitSchema,
  sources: IntelligenceSource[],
  options: {
    maxFeatures?: number
    maxJourneys?: number
  } = {}
): Promise<SynthesisResult> {
  const { maxFeatures = INTELLIGENCE_DEFAULTS.maxFeatures, maxJourneys = INTELLIGENCE_DEFAULTS.maxJourneys } = options

  const agent = createSynthesisAgent()
  const context = buildSourceContext(schema, sources)
  const schemaModelNames = Object.keys(schema.models)

  const basePrompt = `Analyze the following application sources and synthesize a complete understanding.

${context}

Requirements:
- Detect up to ${maxFeatures} features
- Identify up to ${maxJourneys} user journeys
- Map all significant models to their business meaning
- Cross-reference sources to validate features
- Assign confidence scores (0-1) based on evidence strength

For features, use these categories: core, advanced, admin, integration, analytics, settings

For journeys, include:
- description: Brief description of the journey
- steps with modelsAffected (array of model names)
- featuresUsed: array of feature IDs used in this journey
- dataFlow: array of model names showing data flow
- confidence: 0-1 score

For entity maps, include:
- displayName: Human-friendly name
- realisticFields: Fields that need realistic data
- genericFields: Fields that can be generic
- businessRelationships: Array of { relatedEntity, description, cardinality } where cardinality is one-to-one, one-to-many, many-to-one, or many-to-many`

  // Quality guardrails: retry with feedback if output is poor
  let prompt = basePrompt
  let lastResult: SynthesisResult | null = null

  for (let attempt = 0; attempt <= MAX_QUALITY_RETRIES; attempt++) {
    let synthesisResult: SynthesisResult

    try {
      const result = await agent.generate(prompt, {
        structuredOutput: { schema: SynthesisResultSchema },
        providerOptions: ANTHROPIC_CACHE_OPTIONS,
      })

      synthesisResult = result.object as SynthesisResult
    } catch (error) {
      // On structured output parse failure, use last result or a minimal fallback
      if (lastResult) {
        console.log(`[synthesizeIntelligence] Structured output failed on attempt ${attempt + 1}, using previous result`)
        return lastResult
      }
      throw error
    }

    // Fix array-format exampleValues back to Record<string, string>
    const raw = synthesisResult as Record<string, unknown>
    const entityMaps = raw.entityMaps as Array<Record<string, unknown>> | undefined
    if (entityMaps) {
      for (const em of entityMaps) {
        if (Array.isArray(em.exampleValues)) {
          em.exampleValues = Object.fromEntries(
            (em.exampleValues as Array<{ field: string; value: string }>).map(e => [e.field, e.value])
          )
        }
      }
    }

    // Run quality validation
    const validation = validateSynthesisQuality(synthesisResult, schemaModelNames)

    if (validation.score >= MIN_QUALITY_SCORE || attempt === MAX_QUALITY_RETRIES) {
      if (validation.issues.length > 0) {
        console.log(`[synthesizeIntelligence] Quality score: ${validation.score.toFixed(2)} with ${validation.issues.length} issues (accepted after ${attempt + 1} attempt(s))`)
      }
      return synthesisResult
    }

    // Quality too low — retry with targeted feedback
    console.log(`[synthesizeIntelligence] Quality score: ${validation.score.toFixed(2)} — retrying (attempt ${attempt + 2}/${MAX_QUALITY_RETRIES + 1})`)
    lastResult = synthesisResult
    prompt = buildSynthesisRetryPrompt(validation, basePrompt)
  }

  // Should not reach here, but satisfy TypeScript
  return lastResult!
}

// ============================================================================
// Template Generation Agent
// ============================================================================

/**
 * Schema for dynamic template generation
 */
export const TemplateGenerationResultSchema = z.object({
  templates: z.array(DynamicNarrativeTemplateSchema).describe('Generated narrative templates'),
})

/**
 * Create a template generation agent with prompt caching
 */
export function createTemplateAgent(): Agent {
  return new Agent({
    id: 'demokit-template-generator',
    name: 'DemoKit Template Generator',
    instructions: TEMPLATE_STATIC_INSTRUCTIONS,
    model: anthropic('claude-haiku-4-5-20251001'),
  })
}

/**
 * Generate dynamic templates from synthesized intelligence
 *
 * Includes quality guardrails and fallback error strategy.
 */
export async function generateTemplates(
  synthesis: SynthesisResult,
  schema: DemokitSchema,
  options: {
    maxTemplates?: number
  } = {}
): Promise<DynamicNarrativeTemplate[]> {
  const { maxTemplates = INTELLIGENCE_DEFAULTS.maxTemplates } = options

  const agent = createTemplateAgent()
  const featureIds = synthesis.features.map(f => f.id)
  const journeyIds = synthesis.journeys.map(j => j.id)

  const context = `
## Application
Name: ${synthesis.appName}
Description: ${synthesis.appDescription}
Domain: ${synthesis.domain}
${synthesis.industry ? `Industry: ${synthesis.industry}` : ''}

## Features (${synthesis.features.length})
${synthesis.features.map(f => `- ${f.name} (id: ${f.id}): ${f.description}`).join('\n')}

## User Journeys (${synthesis.journeys.length})
${synthesis.journeys.map(j => `- ${j.name} (id: ${j.id}, ${j.persona}): ${j.steps.length} steps`).join('\n')}

## Data Models
${Object.keys(schema.models).join(', ')}

## Entity Business Meanings
${synthesis.entityMaps.map(e => `- ${e.modelName}: ${e.businessMeaning}`).join('\n')}
`

  const basePrompt = `Generate up to ${maxTemplates} narrative templates for demos of this application:

${context}

Create a diverse set of templates covering different scenarios and use cases.
Each template should be immediately usable for generating demo data.

Template categories: onboarding, happyPath, edgeCase, recovery, growth, decline, comparison, demo, training, migration

For each template include:
- id: kebab-case identifier
- name: Human readable name
- description: What this template demonstrates
- category: One of the categories above
- featuresShowcased: Array of feature IDs from the list above
- journeyId: Optional journey ID this template follows
- narrative: Object with scenario, keyPoints array, optional suggestedCharacters and suggestedTimeline
- suggestedCounts: Object mapping model names to record counts
- dataConditions: Optional array of special data conditions
- relevanceScore: 0-1 score for how relevant this template is`

  let prompt = basePrompt
  let lastTemplates: DynamicNarrativeTemplate[] = []

  for (let attempt = 0; attempt <= MAX_QUALITY_RETRIES; attempt++) {
    let templates: DynamicNarrativeTemplate[]

    try {
      const result = await agent.generate(prompt, {
        structuredOutput: { schema: TemplateGenerationResultSchema },
        providerOptions: ANTHROPIC_CACHE_OPTIONS,
      })

      // Fix array-format suggestedCounts back to Record<string, number>
      const raw = result.object as Record<string, unknown>
      const rawTemplates = raw.templates as Array<Record<string, unknown>> | undefined
      if (rawTemplates) {
        for (const t of rawTemplates) {
          if (Array.isArray(t.suggestedCounts)) {
            t.suggestedCounts = Object.fromEntries(
              (t.suggestedCounts as Array<{ model: string; count: number }>).map(e => [e.model, e.count])
            )
          }
        }
      }

      templates = (result.object as unknown as { templates: DynamicNarrativeTemplate[] }).templates
    } catch (error) {
      if (lastTemplates.length > 0) {
        console.log(`[generateTemplates] Structured output failed on attempt ${attempt + 1}, using previous result`)
        return lastTemplates
      }
      throw error
    }

    // Run quality validation
    const validation = validateTemplateQuality(templates, featureIds, journeyIds)

    if (validation.score >= MIN_QUALITY_SCORE || attempt === MAX_QUALITY_RETRIES) {
      if (validation.issues.length > 0) {
        console.log(`[generateTemplates] Quality score: ${validation.score.toFixed(2)} with ${validation.issues.length} issues (accepted after ${attempt + 1} attempt(s))`)
      }
      return templates
    }

    console.log(`[generateTemplates] Quality score: ${validation.score.toFixed(2)} — retrying (attempt ${attempt + 2}/${MAX_QUALITY_RETRIES + 1})`)
    lastTemplates = templates
    prompt = buildTemplateRetryPrompt(validation, basePrompt)
  }

  return lastTemplates
}

// ============================================================================
// Complete Intelligence Building
// ============================================================================

/**
 * Build complete app intelligence from schema and sources
 *
 * Orchestrates synthesis + template generation with quality guardrails.
 */
export async function buildIntelligence(
  schema: DemokitSchema,
  sources: IntelligenceSource[],
  options: {
    maxFeatures?: number
    maxJourneys?: number
    maxTemplates?: number
  } = {}
): Promise<AppIntelligence> {
  const {
    maxFeatures = INTELLIGENCE_DEFAULTS.maxFeatures,
    maxJourneys = INTELLIGENCE_DEFAULTS.maxJourneys,
    maxTemplates = INTELLIGENCE_DEFAULTS.maxTemplates,
  } = options

  // Step 1: Synthesize intelligence from sources
  const synthesis = await synthesizeIntelligence(schema, sources, {
    maxFeatures,
    maxJourneys,
  })

  // Step 2: Generate templates from synthesis
  const templates = await generateTemplates(synthesis, schema, {
    maxTemplates,
  })

  // Step 3: Assemble complete intelligence
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
    overallConfidence: calculateOverallConfidence(synthesis, sources),
    suggestions: synthesis.suggestions,
  }

  return intelligence
}

/**
 * Calculate overall confidence based on synthesis and sources
 */
function calculateOverallConfidence(
  synthesis: SynthesisResult,
  sources: IntelligenceSource[]
): number {
  // Base confidence from feature detection
  const featureConfidence = synthesis.features.length > 0
    ? synthesis.features.reduce((sum, f) => sum + f.confidence, 0) / synthesis.features.length
    : 0.3

  // Bonus for multiple successful sources
  const successfulSources = sources.filter(s => s.status === 'success').length
  const sourceBonus = Math.min(successfulSources * 0.1, 0.3)

  // Penalty for no journeys detected
  const journeyPenalty = synthesis.journeys.length === 0 ? 0.1 : 0

  return Math.min(1, Math.max(0, featureConfidence + sourceBonus - journeyPenalty))
}
