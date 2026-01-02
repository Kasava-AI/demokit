/**
 * @demokit-ai/schema
 *
 * Schema parsing with automatic relationship detection.
 * Supports multiple formats: OpenAPI, TypeScript, Zod, Drizzle, and Prisma.
 *
 * @example
 * // Parse OpenAPI from file or URL
 * import { parseOpenAPIFromPath, parseOpenAPIFromString } from '@demokit-ai/schema'
 * const schema = await parseOpenAPIFromPath('./openapi.yaml')
 *
 * // Parse codebase schemas (TypeScript, Zod, Drizzle, Prisma)
 * import { parseSchema } from '@demokit-ai/schema'
 * const result = parseSchema([
 *   { path: 'schema.ts', content: fileContent }
 * ])
 *
 * // Parse with auto-detection or specific format
 * const result = parseSchema(files, { format: 'drizzle' })
 *
 * // Access models and relationships
 * console.log(result.schema.models)         // All data models
 * console.log(result.schema.relationships)  // Detected relationships
 *
 * @packageDocumentation
 */

// OpenAPI parsing functions
export {
  parseOpenAPIFromPath,
  parseOpenAPIFromString,
  parseOpenAPIFromObject,
  type ParseOptions,
} from './parser'

// Codebase schema parsing (TypeScript, Zod, Drizzle, Prisma)
export {
  // Main unified entry point
  parseSchema,
  parseSchemaMultiFormat,

  // Individual format parsers
  parseTypeScript,
  parseZod,
  parseDrizzle,
  parsePrisma,
  parseGraphQL,
  parseSupabase,
  parseTRPC,
  parseNextJS,

  // Format detection utilities
  detectFormat,
  detectFormatFromFiles,
  groupFilesByFormat,
  FORMAT_PATTERNS,
  FORMAT_PRIORITY,

  // Types
  type SchemaFormat,
  type CodebaseFile,
  type ParseSchemaOptions,
  type ParseResult,
  type ParseWarning,
  type FormatDetectionResult,
  type FormatDetectionPatterns,
} from './parsers'

// Relationship detection utilities
export {
  detectRelationships,
  detectRelationshipFromNaming,
  detectRelationshipFromExtension,
  detectRelationshipFromRef,
  getRelationshipsForModel,
  isModelReferenced,
  getModelDependencyOrder,
} from './relationships'

// Types
export type {
  // Core schema types
  DemokitSchema,
  SchemaInfo,
  Endpoint,
  DataModel,
  PropertyDef,
  HttpMethod,
  ParameterDef,
  RequestBody,
  ResponseDef,
  PropertyType,
  ModelType,

  // Relationship types
  Relationship,
  RelationshipSide,
  RelationshipTarget,
  RelationshipType,
  RelationshipDetectionMethod,

  // Reference types
  SchemaRef,
} from './types'

// Type guards and utilities
export { isSchemaRef, extractRefName } from './types'

// Schema merging utilities
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
} from './merge'

// Error handling utilities
export {
  SchemaParseError,
  FormatDetectionError,
  FileParseError,
  SchemaValidationError,
  SchemaMergeError,
  safeExecute,
  safeProcessMany,
  errorToWarning,
  aggregateWarnings,
  isRecoverableError,
  type SafeResult,
} from './utils'
