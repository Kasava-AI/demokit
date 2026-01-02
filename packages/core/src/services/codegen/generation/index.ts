/**
 * Generation Module
 *
 * Provides demo data generation at multiple levels:
 *
 * - **Level 1 (schema-valid)**: Data matches types only
 * - **Level 2 (relationship-valid)**: Foreign keys are valid
 *
 * For Level 3 (narrative-driven AI generation), install @demokit-cloud/ai
 *
 * Also provides ID generation utilities for consistent, reproducible IDs.
 *
 * @example
 * ```typescript
 * import {
 *   generateDemoData,
 *   generateId,
 *   generateValue,
 * } from '@demokit-ai/codegen'
 *
 * // Level 1 generation - matches types
 * const result1 = generateDemoData(schema, { level: 'schema-valid' })
 *
 * // Level 2 generation - valid foreign keys
 * const result2 = generateDemoData(schema, { level: 'relationship-valid' })
 * ```
 *
 * @module
 */

export { generateDemoData } from './generator'
export {
  generateId,
  generateIdForModel,
  generateUUID,
  generateSeededUUID,
  generatePrefixedId,
  generateCuid,
  generateUlid,
} from './id-generator'
export { generateValue } from './value-generators'
export { parseCSV, generateDatasetId, validateDatasetName } from './csv-parser'
