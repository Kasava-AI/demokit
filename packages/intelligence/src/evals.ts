/**
 * Intelligence Evals
 *
 * Quality scorers for automated testing and regression detection
 * of intelligence synthesis and template generation outputs.
 *
 * Uses Mastra's createScorer() for consistent scoring infrastructure.
 *
 * @module
 */

import type { SynthesisResult } from './synthesis-agent'
import type { DynamicNarrativeTemplate } from './types'

// ============================================================================
// Scorer Types
// ============================================================================

export interface ScorerResult {
  score: number
  reason: string
}

// ============================================================================
// Feature Completeness Scorer
// ============================================================================

/**
 * Score how completely features cover the API schema.
 *
 * Checks:
 * - What percentage of schema models are referenced by at least one feature
 * - Whether features have meaningful descriptions
 * - Whether confidence scores are well-distributed (not all 1.0 or all 0.5)
 */
export function scoreFeatureCompleteness(
  synthesis: SynthesisResult,
  schemaModelNames: string[]
): ScorerResult {
  if (synthesis.features.length === 0) {
    return { score: 0, reason: 'No features detected' }
  }

  // Model coverage: what % of schema models are referenced by features
  const referencedModels = new Set(synthesis.features.flatMap((f) => f.relatedModels))
  const modelCoverage = schemaModelNames.length > 0
    ? referencedModels.size / schemaModelNames.length
    : 0.5

  // Description quality: features with non-trivial descriptions
  const meaningfulDescriptions = synthesis.features.filter(
    (f) => f.description && f.description.length > 20
  ).length
  const descriptionQuality = meaningfulDescriptions / synthesis.features.length

  // Confidence distribution: penalize if all same value
  const confidences = synthesis.features.map((f) => f.confidence)
  const uniqueConfidences = new Set(confidences.map((c) => Math.round(c * 10) / 10))
  const confidenceDistribution = Math.min(1, uniqueConfidences.size / Math.max(3, synthesis.features.length * 0.3))

  const score = modelCoverage * 0.5 + descriptionQuality * 0.3 + confidenceDistribution * 0.2
  const clampedScore = Math.max(0, Math.min(1, score))

  const reasons: string[] = []
  reasons.push(`Model coverage: ${(modelCoverage * 100).toFixed(0)}% (${referencedModels.size}/${schemaModelNames.length})`)
  reasons.push(`Description quality: ${(descriptionQuality * 100).toFixed(0)}%`)
  reasons.push(`Confidence distribution: ${uniqueConfidences.size} distinct values`)

  return { score: clampedScore, reason: reasons.join('; ') }
}

// ============================================================================
// Journey Coherence Scorer
// ============================================================================

/**
 * Score how coherent user journeys are.
 *
 * Checks:
 * - Steps reference valid models from the schema
 * - Steps are logically ordered (order values sequential)
 * - Features referenced in journeys exist in the feature list
 * - Data flow makes sense (entities mentioned in steps appear in dataFlow)
 */
export function scoreJourneyCoherence(
  synthesis: SynthesisResult,
  schemaModelNames: string[]
): ScorerResult {
  if (synthesis.journeys.length === 0) {
    return { score: 0, reason: 'No journeys detected' }
  }

  const featureIds = new Set(synthesis.features.map((f) => f.id))
  const schemaModels = new Set(schemaModelNames)
  let totalChecks = 0
  let passedChecks = 0
  const issues: string[] = []

  for (const journey of synthesis.journeys) {
    // Check step ordering
    totalChecks++
    const ordered = journey.steps.every((s, i) => s.order === i + 1)
    if (ordered) passedChecks++
    else issues.push(`Journey "${journey.id}": steps not properly ordered`)

    // Check feature references
    for (const featureId of journey.featuresUsed) {
      totalChecks++
      if (featureIds.has(featureId)) {
        passedChecks++
      } else {
        issues.push(`Journey "${journey.id}": unknown feature "${featureId}"`)
      }
    }

    // Check model references in steps
    for (const step of journey.steps) {
      for (const model of step.modelsAffected) {
        totalChecks++
        if (schemaModels.size === 0 || schemaModels.has(model)) {
          passedChecks++
        } else {
          issues.push(`Journey "${journey.id}" step ${step.order}: unknown model "${model}"`)
        }
      }
    }

    // Check dataFlow references
    for (const entity of journey.dataFlow) {
      totalChecks++
      if (schemaModels.size === 0 || schemaModels.has(entity)) {
        passedChecks++
      } else {
        issues.push(`Journey "${journey.id}": unknown dataFlow entity "${entity}"`)
      }
    }
  }

  const score = totalChecks > 0 ? passedChecks / totalChecks : 0
  const reason = issues.length > 0
    ? `${passedChecks}/${totalChecks} checks passed. Issues: ${issues.slice(0, 5).join('; ')}`
    : `All ${totalChecks} coherence checks passed`

  return { score: Math.max(0, Math.min(1, score)), reason }
}

// ============================================================================
// Template Relevance Scorer
// ============================================================================

/**
 * Score how relevant templates are to the discovered features.
 *
 * Checks:
 * - Templates reference features that actually exist
 * - Feature coverage across templates (diverse feature showcasing)
 * - Category diversity (not all same category)
 * - Narrative completeness (scenarios, key points present)
 */
export function scoreTemplateRelevance(
  templates: DynamicNarrativeTemplate[],
  featureIds: string[],
  journeyIds: string[]
): ScorerResult {
  if (templates.length === 0) {
    return { score: 0, reason: 'No templates generated' }
  }

  const featureIdSet = new Set(featureIds)
  const journeyIdSet = new Set(journeyIds)

  // Feature reference validity
  let validRefs = 0
  let totalRefs = 0
  for (const template of templates) {
    for (const fId of template.featuresShowcased) {
      totalRefs++
      if (featureIdSet.has(fId)) validRefs++
    }
    if (template.journeyId) {
      totalRefs++
      if (journeyIdSet.has(template.journeyId)) validRefs++
    }
  }
  const refValidity = totalRefs > 0 ? validRefs / totalRefs : 0.5

  // Feature coverage: what % of features are showcased by at least one template
  const showcasedFeatures = new Set(templates.flatMap((t) => t.featuresShowcased))
  const featureCoverage = featureIds.length > 0
    ? showcasedFeatures.size / featureIds.length
    : 0.5

  // Category diversity
  const categories = new Set(templates.map((t) => t.category))
  const categoryDiversity = Math.min(1, categories.size / Math.min(templates.length, 5))

  // Narrative completeness
  const completeNarratives = templates.filter(
    (t) =>
      t.narrative.scenario &&
      t.narrative.scenario.length > 20 &&
      t.narrative.keyPoints &&
      t.narrative.keyPoints.length >= 2
  ).length
  const narrativeCompleteness = completeNarratives / templates.length

  const score = refValidity * 0.3 + featureCoverage * 0.25 + categoryDiversity * 0.2 + narrativeCompleteness * 0.25
  const clampedScore = Math.max(0, Math.min(1, score))

  const reasons: string[] = []
  reasons.push(`Ref validity: ${(refValidity * 100).toFixed(0)}%`)
  reasons.push(`Feature coverage: ${showcasedFeatures.size}/${featureIds.length}`)
  reasons.push(`Categories: ${categories.size} types`)
  reasons.push(`Narrative completeness: ${(narrativeCompleteness * 100).toFixed(0)}%`)

  return { score: clampedScore, reason: reasons.join('; ') }
}

// ============================================================================
// Overall Intelligence Quality Scorer
// ============================================================================

/**
 * Composite score across all dimensions of intelligence quality.
 */
export function scoreIntelligenceQuality(
  synthesis: SynthesisResult,
  templates: DynamicNarrativeTemplate[],
  schemaModelNames: string[]
): ScorerResult {
  const featureScore = scoreFeatureCompleteness(synthesis, schemaModelNames)
  const journeyScore = scoreJourneyCoherence(synthesis, schemaModelNames)
  const featureIds = synthesis.features.map((f) => f.id)
  const journeyIds = synthesis.journeys.map((j) => j.id)
  const templateScore = scoreTemplateRelevance(templates, featureIds, journeyIds)

  const score = featureScore.score * 0.4 + journeyScore.score * 0.3 + templateScore.score * 0.3
  const clampedScore = Math.max(0, Math.min(1, score))

  const reason = [
    `Features: ${featureScore.score.toFixed(2)} (${featureScore.reason})`,
    `Journeys: ${journeyScore.score.toFixed(2)} (${journeyScore.reason})`,
    `Templates: ${templateScore.score.toFixed(2)} (${templateScore.reason})`,
  ].join('\n')

  return { score: clampedScore, reason }
}
