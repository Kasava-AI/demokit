/**
 * App Intelligence Types
 *
 * Types for multi-source app understanding and dynamic template generation.
 * The intelligence system gathers data from schema, website, help center,
 * and README to build a mental model of the app.
 *
 * @module
 */

import { z } from "zod";
import { INTELLIGENCE_DEFAULTS, INTELLIGENCE_LIMITS } from "./config";

// ============================================================================
// Source Types - Where we gather intelligence from
// ============================================================================

/**
 * Source for gathering app intelligence
 */
export interface IntelligenceSource {
  /** Source type */
  type: "schema" | "website" | "helpCenter" | "readme" | "documentation";
  /** URL or path to source */
  location: string;
  /** Raw content from source */
  content?: string;
  /** Whether this source was successfully fetched */
  status: "pending" | "fetching" | "success" | "failed";
  /** Error message if failed */
  error?: string;
}

export const IntelligenceSourceSchema = z.object({
  type: z.enum(["schema", "website", "helpCenter", "readme", "documentation"]),
  location: z.string(),
  content: z.string().optional(),
  status: z.enum(["pending", "fetching", "success", "failed"]),
  error: z.string().optional(),
});

// ============================================================================
// Feature & Capability Types
// ============================================================================

/**
 * A detected feature of the application
 */
export interface Feature {
  /** Feature identifier (kebab-case) */
  id: string;
  /** Human-readable feature name */
  name: string;
  /** What this feature does */
  description: string;
  /** Category (core, advanced, admin, etc.) */
  category: FeatureCategory;
  /** Models/entities this feature uses */
  relatedModels: string[];
  /** API endpoints this feature uses */
  relatedEndpoints?: string[];
  /** User-facing actions in this feature */
  actions?: string[];
  /** Data requirements to demo this feature */
  dataRequirements?: DataRequirement[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Feature category values - single source of truth
 */
export const FEATURE_CATEGORIES = [
  "core",
  "advanced",
  "admin",
  "integration",
  "analytics",
  "settings",
] as const;

/**
 * Feature category zod enum - reusable across schemas
 */
export const featureCategoryEnum = z.enum(FEATURE_CATEGORIES);

export const FeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: featureCategoryEnum,
  relatedModels: z.array(z.string()),
  relatedEndpoints: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional(),
  dataRequirements: z.array(z.lazy(() => DataRequirementSchema)).optional(),
  confidence: z.number().min(0).max(1),
});

/**
 * Feature categories
 */
export type FeatureCategory = z.infer<typeof featureCategoryEnum>;

/**
 * Data requirement for a feature
 */
export interface DataRequirement {
  /** Model name */
  model: string;
  /** Minimum records needed */
  minCount: number;
  /** Suggested count for good demo */
  suggestedCount: number;
  /** Special conditions (e.g., "at least one with status='active'") */
  conditions?: string[];
}

export const DataRequirementSchema: z.ZodType<DataRequirement> = z.object({
  model: z.string(),
  minCount: z.number().int().min(0),
  suggestedCount: z.number().int().min(1),
  conditions: z.array(z.string()).optional(),
});

// ============================================================================
// User Journey Types
// ============================================================================

/**
 * A common user journey through the application
 */
export interface UserJourney {
  /** Journey identifier */
  id: string;
  /** Journey name */
  name: string;
  /** Description of this journey */
  description: string;
  /** User persona for this journey */
  persona: string;
  /** Steps in the journey */
  steps: JourneyStep[];
  /** Features touched in this journey */
  featuresUsed: string[];
  /** Total data entities touched */
  dataFlow: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

export const UserJourneySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  persona: z.string(),
  steps: z.array(z.lazy(() => JourneyStepSchema)),
  featuresUsed: z.array(z.string()),
  dataFlow: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

/**
 * A step in a user journey
 */
export interface JourneyStep {
  /** Step number (1-based) */
  order: number;
  /** What the user does */
  action: string;
  /** What they expect to see/happen */
  outcome: string;
  /** Models touched in this step */
  modelsAffected: string[];
  /** API endpoints called */
  endpointsCalled?: string[];
}

export const JourneyStepSchema: z.ZodType<JourneyStep> = z.object({
  order: z.number().int().min(1),
  action: z.string(),
  outcome: z.string(),
  modelsAffected: z.array(z.string()),
  endpointsCalled: z.array(z.string()).optional(),
});

// ============================================================================
// Entity Mapping Types
// ============================================================================

/**
 * Business meaning and context for a data entity
 */
export interface DataEntityMap {
  /** Model name from schema */
  modelName: string;
  /** Business-friendly name */
  displayName: string;
  /** What this entity represents in business terms */
  businessMeaning: string;
  /** Example values that tell a story */
  exampleValues?: Record<string, string>;
  /** Fields that should be realistic */
  realisticFields: string[];
  /** Fields that can be generic */
  genericFields: string[];
  /** Related entities in business terms */
  businessRelationships: BusinessRelationship[];
}

export const DataEntityMapSchema = z.object({
  modelName: z.string(),
  displayName: z.string(),
  businessMeaning: z.string(),
  exampleValues: z.record(z.string(), z.string()).optional(),
  realisticFields: z.array(z.string()),
  genericFields: z.array(z.string()),
  businessRelationships: z.array(z.lazy(() => BusinessRelationshipSchema)),
});

/**
 * Business relationship between entities
 */
export interface BusinessRelationship {
  /** Related entity */
  relatedEntity: string;
  /** Relationship description in business terms */
  description: string;
  /** Cardinality */
  cardinality: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
}

export const BusinessRelationshipSchema: z.ZodType<BusinessRelationship> =
  z.object({
    relatedEntity: z.string(),
    description: z.string(),
    cardinality: z.enum([
      "one-to-one",
      "one-to-many",
      "many-to-one",
      "many-to-many",
    ]),
  });

// ============================================================================
// Dynamic Template Types
// ============================================================================

/**
 * A dynamically generated narrative template
 */
export interface DynamicNarrativeTemplate {
  /** Template identifier */
  id: string;
  /** Template name */
  name: string;
  /** What story this template tells */
  description: string;
  /** Category of demo scenario */
  category: TemplateCategory;
  /** Which features this template showcases */
  featuresShowcased: string[];
  /** Which journey this template follows */
  journeyId?: string;
  /** Pre-filled narrative content */
  narrative: {
    scenario: string;
    keyPoints: string[];
    suggestedCharacters?: string[];
    suggestedTimeline?: string[];
  };
  /** Suggested record counts */
  suggestedCounts: Record<string, number>;
  /** Special data conditions */
  dataConditions?: string[];
  /** How well this template matches the app */
  relevanceScore: number;
}

/**
 * Template category values - single source of truth
 *
 * Note: DB only supports a subset of these categories.
 * Use mapToDbCategory() from @/lib/api/schemas when saving to database.
 */
export const TEMPLATE_CATEGORIES = [
  "onboarding",
  "happyPath",
  "edgeCase",
  "recovery",
  "growth",
  "decline",
  "comparison",
  "demo",
  "training",
  "migration",
] as const;

/**
 * Template category zod enum - reusable across schemas
 */
export const templateCategoryEnum = z.enum(TEMPLATE_CATEGORIES);

/**
 * Template categories
 */
export type TemplateCategory = z.infer<typeof templateCategoryEnum>;

export const DynamicNarrativeTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: templateCategoryEnum,
  featuresShowcased: z.array(z.string()),
  journeyId: z.string().optional(),
  narrative: z.object({
    scenario: z.string(),
    keyPoints: z.array(z.string()),
    suggestedCharacters: z.array(z.string()).optional(),
    suggestedTimeline: z.array(z.string()).optional(),
  }),
  suggestedCounts: z.record(z.string(), z.number()),
  dataConditions: z.array(z.string()).optional(),
  relevanceScore: z.number().min(0).max(1),
});

// ============================================================================
// Complete App Intelligence
// ============================================================================

/**
 * Complete intelligence about an application
 */
export interface AppIntelligence {
  /** Application name */
  appName: string;
  /** Application description */
  appDescription: string;
  /** Detected domain (e-commerce, b2b-saas, etc.) */
  domain: string;
  /** Industry vertical */
  industry?: string;
  /** Sources used to build this intelligence */
  sources: IntelligenceSource[];
  /** Detected features */
  features: Feature[];
  /** Common user journeys */
  journeys: UserJourney[];
  /** Entity mappings */
  entityMaps: DataEntityMap[];
  /** Generated templates */
  templates: DynamicNarrativeTemplate[];
  /** When this intelligence was generated */
  generatedAt: string;
  /** Overall confidence in the analysis */
  overallConfidence: number;
  /** Suggestions for improving data */
  suggestions?: string[];
}

export const AppIntelligenceSchema = z.object({
  appName: z.string(),
  appDescription: z.string(),
  domain: z.string(),
  industry: z.string().optional(),
  sources: z.array(IntelligenceSourceSchema),
  features: z.array(FeatureSchema),
  journeys: z.array(UserJourneySchema),
  entityMaps: z.array(DataEntityMapSchema),
  templates: z.array(DynamicNarrativeTemplateSchema),
  generatedAt: z.string().datetime(),
  overallConfidence: z.number().min(0).max(1),
  suggestions: z.array(z.string()).optional(),
});

// ============================================================================
// Intelligence Building Options
// ============================================================================

/**
 * Options for building app intelligence
 */
export interface IntelligenceBuildOptions {
  /** OpenAPI spec content (raw string - either this or schema is required) */
  schemaContent?: string;
  /** Pre-parsed DemokitSchema (either this or schemaContent is required) */
  schema?: Record<string, unknown>;
  /** Website URL to analyze */
  websiteUrl?: string;
  /** Help center URL to analyze */
  helpCenterUrl?: string;
  /** README content */
  readmeContent?: string;
  /** Additional documentation URLs */
  documentationUrls?: string[];
  /** Maximum features to detect */
  maxFeatures?: number;
  /** Maximum journeys to generate */
  maxJourneys?: number;
  /** Maximum templates to generate */
  maxTemplates?: number;
}

export const IntelligenceBuildOptionsSchema = z.object({
  schemaContent: z.string().min(1),
  websiteUrl: z.string().url().optional(),
  helpCenterUrl: z.string().url().optional(),
  readmeContent: z.string().optional(),
  documentationUrls: z.array(z.string().url()).optional(),
  maxFeatures: z.number().int().min(INTELLIGENCE_LIMITS.maxFeatures.min).max(INTELLIGENCE_LIMITS.maxFeatures.max).default(INTELLIGENCE_DEFAULTS.maxFeatures),
  maxJourneys: z.number().int().min(INTELLIGENCE_LIMITS.maxJourneys.min).max(INTELLIGENCE_LIMITS.maxJourneys.max).default(INTELLIGENCE_DEFAULTS.maxJourneys),
  maxTemplates: z.number().int().min(INTELLIGENCE_LIMITS.maxTemplates.min).max(INTELLIGENCE_LIMITS.maxTemplates.max).default(INTELLIGENCE_DEFAULTS.maxTemplates),
});

/**
 * Progress during intelligence building
 */
export interface IntelligenceProgress {
  /** Current phase */
  phase: IntelligencePhase;
  /** Overall progress (0-100) */
  progress: number;
  /** Current status message */
  message: string;
  /** Errors encountered */
  errors?: string[];
}

export type IntelligencePhase =
  | "parsing_schema"
  | "fetching_website"
  | "fetching_help_center"
  | "analyzing_readme"
  | "synthesizing"
  | "generating_templates"
  | "complete"
  | "failed";

export const IntelligenceProgressSchema = z.object({
  phase: z.enum([
    "parsing_schema",
    "fetching_website",
    "fetching_help_center",
    "analyzing_readme",
    "synthesizing",
    "generating_templates",
    "complete",
    "failed",
  ]),
  progress: z.number().min(0).max(100),
  message: z.string(),
  errors: z.array(z.string()).optional(),
});
