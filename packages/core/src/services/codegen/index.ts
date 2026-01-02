/**
 * @demokit-ai/codegen
 *
 * Demo data generation and validation for DemoKit.
 *
 * This package provides:
 * - **Level 1-2 Generation**: Schema-valid and relationship-valid data generation
 * - **Validation**: Complete data validation against schemas
 * - **Context Inference**: Rule-based app context detection
 * - **Output Formatting**: TypeScript, JSON, SQL, CSV export
 *
 * For AI-powered Level 3 (narrative-driven) generation, install @demokit-cloud/ai
 *
 * @example
 * ```typescript
 * import { generateDemoData, validateData, inferAppContext } from '@demokit-ai/codegen'
 *
 * // Generate demo data from schema (Level 1 or 2)
 * const result = generateDemoData(schema, {
 *   level: 'relationship-valid',
 *   counts: { User: 10, Order: 50 },
 * })
 *
 * // Validate demo data
 * const validation = validateData(result.data, { schema })
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors)
 * }
 *
 * // Infer app context from schema
 * const context = inferAppContext(schema)
 * console.log('Detected domain:', context.domain)
 * ```
 *
 * @packageDocumentation
 */

// Generation (L1-2 only - for L3 narrative generation, use @demokit-cloud/ai)
export {
  generateDemoData,
  generateId,
  generateIdForModel,
  generateUUID,
  generateSeededUUID,
  generatePrefixedId,
  generateCuid,
  generateUlid,
  generateValue,
  parseCSV,
  generateDatasetId,
  validateDatasetName,
} from './generation'

// Context (rule-based inference)
export {
  inferAppContext,
  createAppContext,
  mergeAppContext,
} from './context'

// Output formatting
export {
  formatAsTypeScript,
  formatAsJSON,
  formatAsSQL,
  formatAsCSV,
  type OutputOptions,
} from './output'

// Validation
export {
  validateData,
  validateTimestampOrder,
  generateRulesFromSchema,
  describeRule,
  groupRulesByModel,
  getRelationshipRules,
  getRequiredFieldRules,
  checks,
} from './validation'

// Types
export type {
  // Validation types
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationStats,
  ValidationErrorType,
  ValidationWarningType,
  ValidationRule,
  ValidationCheck,
  RuleGeneratorConfig,
  ValidatorOptions,
  DemoData,
  ModelData,

  // Generation types
  GenerationLevel,
  GenerationOptions,
  GenerationResult,
  GenerationMetadata,

  // Custom generation rules types
  GenerationRulesConfig,
  FieldRule,
  StringFieldRule,
  NumberFieldRule,
  IntegerFieldRule,
  BooleanFieldRule,
  EnumFieldRule,
  DatasetFieldRule,

  // Linked dataset types (Phase 2)
  Dataset,
  ParseCSVResult,

  // App context types
  AppContext,
  EntityContext,
  DemoNarrative,
  Character,
  TimelineEvent,
  MetricTarget,
} from './types'
