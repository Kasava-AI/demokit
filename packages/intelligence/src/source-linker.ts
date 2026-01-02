/**
 * Source Linker
 *
 * Links analyzed source content to existing project features and user journeys.
 * Uses semantic matching to determine which features/journeys were informed by each source.
 *
 * @module
 */

import type { SourceAnalysis } from './source-analysis-agent'

// ============================================================================
// Types
// ============================================================================

export interface FeatureInfo {
  id: string
  name: string
  description: string | null
  category: string | null
}

export interface JourneyInfo {
  id: string
  name: string
  description: string | null
  persona: string | null
}

export interface SourceContribution {
  entityType: 'feature' | 'journey'
  entityId: string
  entityName: string
  evidence: string
  confidence: number
}

export interface LinkingResult {
  contributions: SourceContribution[]
  totalMatches: number
}

// ============================================================================
// Linking Functions
// ============================================================================

/**
 * Link source analysis to project features and journeys
 *
 * Uses text matching to find connections between:
 * - Mentioned features in the source → Project features
 * - Key insights → User journeys
 */
export function linkSourceToEntities(
  analysis: SourceAnalysis,
  features: FeatureInfo[],
  journeys: JourneyInfo[]
): LinkingResult {
  const contributions: SourceContribution[] = []

  // Link to features based on mentioned features
  for (const feature of features) {
    const match = findFeatureMatch(analysis, feature)
    if (match) {
      contributions.push({
        entityType: 'feature',
        entityId: feature.id,
        entityName: feature.name,
        evidence: match.evidence,
        confidence: match.confidence,
      })
    }
  }

  // Link to journeys based on insights and target audience
  for (const journey of journeys) {
    const match = findJourneyMatch(analysis, journey)
    if (match) {
      contributions.push({
        entityType: 'journey',
        entityId: journey.id,
        entityName: journey.name,
        evidence: match.evidence,
        confidence: match.confidence,
      })
    }
  }

  return {
    contributions,
    totalMatches: contributions.length,
  }
}

/**
 * Find if a source analysis matches a feature
 */
function findFeatureMatch(
  analysis: SourceAnalysis,
  feature: FeatureInfo
): { evidence: string; confidence: number } | null {
  const featureNameLower = feature.name.toLowerCase()
  const featureDescLower = (feature.description || '').toLowerCase()

  // Check mentioned features for matches
  for (const mentioned of analysis.mentionedFeatures) {
    const mentionedLower = mentioned.toLowerCase()

    // Direct name match
    if (featureNameLower.includes(mentionedLower) || mentionedLower.includes(featureNameLower)) {
      return {
        evidence: `Source mentions "${mentioned}" which matches this feature`,
        confidence: 0.9,
      }
    }

    // Word overlap
    const mentionedWords = new Set(mentionedLower.split(/\s+/).filter(w => w.length > 3))
    const featureWords = new Set(featureNameLower.split(/\s+/).filter(w => w.length > 3))
    const overlap = [...mentionedWords].filter(w => featureWords.has(w))

    if (overlap.length >= 2 || (overlap.length === 1 && mentionedWords.size <= 2)) {
      return {
        evidence: `Source mentions "${mentioned}" with matching terms: ${overlap.join(', ')}`,
        confidence: 0.7,
      }
    }
  }

  // Check value propositions for feature hints
  for (const prop of analysis.valuePropositions) {
    const propLower = prop.toLowerCase()
    if (propLower.includes(featureNameLower) || featureDescLower.includes(propLower.split(' ').slice(0, 3).join(' '))) {
      return {
        evidence: `Value proposition "${prop}" relates to this feature`,
        confidence: 0.6,
      }
    }
  }

  // Check key insights
  for (const insight of analysis.keyInsights) {
    const insightLower = insight.toLowerCase()
    if (insightLower.includes(featureNameLower)) {
      return {
        evidence: `Source insight mentions this feature: "${insight.slice(0, 100)}"`,
        confidence: 0.5,
      }
    }
  }

  return null
}

/**
 * Find if a source analysis matches a user journey
 */
function findJourneyMatch(
  analysis: SourceAnalysis,
  journey: JourneyInfo
): { evidence: string; confidence: number } | null {
  const journeyNameLower = journey.name.toLowerCase()
  const journeyDescLower = (journey.description || '').toLowerCase()
  const personaLower = (journey.persona || '').toLowerCase()

  // Check target audience for persona matches
  for (const audience of analysis.targetAudience) {
    const audienceLower = audience.toLowerCase()

    // Match persona
    if (personaLower && (
      audienceLower.includes(personaLower) ||
      personaLower.includes(audienceLower) ||
      hasWordOverlap(audienceLower, personaLower)
    )) {
      return {
        evidence: `Target audience "${audience}" matches journey persona "${journey.persona}"`,
        confidence: 0.8,
      }
    }

    // Match journey description
    if (journeyDescLower && hasWordOverlap(audienceLower, journeyDescLower)) {
      return {
        evidence: `Target audience "${audience}" relates to this journey`,
        confidence: 0.6,
      }
    }
  }

  // Check key insights for journey hints
  for (const insight of analysis.keyInsights) {
    const insightLower = insight.toLowerCase()
    if (insightLower.includes(journeyNameLower)) {
      return {
        evidence: `Source insight mentions this journey: "${insight.slice(0, 100)}"`,
        confidence: 0.5,
      }
    }
  }

  // Check value propositions
  for (const prop of analysis.valuePropositions) {
    const propLower = prop.toLowerCase()
    if (propLower.includes(journeyNameLower) || (journeyDescLower && hasWordOverlap(propLower, journeyDescLower))) {
      return {
        evidence: `Value proposition relates to this journey`,
        confidence: 0.4,
      }
    }
  }

  return null
}

/**
 * Check if two strings have significant word overlap
 */
function hasWordOverlap(str1: string, str2: string, minOverlap = 2): boolean {
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 3))
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 3))
  const overlap = [...words1].filter(w => words2.has(w))
  return overlap.length >= minOverlap
}
