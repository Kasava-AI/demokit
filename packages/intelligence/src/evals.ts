/**
 * Intelligence Scorers
 *
 * Quality scorers for automated testing and regression detection of
 * intelligence synthesis and template generation. Built with Mastra's
 * `createScorer()` so they integrate with the eval runner, dataset
 * pipelines, and Mastra Cloud dashboards.
 *
 * Each scorer also has a sync `compute*` helper that runs the math
 * directly — useful for inline checks where awaiting `scorer.run()`
 * is overkill.
 *
 * @module
 */

import { createScorer } from '@mastra/core/evals'
import type { SynthesisResult } from './synthesis-agent'
import type { DynamicNarrativeTemplate } from './types'

// ============================================================================
// Shared types
// ============================================================================

export interface ScorerResult {
  score: number
  reason: string
}

// Inputs paired with outputs so scorers see the schema/feature ids alongside
// the thing being scored. Mastra hands these to .run({ input, output }).
export interface FeatureCompletenessInput {
  schemaModelNames: string[]
}

export interface JourneyCoherenceInput {
  schemaModelNames: string[]
}

export interface TemplateRelevanceInput {
  featureIds: string[]
  journeyIds: string[]
}

export interface IntelligenceQualityInput {
  schemaModelNames: string[]
}

export interface IntelligenceQualityOutput {
  synthesis: SynthesisResult
  templates: DynamicNarrativeTemplate[]
}

// ============================================================================
// Pure compute functions — used by both the scorers and direct callers
// ============================================================================

export function computeFeatureCompleteness(
  input: FeatureCompletenessInput,
  synthesis: SynthesisResult,
): ScorerResult {
  if (synthesis.features.length === 0) {
    return { score: 0, reason: 'No features detected' }
  }

  const referencedModels = new Set(synthesis.features.flatMap((f) => f.relatedModels))
  const modelCoverage = input.schemaModelNames.length > 0
    ? referencedModels.size / input.schemaModelNames.length
    : 0.5

  const meaningfulDescriptions = synthesis.features.filter(
    (f) => f.description && f.description.length > 20,
  ).length
  const descriptionQuality = meaningfulDescriptions / synthesis.features.length

  const confidences = synthesis.features.map((f) => Math.round(f.confidence * 10) / 10)
  const distinctConfidences = new Set(confidences)
  const confidenceDistribution = Math.min(
    1,
    distinctConfidences.size / Math.max(3, synthesis.features.length * 0.3),
  )

  const score = Math.max(
    0,
    Math.min(1, modelCoverage * 0.5 + descriptionQuality * 0.3 + confidenceDistribution * 0.2),
  )
  const reason = [
    `Model coverage: ${(modelCoverage * 100).toFixed(0)}% (${referencedModels.size}/${input.schemaModelNames.length})`,
    `Description quality: ${(descriptionQuality * 100).toFixed(0)}%`,
    `Confidence distribution: ${distinctConfidences.size} distinct values`,
  ].join('; ')

  return { score, reason }
}

export function computeJourneyCoherence(
  input: JourneyCoherenceInput,
  synthesis: SynthesisResult,
): ScorerResult {
  if (synthesis.journeys.length === 0) {
    return { score: 0, reason: 'No journeys detected' }
  }

  const featureIds = new Set(synthesis.features.map((f) => f.id))
  const schemaModels = new Set(input.schemaModelNames)
  let totalChecks = 0
  let passedChecks = 0
  const issues: string[] = []

  for (const journey of synthesis.journeys) {
    totalChecks++
    const ordered = journey.steps.every((s, i) => s.order === i + 1)
    if (ordered) passedChecks++
    else issues.push(`Journey "${journey.id}": steps not properly ordered`)

    for (const featureId of journey.featuresUsed) {
      totalChecks++
      if (featureIds.has(featureId)) passedChecks++
      else issues.push(`Journey "${journey.id}": unknown feature "${featureId}"`)
    }

    for (const step of journey.steps) {
      for (const model of step.modelsAffected) {
        totalChecks++
        if (schemaModels.size === 0 || schemaModels.has(model)) passedChecks++
        else issues.push(`Journey "${journey.id}" step ${step.order}: unknown model "${model}"`)
      }
    }

    for (const entity of journey.dataFlow) {
      totalChecks++
      if (schemaModels.size === 0 || schemaModels.has(entity)) passedChecks++
      else issues.push(`Journey "${journey.id}": unknown dataFlow entity "${entity}"`)
    }
  }

  const score = totalChecks > 0 ? Math.max(0, Math.min(1, passedChecks / totalChecks)) : 0
  const reason = issues.length > 0
    ? `${passedChecks}/${totalChecks} checks passed. Issues: ${issues.slice(0, 5).join('; ')}`
    : `All ${totalChecks} coherence checks passed`

  return { score, reason }
}

export function computeTemplateRelevance(
  input: TemplateRelevanceInput,
  templates: DynamicNarrativeTemplate[],
): ScorerResult {
  if (templates.length === 0) {
    return { score: 0, reason: 'No templates generated' }
  }

  const featureIdSet = new Set(input.featureIds)
  const journeyIdSet = new Set(input.journeyIds)

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

  const showcasedFeatures = new Set(templates.flatMap((t) => t.featuresShowcased))
  const featureCoverage = input.featureIds.length > 0
    ? showcasedFeatures.size / input.featureIds.length
    : 0.5

  const categories = new Set(templates.map((t) => t.category))
  const categoryDiversity = Math.min(1, categories.size / Math.min(templates.length, 5))

  const completeNarratives = templates.filter(
    (t) =>
      t.narrative.scenario &&
      t.narrative.scenario.length > 20 &&
      t.narrative.keyPoints &&
      t.narrative.keyPoints.length >= 2,
  ).length
  const narrativeCompleteness = completeNarratives / templates.length

  const score = Math.max(
    0,
    Math.min(
      1,
      refValidity * 0.3 + featureCoverage * 0.25 + categoryDiversity * 0.2 + narrativeCompleteness * 0.25,
    ),
  )
  const reason = [
    `Ref validity: ${(refValidity * 100).toFixed(0)}%`,
    `Feature coverage: ${showcasedFeatures.size}/${input.featureIds.length}`,
    `Categories: ${categories.size} types`,
    `Narrative completeness: ${(narrativeCompleteness * 100).toFixed(0)}%`,
  ].join('; ')

  return { score, reason }
}

export function computeIntelligenceQuality(
  input: IntelligenceQualityInput,
  output: IntelligenceQualityOutput,
): ScorerResult {
  const featureScore = computeFeatureCompleteness(
    { schemaModelNames: input.schemaModelNames },
    output.synthesis,
  )
  const journeyScore = computeJourneyCoherence(
    { schemaModelNames: input.schemaModelNames },
    output.synthesis,
  )
  const templateScore = computeTemplateRelevance(
    {
      featureIds: output.synthesis.features.map((f) => f.id),
      journeyIds: output.synthesis.journeys.map((j) => j.id),
    },
    output.templates,
  )

  const score = Math.max(
    0,
    Math.min(1, featureScore.score * 0.4 + journeyScore.score * 0.3 + templateScore.score * 0.3),
  )
  const reason = [
    `Features: ${featureScore.score.toFixed(2)} (${featureScore.reason})`,
    `Journeys: ${journeyScore.score.toFixed(2)} (${journeyScore.reason})`,
    `Templates: ${templateScore.score.toFixed(2)} (${templateScore.reason})`,
  ].join('\n')

  return { score, reason }
}

// ============================================================================
// MastraScorer instances
// ============================================================================

export const featureCompletenessScorer = createScorer<FeatureCompletenessInput, SynthesisResult>({
  id: 'intelligence-feature-completeness',
  description:
    'Schema model coverage, description quality, and confidence distribution across detected features.',
})
  .preprocess(({ run }) => computeFeatureCompleteness(run.input!, run.output))
  .generateScore(({ results }) => results.preprocessStepResult.score)
  .generateReason(({ results }) => results.preprocessStepResult.reason)

export const journeyCoherenceScorer = createScorer<JourneyCoherenceInput, SynthesisResult>({
  id: 'intelligence-journey-coherence',
  description:
    'Journey step ordering, feature/model reference validity, and data flow coherence.',
})
  .preprocess(({ run }) => computeJourneyCoherence(run.input!, run.output))
  .generateScore(({ results }) => results.preprocessStepResult.score)
  .generateReason(({ results }) => results.preprocessStepResult.reason)

export const templateRelevanceScorer = createScorer<
  TemplateRelevanceInput,
  DynamicNarrativeTemplate[]
>({
  id: 'intelligence-template-relevance',
  description:
    'Template feature/journey reference validity, feature coverage, category diversity, and narrative completeness.',
})
  .preprocess(({ run }) => computeTemplateRelevance(run.input!, run.output))
  .generateScore(({ results }) => results.preprocessStepResult.score)
  .generateReason(({ results }) => results.preprocessStepResult.reason)

export const intelligenceQualityScorer = createScorer<
  IntelligenceQualityInput,
  IntelligenceQualityOutput
>({
  id: 'intelligence-overall-quality',
  description:
    'Composite score across feature completeness (40%), journey coherence (30%), and template relevance (30%).',
})
  .preprocess(({ run }) => computeIntelligenceQuality(run.input!, run.output))
  .generateScore(({ results }) => results.preprocessStepResult.score)
  .generateReason(({ results }) => results.preprocessStepResult.reason)

/**
 * All intelligence scorers, keyed for Mastra agent/workflow registration:
 *
 * ```ts
 * new Mastra({
 *   scorers: { ...intelligenceScorers },
 * })
 * ```
 */
export const intelligenceScorers = {
  featureCompleteness: featureCompletenessScorer,
  journeyCoherence: journeyCoherenceScorer,
  templateRelevance: templateRelevanceScorer,
  intelligenceQuality: intelligenceQualityScorer,
}
