/**
 * Types for @demokit-ai/codegen
 *
 * Includes validation types, generation options, and output formats.
 */

// Import schema types for internal use
import type { DemokitSchema, DataModel, Relationship } from '../schema'

// Re-export schema types for convenience
export type { DemokitSchema, DataModel, Relationship }

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of validating demo data against a schema
 */
export interface ValidationResult {
  /** Whether all validations passed */
  valid: boolean
  /** Critical errors that must be fixed */
  errors: ValidationError[]
  /** Non-critical issues that should be reviewed */
  warnings: ValidationWarning[]
  /** Summary statistics */
  stats: ValidationStats
}

/**
 * A validation error - data that violates schema constraints
 */
export interface ValidationError {
  /** Type of validation failure */
  type: ValidationErrorType
  /** Model where the error occurred */
  model: string
  /** Field where the error occurred */
  field: string
  /** Human-readable error message */
  message: string
  /** The invalid value (for debugging) */
  value?: unknown
  /** Expected value or constraint */
  expected?: string
  /** Record ID if applicable */
  recordId?: string
}

/**
 * Types of validation errors
 */
export type ValidationErrorType =
  | 'missing_reference'      // Foreign key points to non-existent record
  | 'type_mismatch'          // Value doesn't match expected type
  | 'format_invalid'         // Value doesn't match expected format (email, uuid, etc.)
  | 'constraint_violation'   // Value violates min/max/pattern constraints
  | 'required_missing'       // Required field is missing or null
  | 'enum_invalid'           // Value not in allowed enum values
  | 'timestamp_order'        // Timestamps are in wrong order (e.g., createdAt > updatedAt)
  | 'array_empty'            // Array is empty when it shouldn't be
  | 'duplicate_id'           // Same ID used multiple times

/**
 * A validation warning - issues that may be intentional
 */
export interface ValidationWarning {
  /** Type of warning */
  type: ValidationWarningType
  /** Model where the warning occurred */
  model: string
  /** Field where the warning occurred */
  field: string
  /** Human-readable warning message */
  message: string
  /** The suspicious value */
  value?: unknown
}

/**
 * Types of validation warnings
 */
export type ValidationWarningType =
  | 'orphaned_record'        // Record is not referenced by anything
  | 'suspicious_value'       // Value looks wrong but is technically valid
  | 'missing_optional'       // Optional field is missing (might be intentional)
  | 'empty_string'           // String field is empty

/**
 * Statistics about the validation run
 */
export interface ValidationStats {
  /** Total number of records validated */
  totalRecords: number
  /** Records per model */
  recordsByModel: Record<string, number>
  /** Number of relationships validated */
  relationshipsChecked: number
  /** Number of type checks performed */
  typeChecks: number
  /** Duration of validation in ms */
  durationMs: number
}

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * A validation rule that can be applied to data
 */
export interface ValidationRule {
  /** Unique identifier for this rule */
  id: string
  /** Model this rule applies to */
  model: string
  /** Field this rule applies to */
  field: string
  /** Type of check to perform */
  check: ValidationCheck
  /** Target field or value for comparison checks */
  target?: string
  /** Whether this is a required field */
  required?: boolean
  /** Custom error message */
  message?: string
}

/**
 * Types of validation checks
 */
export type ValidationCheck =
  // Type checks
  | 'isString'
  | 'isNumber'
  | 'isInteger'
  | 'isBoolean'
  | 'isArray'
  | 'isObject'
  | 'isNull'
  // Format checks
  | 'isUUID'
  | 'isEmail'
  | 'isURL'
  | 'isISO8601'
  | 'isDate'
  | 'isDateTime'
  // Constraint checks
  | 'minLength'
  | 'maxLength'
  | 'minimum'
  | 'maximum'
  | 'pattern'
  // Relationship checks
  | 'existsIn'
  | 'isUnique'
  // Comparison checks
  | 'equals'
  | 'beforeOrEqual'
  | 'afterOrEqual'
  // Array checks
  | 'arrayNotEmpty'
  | 'arrayMinLength'
  | 'arrayMaxLength'
  // Enum checks
  | 'inEnum'

/**
 * Configuration for the rule generator
 */
export interface RuleGeneratorConfig {
  /** Whether to generate rules for optional fields */
  includeOptional?: boolean
  /** Whether to generate relationship rules */
  includeRelationships?: boolean
  /** Whether to generate format validation rules */
  includeFormats?: boolean
  /** Custom rules to add */
  customRules?: ValidationRule[]
}

// ============================================================================
// Demo Data Types
// ============================================================================

/**
 * Demo data for a single model
 */
export type ModelData = Record<string, unknown>[]

/**
 * Complete demo data set
 */
export type DemoData = Record<string, ModelData>

/**
 * Options for the validator
 */
export interface ValidatorOptions {
  /** Schema to validate against */
  schema: DemokitSchema
  /** Whether to collect warnings (slower) */
  collectWarnings?: boolean
  /** Whether to stop on first error */
  failFast?: boolean
  /** Maximum errors to collect before stopping */
  maxErrors?: number
  /** Custom validation rules to add */
  customRules?: ValidationRule[]
}

// ============================================================================
// Generation Types (for future phases)
// ============================================================================

/**
 * Level of data generation
 */
export type GenerationLevel =
  | 'schema-valid'        // Just match types
  | 'relationship-valid'  // Also maintain referential integrity
  | 'narrative-driven'    // Also tell a coherent story

/**
 * Options for data generation
 */
export interface GenerationOptions {
  /** Level of generation */
  level: GenerationLevel
  /** Number of records per model */
  counts?: Record<string, number>
  /** Base timestamp for reproducible data */
  baseTimestamp?: number
  /** Seed for random generation - different seed produces different data */
  seed?: number
  /** Output format */
  format?: 'typescript' | 'json'
  /** Whether to include validation */
  validate?: boolean
  /** Custom generation rules from project settings */
  customRules?: GenerationRulesConfig
}

// ============================================================================
// Custom Generation Rules Types
// ============================================================================

/**
 * Configuration for custom field generation rules
 * Stored in projects.settings.generationRules
 */
export interface GenerationRulesConfig {
  /** Schema version for migration support */
  version: 1
  /** Per-field rules, keyed by "ModelName.fieldName" */
  fieldRules: Record<string, FieldRule>
  /** Uploaded datasets for correlated value generation, keyed by dataset ID */
  datasets?: Record<string, Dataset>
}

/**
 * A rule for generating values for a specific field
 */
export type FieldRule =
  | StringFieldRule
  | NumberFieldRule
  | IntegerFieldRule
  | BooleanFieldRule
  | EnumFieldRule
  | DatasetFieldRule

/**
 * Rule for generating string field values
 */
export interface StringFieldRule {
  type: 'string'
  strategy: 'oneOf' | 'pattern'
  /** For 'oneOf' strategy - pick randomly from this list */
  values?: string[]
  /** For 'pattern' strategy - template like "SKU-{0000}" where {0000} is replaced with zero-padded number */
  pattern?: string
}

/**
 * Rule for generating number field values
 */
export interface NumberFieldRule {
  type: 'number'
  strategy: 'range' | 'fixed'
  /** For 'range' strategy */
  min?: number
  max?: number
  /** Number of decimal places (default: 2) */
  precision?: number
  /** For 'fixed' strategy - always use this value */
  value?: number
}

/**
 * Rule for generating integer field values
 */
export interface IntegerFieldRule {
  type: 'integer'
  strategy: 'range' | 'fixed'
  min?: number
  max?: number
  value?: number
}

/**
 * Rule for generating boolean field values
 */
export interface BooleanFieldRule {
  type: 'boolean'
  strategy: 'fixed' | 'weighted'
  /** For 'fixed' strategy - always this value */
  value?: boolean
  /** For 'weighted' strategy - probability of true (0-1) */
  trueProbability?: number
}

/**
 * Rule for generating enum field values
 */
export interface EnumFieldRule {
  type: 'enum'
  strategy: 'subset' | 'weighted'
  /** For 'subset' strategy - only use these values */
  allowedValues?: string[]
  /** For 'weighted' strategy - value -> weight mapping */
  weights?: Record<string, number>
}

/**
 * Rule for generating values from a linked dataset column
 * Enables row-based correlation - multiple fields linked to the same dataset
 * will use values from the same row within a record
 */
export interface DatasetFieldRule {
  type: 'fromDataset'
  /** ID of the dataset to pull values from */
  datasetId: string
  /** Column name to use for this field's values */
  column: string
}

// ============================================================================
// Linked Dataset Types (Phase 2)
// ============================================================================

/**
 * A dataset containing rows of correlated values
 * Limited to ~1000 rows for in-memory storage in project settings
 */
export interface Dataset {
  /** Unique identifier for the dataset */
  id: string
  /** Human-readable name for display */
  name: string
  /** Column headers from CSV */
  columns: string[]
  /** Row data - array of arrays matching column order */
  rows: string[][]
  /** When the dataset was created/uploaded */
  createdAt: string
  /** Optional description of the dataset contents */
  description?: string
}

/**
 * Result of parsing CSV content
 */
export interface ParseCSVResult {
  /** Whether parsing succeeded */
  success: boolean
  /** Column headers (if successful) */
  columns?: string[]
  /** Row data (if successful) */
  rows?: string[][]
  /** Error message (if failed) */
  error?: string
  /** Whether rows were truncated to meet limit */
  truncated?: boolean
  /** Original row count before truncation */
  originalRowCount?: number
}

/**
 * Result of data generation
 */
export interface GenerationResult {
  /** The generated data */
  data: DemoData
  /** Generated fixture code (if format is typescript) */
  fixtures?: string
  /** Validation results */
  validation: ValidationResult
  /** Generation metadata */
  metadata: GenerationMetadata
}

/**
 * Metadata about the generation process
 */
export interface GenerationMetadata {
  /** Generation level used */
  level: GenerationLevel
  /** Timestamp when generated */
  generatedAt: string
  /** Total records generated */
  totalRecords: number
  /** Records per model */
  recordsByModel: Record<string, number>
  /** IDs used in generation */
  usedIds: Record<string, string[]>
  /** Duration of generation in ms */
  durationMs: number
}

// ============================================================================
// App Context Types (for narrative generation)
// ============================================================================

/**
 * Context about the application being demoed
 */
export interface AppContext {
  /** Application name */
  name: string
  /** What the app does */
  description: string
  /** Domain (e-commerce, b2b-saas, etc.) */
  domain: string
  /** Key entities and their purposes */
  keyEntities: EntityContext[]
  /** Main features/capabilities */
  features: string[]
}

/**
 * Context about a specific entity
 */
export interface EntityContext {
  /** Entity/model name */
  name: string
  /** What this entity represents */
  purpose: string
  /** Key fields to focus on */
  keyFields: string[]
  /** Business rules that apply */
  businessRules?: string[]
}

/**
 * Narrative for generating story-driven data
 */
export interface DemoNarrative {
  /** Overall scenario */
  scenario: string
  /** Key story points to hit */
  keyPoints: string[]
  /** Named characters/personas */
  characters?: Character[]
  /** Timeline of events */
  timeline?: TimelineEvent[]
  /** Metric targets */
  metrics?: MetricTarget[]
}

/**
 * A character/persona in the demo
 */
export interface Character {
  /** Character name */
  name: string
  /** Role (customer, admin, etc.) */
  role: string
  /** Character description */
  description?: string
}

/**
 * A timeline event in the narrative
 */
export interface TimelineEvent {
  /** When this happens (relative or absolute) */
  when: string
  /** What happens */
  event: string
  /** Which characters are involved */
  characters?: string[]
}

/**
 * A metric target for the narrative
 */
export interface MetricTarget {
  /** Metric name */
  name: string
  /** Target value or description */
  value?: string
  /** Trend (increasing, declining, stable) */
  trend?: 'increasing' | 'declining' | 'stable'
  /** Percentage change */
  amount?: string
}
