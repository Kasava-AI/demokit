/**
 * Types for codebase schema parsers.
 * These types define the interface for parsing various schema formats
 * (TypeScript, Zod, Drizzle, Prisma, etc.) into DemokitSchema.
 */

import type { DemokitSchema } from '../types'

/**
 * Supported schema formats that can be parsed from codebases.
 */
export type SchemaFormat =
  | 'typescript'
  | 'zod'
  | 'drizzle'
  | 'prisma'
  | 'graphql'
  | 'supabase'
  | 'trpc'
  | 'nextjs'
  | 'openapi'
  | 'auto' // Auto-detect format

/**
 * A file to be parsed, with path and content.
 */
export interface CodebaseFile {
  /**
   * Relative or absolute file path.
   */
  path: string

  /**
   * File content as a string.
   */
  content: string
}

/**
 * Options for parsing codebase schemas.
 */
export interface ParseSchemaOptions {
  /**
   * The format to parse as. Use 'auto' to detect.
   * @default 'auto'
   */
  format?: SchemaFormat

  /**
   * Schema/API name for the output.
   * @default 'Codebase Schema'
   */
  name?: string

  /**
   * Schema version.
   * @default '1.0.0'
   */
  version?: string

  /**
   * Whether to detect relationships between models.
   * @default true
   */
  detectRelationships?: boolean

  /**
   * Whether to include inferred relationships from naming conventions.
   * @default true
   */
  inferRelationships?: boolean
}

/**
 * Result of parsing with additional metadata.
 */
export interface ParseResult {
  /**
   * The parsed schema.
   */
  schema: DemokitSchema

  /**
   * The format that was detected/used.
   */
  format: SchemaFormat

  /**
   * Any warnings encountered during parsing.
   */
  warnings: ParseWarning[]

  /**
   * Files that were parsed.
   */
  parsedFiles: string[]
}

/**
 * A warning encountered during parsing.
 */
export interface ParseWarning {
  /**
   * Warning code for programmatic handling.
   */
  code: string

  /**
   * Human-readable message.
   */
  message: string

  /**
   * File where the warning occurred.
   */
  file?: string

  /**
   * Line number where the warning occurred.
   */
  line?: number
}

/**
 * Detection result for schema format.
 */
export interface FormatDetectionResult {
  /**
   * The detected format, or null if unknown.
   */
  format: SchemaFormat | null

  /**
   * Confidence score from 0-1.
   */
  confidence: number

  /**
   * Evidence that led to this detection.
   */
  evidence: string[]
}

/**
 * Patterns for detecting schema formats from file content.
 */
export interface FormatDetectionPatterns {
  /**
   * File path patterns (globs).
   */
  pathPatterns: string[]

  /**
   * Keywords/patterns to search for in content.
   */
  contentPatterns: string[]

  /**
   * File extensions to match.
   */
  extensions: string[]
}

/**
 * Priority order for relationship detection methods.
 * Earlier methods take precedence when conflicts occur.
 */
export const RELATIONSHIP_PRIORITY = [
  'explicit-ref',        // Drizzle relations(), Prisma @relation
  'x-demokit-extension', // Custom x-demokit-relationship
  'naming-convention',   // userId -> User.id
  'inferred',            // AI/heuristic
] as const
