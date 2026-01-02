/**
 * Format detection utilities for codebase schema files.
 * Detects which schema format (TypeScript, Zod, Drizzle, Prisma, etc.)
 * a given file or content is written in.
 */

import type {
  SchemaFormat,
  CodebaseFile,
  FormatDetectionResult,
  FormatDetectionPatterns,
} from './types'

/**
 * Detection patterns for each schema format.
 */
export const FORMAT_PATTERNS: Record<Exclude<SchemaFormat, 'auto'>, FormatDetectionPatterns> = {
  drizzle: {
    pathPatterns: ['**/schema/**/*.ts', '**/db/schema*.ts', '**/drizzle/**/*.ts'],
    contentPatterns: [
      'pgTable(',
      'mysqlTable(',
      'sqliteTable(',
      'relations(',
      "from 'drizzle-orm",
      'from "drizzle-orm',
    ],
    extensions: ['.ts'],
  },
  prisma: {
    pathPatterns: ['**/prisma/schema.prisma', '**/schema.prisma', '**/*.prisma'],
    contentPatterns: [
      'model ',
      'datasource ',
      'generator ',
      '@relation(',
      '@id',
      '@unique',
    ],
    extensions: ['.prisma'],
  },
  zod: {
    pathPatterns: ['**/schemas/**/*.ts', '**/schema.ts', '**/validation/**/*.ts'],
    contentPatterns: [
      'z.object(',
      'z.string(',
      'z.number(',
      'z.boolean(',
      'z.array(',
      'z.enum(',
      "from 'zod'",
      'from "zod"',
    ],
    extensions: ['.ts', '.tsx'],
  },
  typescript: {
    pathPatterns: ['**/types/**/*.ts', '**/types.ts', '**/models/**/*.ts', '**/interfaces/**/*.ts'],
    contentPatterns: [
      'interface ',
      'type ',
      'export interface',
      'export type',
    ],
    extensions: ['.ts', '.tsx', '.d.ts'],
  },
  graphql: {
    pathPatterns: ['**/*.graphql', '**/*.gql', '**/schema.graphql'],
    contentPatterns: [
      'type Query',
      'type Mutation',
      'type Subscription',
      'input ',
      'enum ',
      'scalar ',
    ],
    extensions: ['.graphql', '.gql'],
  },
  supabase: {
    pathPatterns: ['**/database.types.ts', '**/supabase.ts', '**/types/supabase.ts'],
    contentPatterns: [
      'Database',
      'Tables:',
      'public:',
      'Row:',
      'Insert:',
      'Update:',
    ],
    extensions: ['.ts'],
  },
  trpc: {
    pathPatterns: ['**/trpc/**/*.ts', '**/routers/**/*.ts', '**/api/trpc/**/*.ts'],
    contentPatterns: [
      'router(',
      'publicProcedure',
      'protectedProcedure',
      '.input(',
      '.output(',
      't.router',
      "from '@trpc/server'",
    ],
    extensions: ['.ts'],
  },
  nextjs: {
    pathPatterns: ['**/app/api/**/*.ts', '**/pages/api/**/*.ts', '**/actions/**/*.ts'],
    contentPatterns: [
      'NextRequest',
      'NextResponse',
      '"use server"',
      "'use server'",
      'export async function GET',
      'export async function POST',
    ],
    extensions: ['.ts', '.tsx'],
  },
  openapi: {
    pathPatterns: ['**/openapi.yaml', '**/openapi.json', '**/swagger.yaml', '**/swagger.json', '**/api.yaml'],
    contentPatterns: [
      'openapi:',
      'swagger:',
      '"openapi":',
      '"swagger":',
      'paths:',
      'components:',
    ],
    extensions: ['.yaml', '.yml', '.json'],
  },
}

/**
 * Priority order when multiple formats are detected.
 * Formats earlier in the list take precedence.
 */
export const FORMAT_PRIORITY: SchemaFormat[] = [
  'drizzle',   // Explicit ORM relations
  'prisma',    // Explicit ORM relations
  'graphql',   // Explicit type system
  'supabase',  // Generated from database
  'zod',       // Validation schemas
  'typescript',// Generic types
  'trpc',      // Uses Zod internally
  'nextjs',    // API routes
  'openapi',   // API specs
]

/**
 * Detect the schema format of a single file.
 */
export function detectFormat(file: CodebaseFile): FormatDetectionResult {
  const results: Array<{ format: SchemaFormat; confidence: number; evidence: string[] }> = []

  for (const format of FORMAT_PRIORITY) {
    if (format === 'auto') continue

    const patterns = FORMAT_PATTERNS[format]
    const evidence: string[] = []
    let confidence = 0

    // Check file extension
    const hasMatchingExtension = patterns.extensions.some((ext) =>
      file.path.endsWith(ext)
    )

    if (!hasMatchingExtension) {
      continue
    }

    // Check content patterns
    for (const pattern of patterns.contentPatterns) {
      if (file.content.includes(pattern)) {
        evidence.push(`Contains "${pattern}"`)
        confidence += 0.15
      }
    }

    // Check path patterns
    for (const pathPattern of patterns.pathPatterns) {
      if (matchGlobPattern(file.path, pathPattern)) {
        evidence.push(`Path matches "${pathPattern}"`)
        confidence += 0.2
      }
    }

    if (confidence > 0) {
      results.push({
        format,
        confidence: Math.min(1, confidence),
        evidence,
      })
    }
  }

  // Sort by confidence and return best match
  results.sort((a, b) => b.confidence - a.confidence)

  if (results.length === 0 || !results[0]) {
    return { format: null, confidence: 0, evidence: [] }
  }

  return results[0]
}

/**
 * Detect the primary schema format from multiple files.
 * Returns the format with highest total confidence.
 */
export function detectFormatFromFiles(files: CodebaseFile[]): FormatDetectionResult {
  const formatScores = new Map<SchemaFormat, { confidence: number; evidence: string[] }>()

  for (const file of files) {
    const result = detectFormat(file)
    if (result.format) {
      const existing = formatScores.get(result.format) || { confidence: 0, evidence: [] }
      formatScores.set(result.format, {
        confidence: existing.confidence + result.confidence,
        evidence: [...existing.evidence, ...result.evidence.map((e) => `[${file.path}] ${e}`)],
      })
    }
  }

  if (formatScores.size === 0) {
    return { format: null, confidence: 0, evidence: [] }
  }

  // Find format with highest score
  let bestFormat: SchemaFormat = 'typescript'
  let bestScore = 0
  let bestEvidence: string[] = []

  for (const [format, { confidence, evidence }] of formatScores) {
    if (confidence > bestScore) {
      bestFormat = format
      bestScore = confidence
      bestEvidence = evidence
    }
  }

  // Normalize confidence to 0-1 range
  const normalizedConfidence = Math.min(1, bestScore / files.length)

  return {
    format: bestFormat,
    confidence: normalizedConfidence,
    evidence: bestEvidence,
  }
}

/**
 * Group files by their detected format.
 */
export function groupFilesByFormat(files: CodebaseFile[]): Map<SchemaFormat, CodebaseFile[]> {
  const groups = new Map<SchemaFormat, CodebaseFile[]>()

  for (const file of files) {
    const result = detectFormat(file)
    if (result.format && result.confidence > 0.3) {
      const existing = groups.get(result.format) || []
      groups.set(result.format, [...existing, file])
    }
  }

  return groups
}

/**
 * Simple glob pattern matching for file paths.
 * Supports * (any characters except /) and ** (any path segment).
 */
function matchGlobPattern(path: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = path.replace(/\\/g, '/')

  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/{{GLOBSTAR}}/g, '.*')
    .replace(/\//g, '\\/')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(normalizedPath)
}
