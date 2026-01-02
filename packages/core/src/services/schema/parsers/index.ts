/**
 * Unified schema parser entry point.
 *
 * Provides a single `parseSchema()` function that can parse
 * multiple schema formats and automatically detect the format.
 *
 * @example
 * // Parse with auto-detection
 * const result = await parseSchema(files)
 *
 * // Parse specific format
 * const result = await parseSchema(files, { format: 'drizzle' })
 *
 * // Parse from strings
 * const result = await parseSchemaFromStrings([
 *   { path: 'schema.ts', content: 'export const users = pgTable(...)' }
 * ])
 */

import type { DemokitSchema } from '../types'
import type {
  SchemaFormat,
  CodebaseFile,
  ParseSchemaOptions,
  ParseResult,
  ParseWarning,
} from './types'
import { detectFormatFromFiles, groupFilesByFormat, FORMAT_PRIORITY } from './detect'
import { parseTypeScript } from './typescript'
import { parseZod } from './zod'
import { parseDrizzle } from './drizzle'
import { parsePrisma } from './prisma'
import { parseGraphQL } from './graphql'
import { parseSupabase } from './supabase'
import { parseTRPC } from './trpc'
import { parseNextJS } from './nextjs'
import { detectRelationships } from '../relationships'

// Re-export types and utilities
export * from './types'
export * from './detect'
export { parseTypeScript } from './typescript'
export { parseZod } from './zod'
export { parseDrizzle } from './drizzle'
export { parsePrisma } from './prisma'
export { parseGraphQL } from './graphql'
export { parseSupabase } from './supabase'
export { parseTRPC } from './trpc'
export { parseNextJS } from './nextjs'

/**
 * Parse schema files from a codebase.
 *
 * Supports TypeScript, Zod, Drizzle, and Prisma formats.
 * Can auto-detect the format or use a specified format.
 *
 * @param files - Array of files with path and content
 * @param options - Parsing options
 * @returns Parsed schema with metadata
 */
export function parseSchema(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const { format = 'auto' } = options

  if (format === 'auto') {
    return parseSchemaAutoDetect(files, options)
  }

  return parseSchemaWithFormat(files, format, options)
}

/**
 * Parse schema with auto-detection of format.
 */
function parseSchemaAutoDetect(
  files: CodebaseFile[],
  options: ParseSchemaOptions
): ParseResult {
  const warnings: ParseWarning[] = []

  // Try to detect the primary format
  const detection = detectFormatFromFiles(files)

  if (!detection.format) {
    // No format detected - try to parse as TypeScript
    warnings.push({
      code: 'NO_FORMAT_DETECTED',
      message: 'Could not detect schema format, falling back to TypeScript',
    })
    const result = parseSchemaWithFormat(files, 'typescript', options)
    result.warnings = [...warnings, ...result.warnings]
    return result
  }

  if (detection.confidence < 0.5) {
    warnings.push({
      code: 'LOW_CONFIDENCE',
      message: `Low confidence (${Math.round(detection.confidence * 100)}%) for format "${detection.format}"`,
    })
  }

  const result = parseSchemaWithFormat(files, detection.format, options)

  // Add detection warnings
  result.warnings = [...warnings, ...result.warnings]

  return result
}

/**
 * Parse schema with a specific format.
 */
function parseSchemaWithFormat(
  files: CodebaseFile[],
  format: SchemaFormat,
  options: ParseSchemaOptions
): ParseResult {
  switch (format) {
    case 'drizzle':
      return parseDrizzle(files, options)

    case 'prisma':
      return parsePrisma(files, options)

    case 'zod':
      return parseZod(files, options)

    case 'typescript':
      return parseTypeScript(files, options)

    case 'graphql':
      return parseGraphQL(files, options)

    case 'supabase':
      return parseSupabase(files, options)

    case 'trpc':
      return parseTRPC(files, options)

    case 'nextjs':
      return parseNextJS(files, options)

    // OpenAPI is handled by the existing OpenAPI parser (separate package)
    case 'openapi':
      return {
        schema: createEmptySchema(options),
        format,
        warnings: [{
          code: 'UNSUPPORTED_FORMAT',
          message: `Format "${format}" should be parsed using the OpenAPI-specific parser`,
        }],
        parsedFiles: [],
      }

    default:
      return {
        schema: createEmptySchema(options),
        format: 'typescript',
        warnings: [{
          code: 'UNKNOWN_FORMAT',
          message: `Unknown format "${format}", falling back to TypeScript`,
        }],
        parsedFiles: [],
      }
  }
}

/**
 * Parse multiple formats from a codebase and merge the results.
 *
 * This is useful when a codebase uses multiple schema sources
 * (e.g., Drizzle for database + Zod for validation).
 *
 * @param files - Array of files with path and content
 * @param options - Parsing options
 * @returns Merged schema from all detected formats
 */
export function parseSchemaMultiFormat(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const {
    name = 'Merged Schema',
    version = '1.0.0',
    detectRelationships: shouldDetectRelationships = true,
  } = options

  const allModels: Record<string, DataModel> = {}
  const allRelationships: import('../types').Relationship[] = []
  const allWarnings: ParseWarning[] = []
  const allParsedFiles: string[] = []
  const detectedFormats: SchemaFormat[] = []

  // Group files by format
  const filesByFormat = groupFilesByFormat(files)

  // Parse each format in priority order
  for (const format of FORMAT_PRIORITY) {
    const formatFiles = filesByFormat.get(format)
    if (!formatFiles || formatFiles.length === 0) {
      continue
    }

    detectedFormats.push(format)

    const result = parseSchemaWithFormat(formatFiles, format, {
      ...options,
      detectRelationships: false, // We'll detect after merging
    })

    // Merge models (later formats don't override earlier ones)
    for (const [modelName, model] of Object.entries(result.schema.models)) {
      if (!allModels[modelName]) {
        allModels[modelName] = model
      } else {
        // Merge properties
        allModels[modelName] = mergeModels(allModels[modelName], model)
      }
    }

    // Collect relationships
    allRelationships.push(...result.schema.relationships)

    // Collect warnings with format prefix
    for (const warning of result.warnings) {
      allWarnings.push({
        ...warning,
        code: `${format.toUpperCase()}_${warning.code}`,
      })
    }

    allParsedFiles.push(...result.parsedFiles)
  }

  // Detect additional relationships from merged models
  if (shouldDetectRelationships) {
    const inferred = detectRelationships(allModels)
    for (const rel of inferred) {
      // Only add if not already present
      const exists = allRelationships.some(
        (r) =>
          r.from.model === rel.from.model &&
          r.from.field === rel.from.field &&
          r.to.model === rel.to.model
      )
      if (!exists) {
        allRelationships.push(rel)
      }
    }
  }

  // Deduplicate relationships
  const uniqueRelationships = deduplicateRelationships(allRelationships)

  const schema: DemokitSchema = {
    info: {
      title: name,
      version,
      description: `Schema merged from formats: ${detectedFormats.join(', ')}`,
    },
    endpoints: [],
    models: allModels,
    relationships: uniqueRelationships,
  }

  return {
    schema,
    format: detectedFormats[0] || 'typescript',
    warnings: allWarnings,
    parsedFiles: allParsedFiles,
  }
}

/**
 * Merge two models, combining their properties.
 * Earlier model's properties take precedence.
 */
function mergeModels(existing: DataModel, incoming: DataModel): DataModel {
  return {
    ...existing,
    description: existing.description || incoming.description,
    properties: {
      ...incoming.properties,
      ...existing.properties, // Existing takes precedence
    },
    required: [
      ...new Set([...(existing.required || []), ...(incoming.required || [])]),
    ],
  }
}

/**
 * Deduplicate relationships, preferring explicit ones.
 */
function deduplicateRelationships(
  relationships: import('../types').Relationship[]
): import('../types').Relationship[] {
  const seen = new Map<string, import('../types').Relationship>()

  for (const rel of relationships) {
    const key = `${rel.from.model}.${rel.from.field}->${rel.to.model}.${rel.to.field}`

    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, rel)
    } else if (rel.detectedBy === 'explicit-ref' && existing.detectedBy !== 'explicit-ref') {
      // Prefer explicit relationships
      seen.set(key, rel)
    }
  }

  return Array.from(seen.values())
}

/**
 * Create an empty schema with info from options.
 */
function createEmptySchema(options: ParseSchemaOptions): DemokitSchema {
  return {
    info: {
      title: options.name || 'Schema',
      version: options.version || '1.0.0',
    },
    endpoints: [],
    models: {},
    relationships: [],
  }
}

// Import DataModel type for mergeModels
import type { DataModel } from '../types'
