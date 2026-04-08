/**
 * Intelligence Processors
 *
 * Quality guardrails for intelligence synthesis and template generation.
 * Follows the Mastra processor pattern (input/output processors on agents).
 *
 * Patterns borrowed from kasava mastra-cloud:
 * - Quality guardrails: detect empty/hallucinated outputs, retry with feedback
 * - Output verification: validate that structured output references valid entities
 *
 * @module
 */

import type { SynthesisResult } from './synthesis-agent'
import type { DynamicNarrativeTemplate } from './types'

// ============================================================================
// Synthesis Quality Validation
// ============================================================================

/**
 * Result of a quality validation check
 */
export interface QualityValidationResult {
  /** Whether the output passes quality checks */
  valid: boolean
  /** Issues found during validation */
  issues: string[]
  /** Quality score (0-1) */
  score: number
}

/**
 * Validate synthesis result quality
 *
 * Checks that the synthesis output is complete and internally consistent:
 * - Has non-empty features with valid categories
 * - Features reference models that exist in the schema
 * - Journeys reference valid feature IDs
 * - Entity maps cover the main models
 * - Confidence scores are within range
 */
export function validateSynthesisQuality(
  synthesis: SynthesisResult,
  schemaModelNames: string[]
): QualityValidationResult {
  const issues: string[] = []
  let score = 1.0

  // Check basic completeness
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

  // Check feature quality
  const featureIds = new Set<string>()
  for (const feature of synthesis.features) {
    if (featureIds.has(feature.id)) {
      issues.push(`Duplicate feature ID: ${feature.id}`)
      score -= 0.05
    }
    featureIds.add(feature.id)

    if (feature.confidence < 0 || feature.confidence > 1) {
      issues.push(`Feature "${feature.id}" has invalid confidence: ${feature.confidence}`)
      score -= 0.05
    }

    // Check that referenced models exist in schema
    for (const model of feature.relatedModels) {
      if (schemaModelNames.length > 0 && !schemaModelNames.includes(model)) {
        issues.push(`Feature "${feature.id}" references unknown model: ${model}`)
        score -= 0.02
      }
    }
  }

  // Check journey quality
  for (const journey of synthesis.journeys) {
    if (journey.confidence < 0 || journey.confidence > 1) {
      issues.push(`Journey "${journey.id}" has invalid confidence: ${journey.confidence}`)
      score -= 0.05
    }

    // Check that journey references valid feature IDs
    for (const featureId of journey.featuresUsed) {
      if (!featureIds.has(featureId)) {
        issues.push(`Journey "${journey.id}" references unknown feature: ${featureId}`)
        score -= 0.02
      }
    }

    // Verify steps are ordered
    for (let i = 0; i < journey.steps.length; i++) {
      if (journey.steps[i].order !== i + 1) {
        issues.push(`Journey "${journey.id}" step ${i} has wrong order: ${journey.steps[i].order}`)
        score -= 0.02
      }
    }
  }

  // Check entity map coverage
  if (synthesis.entityMaps.length === 0 && schemaModelNames.length > 0) {
    issues.push('No entity maps generated despite having schema models')
    score -= 0.1
  }

  score = Math.max(0, Math.min(1, score))

  return {
    valid: issues.length === 0,
    issues,
    score,
  }
}

/**
 * Build a retry prompt with quality feedback
 *
 * When synthesis quality is poor, this generates a focused prompt
 * that tells the agent what to fix.
 */
export function buildSynthesisRetryPrompt(
  validation: QualityValidationResult,
  originalPrompt: string
): string {
  return `${originalPrompt}

IMPORTANT: Your previous response had quality issues that need to be corrected:
${validation.issues.map((issue) => `- ${issue}`).join('\n')}

Quality score: ${validation.score.toFixed(2)}/1.00

Please fix these issues in your response. Ensure all features have valid model references,
all journeys reference valid feature IDs, and confidence scores are between 0 and 1.`
}

// ============================================================================
// Template Quality Validation
// ============================================================================

/**
 * Validate template generation quality
 *
 * Checks that templates are complete and reference valid features/journeys.
 */
export function validateTemplateQuality(
  templates: DynamicNarrativeTemplate[],
  featureIds: string[],
  journeyIds: string[]
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

    // Check feature references
    for (const featureId of template.featuresShowcased) {
      if (!featureIdSet.has(featureId)) {
        issues.push(`Template "${template.id}" showcases unknown feature: ${featureId}`)
        score -= 0.02
      }
    }

    // Check journey reference
    if (template.journeyId && !journeyIdSet.has(template.journeyId)) {
      issues.push(`Template "${template.id}" references unknown journey: ${template.journeyId}`)
      score -= 0.02
    }

    // Check narrative completeness
    if (!template.narrative.scenario || template.narrative.scenario.trim() === '') {
      issues.push(`Template "${template.id}" has empty scenario`)
      score -= 0.1
    }

    if (!template.narrative.keyPoints || template.narrative.keyPoints.length === 0) {
      issues.push(`Template "${template.id}" has no key points`)
      score -= 0.05
    }

    // Check relevance score range
    if (template.relevanceScore < 0 || template.relevanceScore > 1) {
      issues.push(`Template "${template.id}" has invalid relevance score: ${template.relevanceScore}`)
      score -= 0.05
    }
  }

  // Check template diversity — warn if all same category
  const categories = new Set(templates.map((t) => t.category))
  if (templates.length >= 3 && categories.size === 1) {
    issues.push(`All ${templates.length} templates have the same category: ${templates[0].category}`)
    score -= 0.1
  }

  score = Math.max(0, Math.min(1, score))

  return {
    valid: issues.length === 0,
    issues,
    score,
  }
}

/**
 * Build a retry prompt for template generation
 */
export function buildTemplateRetryPrompt(
  validation: QualityValidationResult,
  originalPrompt: string
): string {
  return `${originalPrompt}

IMPORTANT: Your previous response had quality issues:
${validation.issues.map((issue) => `- ${issue}`).join('\n')}

Quality score: ${validation.score.toFixed(2)}/1.00

Please fix these issues. Ensure all templates reference valid feature IDs and journey IDs,
have complete narratives with scenarios and key points, and scores between 0 and 1.
Create diverse templates across different categories.`
}
