/**
 * Utility functions for schema parsing.
 */

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
} from './errors'
