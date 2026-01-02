/**
 * Intelligence Package Configuration
 *
 * Centralized defaults for intelligence building parameters.
 * Update these values here to change defaults across all modules.
 *
 * @module
 */

/**
 * Default limits for intelligence synthesis
 */
export const INTELLIGENCE_DEFAULTS = {
  /** Maximum number of features to detect */
  maxFeatures: 20,
  /** Maximum number of user journeys to identify */
  maxJourneys: 5,
  /** Maximum number of narrative templates to generate */
  maxTemplates: 5,
} as const

/**
 * Validation limits (used in Zod schemas)
 */
export const INTELLIGENCE_LIMITS = {
  maxFeatures: { min: 1, max: 50 },
  maxJourneys: { min: 1, max: 20 },
  maxTemplates: { min: 1, max: 30 },
} as const
