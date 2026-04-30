/**
 * Intelligence Processors
 *
 * Mastra `outputProcessors` that validate structured agent output and
 * trigger retries via the tripwire mechanism when quality is poor.
 *
 * Each processor reads its expected schema/feature/journey context out of
 * the agent call's `requestContext`. On a quality failure it calls
 * `args.abort(reason, { retry: true, metadata })` — the agent loop then
 * re-prompts with the reason as feedback (up to `maxProcessorRetries`).
 *
 * The pure validation logic stays exported as `validateSynthesisQuality` /
 * `validateTemplateQuality` for callers that want to inspect quality without
 * running through the agent (e.g. in tests).
 *
 * @module
 */

import type {
  Processor,
  ProcessOutputResultArgs,
  ProcessorMessageResult,
} from '@mastra/core/processors'
import type { SynthesisResult } from './synthesis-agent'
import type { DynamicNarrativeTemplate } from './types'

// ============================================================================
// RequestContext keys
// ============================================================================

/** Keys used to thread validation context to processors via requestContext. */
export const SYNTHESIS_CONTEXT_KEY = 'intelligence.schemaModelNames'
export const TEMPLATE_CONTEXT_KEY = 'intelligence.templateRefs'

export interface TemplateRefs {
  featureIds: string[]
  journeyIds: string[]
}

// ============================================================================
// Quality validation (pure functions)
// ============================================================================

export interface QualityValidationResult {
  valid: boolean
  issues: string[]
  score: number
}

/** Minimum quality score below which the processor will trip and retry. */
export const MIN_QUALITY_SCORE = 0.6

/**
 * Validate a synthesis result against the schema models the agent should
 * have referenced.
 */
export function validateSynthesisQuality(
  synthesis: SynthesisResult,
  schemaModelNames: string[],
): QualityValidationResult {
  const issues: string[] = []
  let score = 1.0

  if (!synthesis.appName || synthesis.appName.trim() === '') {
    issues.push('Missing application name')
    score -= 0.2
  }

  if (!synthesis.appDescription || synthesis.appDescription.trim() === '') {
    issues.push('Missing application description')
    score -= 0.1
  }

  if (!synthesis.features || synthesis.features.length === 0) {
    issues.push('No features detected — synthesis produced empty result')
    score -= 0.4
  }

  const featureIds = new Set<string>()
  for (const feature of synthesis.features ?? []) {
    if (featureIds.has(feature.id)) {
      issues.push(`Duplicate feature ID: ${feature.id}`)
      score -= 0.05
    }
    featureIds.add(feature.id)

    if (feature.confidence < 0 || feature.confidence > 1) {
      issues.push(`Feature "${feature.id}" has invalid confidence: ${feature.confidence}`)
      score -= 0.05
    }

    for (const model of feature.relatedModels) {
      if (schemaModelNames.length > 0 && !schemaModelNames.includes(model)) {
        issues.push(`Feature "${feature.id}" references unknown model: ${model}`)
        score -= 0.02
      }
    }
  }

  for (const journey of synthesis.journeys ?? []) {
    if (journey.confidence < 0 || journey.confidence > 1) {
      issues.push(`Journey "${journey.id}" has invalid confidence: ${journey.confidence}`)
      score -= 0.05
    }

    for (const featureId of journey.featuresUsed) {
      if (!featureIds.has(featureId)) {
        issues.push(`Journey "${journey.id}" references unknown feature: ${featureId}`)
        score -= 0.02
      }
    }

    for (let i = 0; i < journey.steps.length; i++) {
      if (journey.steps[i].order !== i + 1) {
        issues.push(`Journey "${journey.id}" step ${i} has wrong order: ${journey.steps[i].order}`)
        score -= 0.02
      }
    }
  }

  if ((synthesis.entityMaps?.length ?? 0) === 0 && schemaModelNames.length > 0) {
    issues.push('No entity maps generated despite having schema models')
    score -= 0.1
  }

  score = Math.max(0, Math.min(1, score))
  return { valid: issues.length === 0, issues, score }
}

/**
 * Validate template quality against known feature and journey IDs.
 */
export function validateTemplateQuality(
  templates: DynamicNarrativeTemplate[],
  featureIds: string[],
  journeyIds: string[],
): QualityValidationResult {
  const issues: string[] = []
  let score = 1.0

  if (templates.length === 0) {
    issues.push('No templates generated')
    score -= 0.5
  }

  const featureIdSet = new Set(featureIds)
  const journeyIdSet = new Set(journeyIds)
  const templateIds = new Set<string>()

  for (const template of templates) {
    if (templateIds.has(template.id)) {
      issues.push(`Duplicate template ID: ${template.id}`)
      score -= 0.05
    }
    templateIds.add(template.id)

    for (const featureId of template.featuresShowcased) {
      if (!featureIdSet.has(featureId)) {
        issues.push(`Template "${template.id}" showcases unknown feature: ${featureId}`)
        score -= 0.02
      }
    }

    if (template.journeyId && !journeyIdSet.has(template.journeyId)) {
      issues.push(`Template "${template.id}" references unknown journey: ${template.journeyId}`)
      score -= 0.02
    }

    if (!template.narrative.scenario || template.narrative.scenario.trim() === '') {
      issues.push(`Template "${template.id}" has empty scenario`)
      score -= 0.1
    }

    if (!template.narrative.keyPoints || template.narrative.keyPoints.length === 0) {
      issues.push(`Template "${template.id}" has no key points`)
      score -= 0.05
    }

    if (template.relevanceScore < 0 || template.relevanceScore > 1) {
      issues.push(`Template "${template.id}" has invalid relevance score: ${template.relevanceScore}`)
      score -= 0.05
    }
  }

  const categories = new Set(templates.map((t) => t.category))
  if (templates.length >= 3 && categories.size === 1) {
    issues.push(`All ${templates.length} templates have the same category: ${templates[0].category}`)
    score -= 0.1
  }

  score = Math.max(0, Math.min(1, score))
  return { valid: issues.length === 0, issues, score }
}

// ============================================================================
// Helpers — extract structured output from a finished generation
// ============================================================================

/**
 * Pull the structured object out of an agent's finished generation.
 *
 * When `structuredOutput` is configured on the agent, the StructuredOutputProcessor
 * leaves the parsed JSON either as the response text (most common) or in a tool
 * call result. This helper handles both cases and silently returns `undefined`
 * if it can't find/parse anything — the caller decides whether that's an issue.
 */
function extractStructuredObject<T = unknown>(
  args: ProcessOutputResultArgs<unknown>,
): T | undefined {
  const text = args.result?.text
  if (typeof text === 'string' && text.trim().length > 0) {
    try {
      return JSON.parse(text) as T
    } catch {
      // Fall through — the StructuredOutputProcessor may have already wrapped it.
    }
  }

  // Fallback: dig through the last step's tool calls / results.
  const steps = args.result?.steps ?? []
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i] as Record<string, unknown>
    const toolResults = (step?.toolResults as Array<{ output?: unknown; result?: unknown }>) ?? []
    for (const tr of toolResults) {
      if (tr.output && typeof tr.output === 'object') return tr.output as T
      if (tr.result && typeof tr.result === 'object') return tr.result as T
    }
  }
  return undefined
}

// ============================================================================
// Synthesis Quality Processor
// ============================================================================

export interface SynthesisQualityMetadata {
  issues: string[]
  score: number
}

/**
 * Validates a synthesis result and trips with retry feedback when the quality
 * score is below `MIN_QUALITY_SCORE`. Reads `schemaModelNames: string[]` from
 * `requestContext[SYNTHESIS_CONTEXT_KEY]`.
 */
export class SynthesisQualityProcessor
  implements Processor<'intelligence-synthesis-quality', SynthesisQualityMetadata>
{
  readonly id = 'intelligence-synthesis-quality'
  readonly name = 'Synthesis Quality'
  readonly description =
    'Trips with retry feedback when synthesis output is incomplete or references unknown models.'

  processOutputResult(
    args: ProcessOutputResultArgs<SynthesisQualityMetadata>,
  ): ProcessorMessageResult {
    const synthesis = extractStructuredObject<SynthesisResult>(
      args as ProcessOutputResultArgs<unknown>,
    )
    if (!synthesis) {
      args.abort('Synthesis output could not be parsed as structured JSON', {
        retry: true,
        metadata: { issues: ['Output was not valid structured JSON'], score: 0 },
      })
    }

    const schemaModelNames =
      (args.requestContext?.get(SYNTHESIS_CONTEXT_KEY) as string[] | undefined) ?? []
    const validation = validateSynthesisQuality(synthesis!, schemaModelNames)

    if (validation.score < MIN_QUALITY_SCORE) {
      const reason = [
        `Synthesis quality ${validation.score.toFixed(2)} is below threshold ${MIN_QUALITY_SCORE}.`,
        'Issues to fix:',
        ...validation.issues.map((i) => `- ${i}`),
        '',
        'Ensure all features have valid model references, all journeys reference valid feature IDs, and confidence scores are between 0 and 1.',
      ].join('\n')
      args.abort(reason, {
        retry: true,
        metadata: { issues: validation.issues, score: validation.score },
      })
    }

    return args.messages
  }
}

// ============================================================================
// Template Quality Processor
// ============================================================================

export interface TemplateQualityMetadata {
  issues: string[]
  score: number
}

/**
 * Validates generated templates and trips with retry feedback when quality is
 * poor. Reads `{ featureIds, journeyIds }` from
 * `requestContext[TEMPLATE_CONTEXT_KEY]`.
 */
export class TemplateQualityProcessor
  implements Processor<'intelligence-template-quality', TemplateQualityMetadata>
{
  readonly id = 'intelligence-template-quality'
  readonly name = 'Template Quality'
  readonly description =
    'Trips with retry feedback when generated templates reference unknown features/journeys, lack diversity, or have empty narratives.'

  processOutputResult(
    args: ProcessOutputResultArgs<TemplateQualityMetadata>,
  ): ProcessorMessageResult {
    const wrapper = extractStructuredObject<{ templates?: DynamicNarrativeTemplate[] }>(
      args as ProcessOutputResultArgs<unknown>,
    )
    const templates = wrapper?.templates
    if (!Array.isArray(templates)) {
      args.abort('Template output could not be parsed as structured JSON', {
        retry: true,
        metadata: { issues: ['Output was not valid structured JSON'], score: 0 },
      })
    }

    const refs =
      (args.requestContext?.get(TEMPLATE_CONTEXT_KEY) as TemplateRefs | undefined) ?? {
        featureIds: [],
        journeyIds: [],
      }
    const validation = validateTemplateQuality(templates!, refs.featureIds, refs.journeyIds)

    if (validation.score < MIN_QUALITY_SCORE) {
      const reason = [
        `Template quality ${validation.score.toFixed(2)} is below threshold ${MIN_QUALITY_SCORE}.`,
        'Issues to fix:',
        ...validation.issues.map((i) => `- ${i}`),
        '',
        'Ensure all templates reference valid feature IDs and journey IDs, have complete narratives with scenarios and key points, and produce a diverse set of categories.',
      ].join('\n')
      args.abort(reason, {
        retry: true,
        metadata: { issues: validation.issues, score: validation.score },
      })
    }

    return args.messages
  }
}

/** Singleton instances to attach via `outputProcessors: [...]`. */
export const synthesisQualityProcessor = new SynthesisQualityProcessor()
export const templateQualityProcessor = new TemplateQualityProcessor()
