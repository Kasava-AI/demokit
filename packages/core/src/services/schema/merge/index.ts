/**
 * Schema Merge Module.
 *
 * Provides utilities for merging multiple schemas from different sources
 * and comparing schemas for differences.
 */

export {
  mergeSchemas,
  diffSchemas,
  type MergeOptions,
  type SchemaSource,
  type MergeResult,
  type MergeConflict,
  type ModelSourceMap,
  type SchemaDiff,
  type SchemaDiffItem,
  type PropertyDiff,
} from './schema-merger'
