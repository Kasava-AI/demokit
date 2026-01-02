/**
 * Error handling utilities for schema parsing.
 *
 * Provides custom error types and safe parsing utilities
 * for graceful error recovery during schema parsing.
 */

import type { ParseWarning } from "../parsers/types";

/**
 * Base error class for schema parsing errors.
 */
export class SchemaParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly filePath?: string,
    public readonly line?: number
  ) {
    super(message);
    this.name = "SchemaParseError";
  }
}

/**
 * Error thrown when a format cannot be detected.
 */
export class FormatDetectionError extends SchemaParseError {
  constructor(message: string, filePath?: string) {
    super(message, "FORMAT_DETECTION_FAILED", filePath);
    this.name = "FormatDetectionError";
  }
}

/**
 * Error thrown when a file cannot be parsed.
 */
export class FileParseError extends SchemaParseError {
  constructor(message: string, filePath: string, line?: number) {
    super(message, "FILE_PARSE_FAILED", filePath, line);
    this.name = "FileParseError";
  }
}

/**
 * Error thrown when schema validation fails.
 */
export class SchemaValidationError extends SchemaParseError {
  constructor(message: string, public readonly validationErrors: string[]) {
    super(message, "SCHEMA_VALIDATION_FAILED");
    this.name = "SchemaValidationError";
  }
}

/**
 * Error thrown when merging schemas fails.
 */
export class SchemaMergeError extends SchemaParseError {
  constructor(message: string, public readonly modelName?: string) {
    super(message, "SCHEMA_MERGE_FAILED");
    this.name = "SchemaMergeError";
  }
}

/**
 * Result of a safe operation that may fail.
 */
export type SafeResult<T> =
  | { success: true; value: T; warnings: ParseWarning[] }
  | { success: false; error: Error; warnings: ParseWarning[] };

/**
 * Safely execute a parsing function and capture errors as warnings.
 *
 * @param fn - The function to execute
 * @param fallback - Fallback value if the function fails
 * @param errorCode - Warning code to use if the function fails
 * @returns Result with value or error
 */
export function safeExecute<T>(
  fn: () => T,
  fallback: T,
  errorCode: string
): { value: T; warning?: ParseWarning } {
  try {
    return { value: fn() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      value: fallback,
      warning: {
        code: errorCode,
        message,
        file: error instanceof SchemaParseError ? error.filePath : undefined,
        line: error instanceof SchemaParseError ? error.line : undefined,
      },
    };
  }
}

/**
 * Safely parse content with error recovery.
 * Returns partial results with warnings instead of failing completely.
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param errorCode - Warning code prefix for errors
 * @returns Processed results and accumulated warnings
 */
export function safeProcessMany<T, R>(
  items: T[],
  processor: (item: T) => R,
  errorCode: string
): { results: R[]; warnings: ParseWarning[] } {
  const results: R[] = [];
  const warnings: ParseWarning[] = [];

  for (const item of items) {
    try {
      results.push(processor(item));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push({
        code: `${errorCode}_ITEM_FAILED`,
        message: `Failed to process item: ${message}`,
      });
    }
  }

  return { results, warnings };
}

/**
 * Create a warning from an error.
 */
export function errorToWarning(
  error: unknown,
  code: string,
  file?: string
): ParseWarning {
  const message = error instanceof Error ? error.message : String(error);
  return {
    code,
    message,
    file:
      file || (error instanceof SchemaParseError ? error.filePath : undefined),
    line: error instanceof SchemaParseError ? error.line : undefined,
  };
}

/**
 * Aggregate multiple warnings into a summary warning.
 */
export function aggregateWarnings(
  warnings: ParseWarning[],
  summaryCode: string,
  summaryPrefix: string
): ParseWarning[] {
  if (warnings.length === 0) {
    return [];
  }

  if (warnings.length === 1) {
    return warnings;
  }

  const firstWarning = warnings[0];

  if (!firstWarning) {
    return warnings;
  }

  return [
    {
      code: summaryCode,
      message: `${summaryPrefix}: ${warnings.length} issues found. First: ${firstWarning.message}`,
    },
    ...warnings,
  ];
}

/**
 * Check if an error is recoverable (should result in warning, not failure).
 */
export function isRecoverableError(error: unknown): boolean {
  // Syntax errors in individual files are recoverable
  if (error instanceof FileParseError) {
    return true;
  }

  // Format detection failures are recoverable (can fall back to TypeScript)
  if (error instanceof FormatDetectionError) {
    return true;
  }

  // Schema validation errors are recoverable (can return partial schema)
  if (error instanceof SchemaValidationError) {
    return true;
  }

  // Generic errors with certain messages are recoverable
  if (error instanceof Error) {
    const recoverablePatterns = [
      /syntax error/i,
      /unexpected token/i,
      /parse error/i,
      /could not parse/i,
      /invalid format/i,
    ];
    return recoverablePatterns.some((pattern) => pattern.test(error.message));
  }

  return false;
}
