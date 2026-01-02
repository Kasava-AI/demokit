/**
 * tRPC router parser.
 * Parses tRPC router definitions into DemokitSchema.
 *
 * Supports:
 * - router() definitions with procedure chains
 * - .input() and .output() Zod schemas
 * - publicProcedure and protectedProcedure
 * - Nested routers (appRouter structure)
 *
 * tRPC uses Zod for validation, so this parser extracts
 * Zod schemas and delegates to the Zod parser for details.
 */

import type {
  DemokitSchema,
  DataModel,
  PropertyDef,
  PropertyType,
} from '../types'
import type { CodebaseFile, ParseSchemaOptions, ParseResult, ParseWarning } from './types'

/**
 * Parse tRPC router files into DemokitSchema.
 */
export function parseTRPC(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const {
    name = 'tRPC Schema',
    version = '1.0.0',
  } = options

  const models: Record<string, DataModel> = {}
  const warnings: ParseWarning[] = []
  const parsedFiles: string[] = []

  for (const file of files) {
    if (!file.path.endsWith('.ts')) {
      continue
    }

    // Check for tRPC patterns
    if (!file.content.includes('router(') &&
        !file.content.includes('publicProcedure') &&
        !file.content.includes('protectedProcedure') &&
        !file.content.includes('.input(') &&
        !file.content.includes('.output(')) {
      continue
    }

    try {
      const { parsedModels } = parseTRPCFile(
        file.content,
        file.path,
        warnings
      )

      for (const model of parsedModels) {
        const existing = models[model.name]
        if (existing) {
          // Merge properties if model already exists
          models[model.name] = mergeModels(existing, model)
        } else {
          models[model.name] = model
        }
      }

      parsedFiles.push(file.path)
    } catch (error) {
      warnings.push({
        code: 'PARSE_ERROR',
        message: `Failed to parse ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: file.path,
      })
    }
  }

  const schema: DemokitSchema = {
    info: {
      title: name,
      version,
      description: 'Schema parsed from tRPC router definitions',
    },
    endpoints: [],
    models,
    relationships: [],
  }

  return {
    schema,
    format: 'trpc',
    warnings,
    parsedFiles,
  }
}

/**
 * Parse a single tRPC router file.
 */
function parseTRPCFile(
  content: string,
  _filePath: string,
  _warnings: ParseWarning[]
): { parsedModels: DataModel[] } {
  const parsedModels: DataModel[] = []

  // Extract .input() schemas
  // Pattern: .input(z.object({ ... })) or .input(schemaName)
  const inputMatches = content.matchAll(
    /\.input\(\s*(z\.object\(\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)|(\w+))\s*\)/g
  )

  for (const match of inputMatches) {
    const [fullMatch, , inlineSchema, schemaRef] = match

    if (inlineSchema) {
      // Inline z.object schema
      const procedureName = extractProcedureName(content, fullMatch)
      if (procedureName) {
        try {
          const properties = parseZodObjectBody(inlineSchema)
          parsedModels.push({
            name: `${toPascalCase(procedureName)}Input`,
            type: 'object',
            description: `Input schema for ${procedureName} procedure`,
            properties,
            required: Object.keys(properties).filter(
              (k) => properties[k]?.required
            ),
          })
        } catch {
          // Skip if parsing fails
        }
      }
    } else if (schemaRef) {
      // Schema reference - try to find it in the file
      const schemaMatch = content.match(
        new RegExp(`(?:const|let)\\s+${schemaRef}\\s*=\\s*z\\.object\\(\\s*\\{([^}]*(?:\\{[^}]*\\}[^}]*)*)\\}\\s*\\)`)
      )
      if (schemaMatch && schemaMatch[1]) {
        try {
          const properties = parseZodObjectBody(schemaMatch[1])
          parsedModels.push({
            name: toPascalCase(schemaRef),
            type: 'object',
            description: `Schema: ${schemaRef}`,
            properties,
            required: Object.keys(properties).filter(
              (k) => properties[k]?.required
            ),
          })
        } catch {
          // Skip if parsing fails
        }
      }
    }
  }

  // Extract .output() schemas
  const outputMatches = content.matchAll(
    /\.output\(\s*(z\.object\(\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)|(\w+))\s*\)/g
  )

  for (const match of outputMatches) {
    const [fullMatch, , inlineSchema, schemaRef] = match

    if (inlineSchema) {
      const procedureName = extractProcedureName(content, fullMatch)
      if (procedureName) {
        try {
          const properties = parseZodObjectBody(inlineSchema)
          parsedModels.push({
            name: `${toPascalCase(procedureName)}Output`,
            type: 'object',
            description: `Output schema for ${procedureName} procedure`,
            properties,
            required: Object.keys(properties).filter(
              (k) => properties[k]?.required
            ),
          })
        } catch {
          // Skip if parsing fails
        }
      }
    } else if (schemaRef) {
      const schemaMatch = content.match(
        new RegExp(`(?:const|let)\\s+${schemaRef}\\s*=\\s*z\\.object\\(\\s*\\{([^}]*(?:\\{[^}]*\\}[^}]*)*)\\}\\s*\\)`)
      )
      if (schemaMatch && schemaMatch[1]) {
        try {
          const properties = parseZodObjectBody(schemaMatch[1])
          parsedModels.push({
            name: toPascalCase(schemaRef),
            type: 'object',
            description: `Schema: ${schemaRef}`,
            properties,
            required: Object.keys(properties).filter(
              (k) => properties[k]?.required
            ),
          })
        } catch {
          // Skip if parsing fails
        }
      }
    }
  }

  // Also find standalone Zod schemas that might be used
  const standaloneSchemas = content.matchAll(
    /(?:export\s+)?(?:const|let)\s+(\w+Schema?)\s*=\s*z\.object\(\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)/g
  )

  for (const match of standaloneSchemas) {
    const [, schemaName, schemaBody] = match
    if (!schemaName || !schemaBody) continue

    // Skip if already parsed
    const modelName = toPascalCase(schemaName.replace(/Schema$/, ''))
    if (parsedModels.some((m) => m.name === modelName)) {
      continue
    }

    try {
      const properties = parseZodObjectBody(schemaBody)
      parsedModels.push({
        name: modelName,
        type: 'object',
        description: `Schema: ${schemaName}`,
        properties,
        required: Object.keys(properties).filter(
          (k) => properties[k]?.required
        ),
      })
    } catch {
      // Skip if parsing fails
    }
  }

  return { parsedModels }
}

/**
 * Parse a Zod object body (simplified version for tRPC).
 * Full parsing is delegated to the Zod parser.
 */
function parseZodObjectBody(body: string): Record<string, PropertyDef> {
  const properties: Record<string, PropertyDef> = {}

  // Parse property definitions
  // Pattern: propName: z.string().optional()
  const propMatches = body.matchAll(
    /(\w+)\s*:\s*z\.(\w+)\(([^)]*)\)([^,\n]*)/g
  )

  for (const match of propMatches) {
    const [, propName, zodType, , modifiers] = match

    if (!propName || !zodType) continue

    const { type, format, nullable, isRequired } = parseZodType(zodType, modifiers || '')

    properties[propName] = {
      name: propName,
      type,
      format,
      required: isRequired,
      nullable,
    }
  }

  return properties
}

/**
 * Parse a Zod type and its modifiers.
 */
function parseZodType(
  zodType: string,
  modifiers: string
): { type: PropertyType; format?: string; nullable: boolean; isRequired: boolean } {
  let type: PropertyType = 'string'
  let format: string | undefined
  let nullable = false
  let isRequired = true

  // Map Zod types
  switch (zodType.toLowerCase()) {
    case 'string':
      type = 'string'
      break
    case 'number':
      type = 'number'
      break
    case 'boolean':
    case 'bool':
      type = 'boolean'
      break
    case 'date':
      type = 'string'
      format = 'date-time'
      break
    case 'array':
      type = 'array'
      break
    case 'object':
      type = 'object'
      break
    case 'enum':
      type = 'string'
      break
    case 'uuid':
      type = 'string'
      format = 'uuid'
      break
    default:
      type = 'string'
  }

  // Check modifiers
  if (modifiers.includes('.optional()')) {
    isRequired = false
  }
  if (modifiers.includes('.nullable()')) {
    nullable = true
    isRequired = false
  }
  if (modifiers.includes('.nullish()')) {
    nullable = true
    isRequired = false
  }
  if (modifiers.includes('.email()')) {
    format = 'email'
  }
  if (modifiers.includes('.url()')) {
    format = 'uri'
  }
  if (modifiers.includes('.uuid()')) {
    format = 'uuid'
  }

  return { type, format, nullable, isRequired }
}

/**
 * Extract procedure name from context around a match.
 */
function extractProcedureName(content: string, match: string): string | null {
  const matchIndex = content.indexOf(match)
  if (matchIndex === -1) return null

  // Look backwards for procedure name
  const before = content.slice(Math.max(0, matchIndex - 200), matchIndex)

  // Pattern: procedureName: publicProcedure or procedureName: t.procedure
  const nameMatch = before.match(/(\w+)\s*:\s*(?:public|protected)?[Pp]rocedure/)
  if (nameMatch) {
    return nameMatch[1] || null
  }

  return null
}

/**
 * Merge two models.
 */
function mergeModels(existing: DataModel, incoming: DataModel): DataModel {
  return {
    ...existing,
    properties: {
      ...incoming.properties,
      ...existing.properties,
    },
    required: [
      ...new Set([...(existing.required || []), ...(incoming.required || [])]),
    ],
  }
}

/**
 * Convert string to PascalCase.
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase())
}
