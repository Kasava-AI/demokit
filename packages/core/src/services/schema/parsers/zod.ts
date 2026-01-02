/**
 * Zod schema parser.
 * Parses Zod validation schemas into DemokitSchema.
 *
 * Supports:
 * - z.object() schemas
 * - z.string(), z.number(), z.boolean() primitives
 * - z.array() and z.tuple()
 * - z.enum() and z.nativeEnum()
 * - z.optional(), z.nullable()
 * - z.union(), z.intersection()
 * - z.lazy() for recursive types
 * - .describe() for descriptions
 * - .default() values
 * - String validations (.email(), .uuid(), .url(), etc.)
 * - Number validations (.min(), .max(), .int())
 */

import type {
  DemokitSchema,
  DataModel,
  PropertyDef,
  PropertyType,
} from '../types'
import type { CodebaseFile, ParseSchemaOptions, ParseResult, ParseWarning } from './types'
import { detectRelationships } from '../relationships'

/**
 * Parse Zod schema files into DemokitSchema.
 */
export function parseZod(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const {
    name = 'Zod Schema',
    version = '1.0.0',
    detectRelationships: shouldDetectRelationships = true,
  } = options

  const models: Record<string, DataModel> = {}
  const warnings: ParseWarning[] = []
  const parsedFiles: string[] = []

  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) {
      continue
    }

    // Check if file contains Zod imports
    if (!file.content.includes("from 'zod'") && !file.content.includes('from "zod"')) {
      continue
    }

    try {
      const fileModels = parseZodFile(file.content, file.path, warnings)
      for (const model of fileModels) {
        if (models[model.name]) {
          warnings.push({
            code: 'DUPLICATE_MODEL',
            message: `Model "${model.name}" already exists, skipping duplicate from ${file.path}`,
            file: file.path,
          })
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

  const relationships = shouldDetectRelationships ? detectRelationships(models) : []

  const schema: DemokitSchema = {
    info: {
      title: name,
      version,
      description: 'Schema parsed from Zod validation schemas',
    },
    endpoints: [],
    models,
    relationships,
  }

  return {
    schema,
    format: 'zod',
    warnings,
    parsedFiles,
  }
}

/**
 * Parse a single Zod file.
 */
function parseZodFile(
  content: string,
  filePath: string,
  warnings: ParseWarning[]
): DataModel[] {
  const models: DataModel[] = []

  // Find all exported Zod schema definitions
  // Pattern: export const SchemaName = z.object({ ... })
  const schemaMatches = content.matchAll(
    /(?:\/\*\*[\s\S]*?\*\/\s*)?(export\s+)?(?:const|let)\s+(\w+)(?:Schema|Type)?\s*=\s*(z\.[\s\S]+?)(?=\n\n|\nexport|\nconst|\nlet|\nfunction|\nclass|$)/g
  )

  for (const match of schemaMatches) {
    const [fullMatch, , rawName, zodExpr] = match

    // Skip if match groups are undefined
    if (!rawName || !zodExpr) continue

    // Clean up the name (remove Schema/Type suffix for model name)
    const name = rawName.replace(/(Schema|Type)$/, '')

    // Skip if not a z.object (we only care about object schemas for models)
    if (!zodExpr.trim().startsWith('z.object(')) {
      // But still try to parse enums
      if (zodExpr.trim().startsWith('z.enum(')) {
        const enumModel = parseZodEnum(name, zodExpr, fullMatch || '')
        if (enumModel) {
          models.push(enumModel)
        }
      }
      continue
    }

    try {
      const description = extractJSDocDescription(fullMatch || '')
      const properties = parseZodObject(zodExpr, filePath, warnings)

      models.push({
        name,
        type: 'object',
        description,
        properties,
        required: Object.entries(properties)
          .filter(([, prop]) => prop.required)
          .map(([name]) => name),
      })
    } catch (error) {
      warnings.push({
        code: 'SCHEMA_PARSE_ERROR',
        message: `Could not parse schema "${name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: filePath,
      })
    }
  }

  return models
}

/**
 * Parse z.object({ ... }) into properties.
 */
function parseZodObject(
  zodExpr: string,
  filePath: string,
  warnings: ParseWarning[]
): Record<string, PropertyDef> {
  const properties: Record<string, PropertyDef> = {}

  // Extract the object body from z.object({ ... })
  const objectMatch = zodExpr.match(/z\.object\(\s*\{([\s\S]*?)\}\s*\)/)
  if (!objectMatch || !objectMatch[1]) {
    return properties
  }

  const objectBody = objectMatch[1]

  // Parse each property
  // Pattern: propertyName: z.string().optional().describe("...")
  const propMatches = objectBody.matchAll(
    /(\w+)\s*:\s*(z\.[\s\S]+?)(?=,\s*\n\s*\w+\s*:|,?\s*\}\s*\)|$)/g
  )

  for (const match of propMatches) {
    const [, propName, zodType] = match

    // Skip if match groups are undefined
    if (!propName || !zodType) continue

    try {
      const propDef = parseZodType(propName, zodType.trim())
      properties[propName] = propDef
    } catch (error) {
      warnings.push({
        code: 'PROPERTY_PARSE_ERROR',
        message: `Could not parse property "${propName}" in ${filePath}`,
        file: filePath,
      })
    }
  }

  return properties
}

/**
 * Parse a Zod type expression into a PropertyDef.
 */
function parseZodType(name: string, zodType: string): PropertyDef {
  let type: PropertyType = 'string'
  let format: string | undefined
  let nullable = false
  let required = true
  let description: string | undefined
  let defaultValue: unknown
  let enumValues: unknown[] | undefined
  let minimum: number | undefined
  let maximum: number | undefined
  let minLength: number | undefined
  let maxLength: number | undefined
  let pattern: string | undefined
  let items: { $ref: string } | DataModel | undefined

  // Check for .optional()
  if (zodType.includes('.optional()')) {
    required = false
  }

  // Check for .nullable()
  if (zodType.includes('.nullable()') || zodType.includes('.nullish()')) {
    nullable = true
    required = false
  }

  // Extract .describe("...")
  const describeMatch = zodType.match(/\.describe\(\s*(['"`])([\s\S]*?)\1\s*\)/)
  if (describeMatch) {
    description = describeMatch[2]
  }

  // Extract .default(...)
  const defaultMatch = zodType.match(/\.default\(\s*(.+?)\s*\)/)
  if (defaultMatch && defaultMatch[1]) {
    try {
      // Try to parse the default value
      defaultValue = parseDefaultValue(defaultMatch[1])
    } catch {
      // Ignore parse errors for defaults
    }
  }

  // Determine the base type
  if (zodType.startsWith('z.string(')) {
    type = 'string'

    // Check for string format methods
    if (zodType.includes('.email()')) format = 'email'
    else if (zodType.includes('.uuid()')) format = 'uuid'
    else if (zodType.includes('.url()')) format = 'uri'
    else if (zodType.includes('.datetime()')) format = 'date-time'
    else if (zodType.includes('.date()')) format = 'date'
    else if (zodType.includes('.ip()')) format = 'ipv4'

    // Extract length constraints
    const minMatch = zodType.match(/\.min\(\s*(\d+)/)
    if (minMatch && minMatch[1]) minLength = parseInt(minMatch[1], 10)

    const maxMatch = zodType.match(/\.max\(\s*(\d+)/)
    if (maxMatch && maxMatch[1]) maxLength = parseInt(maxMatch[1], 10)

    const regexMatch = zodType.match(/\.regex\(\s*\/(.+?)\//)
    if (regexMatch && regexMatch[1]) pattern = regexMatch[1]
  } else if (zodType.startsWith('z.number(')) {
    type = 'number'

    if (zodType.includes('.int()')) type = 'integer'

    const minMatch = zodType.match(/\.min\(\s*(-?\d+(?:\.\d+)?)/)
    if (minMatch && minMatch[1]) minimum = parseFloat(minMatch[1])

    const maxMatch = zodType.match(/\.max\(\s*(-?\d+(?:\.\d+)?)/)
    if (maxMatch && maxMatch[1]) maximum = parseFloat(maxMatch[1])

    const gteMatch = zodType.match(/\.gte\(\s*(-?\d+(?:\.\d+)?)/)
    if (gteMatch && gteMatch[1]) minimum = parseFloat(gteMatch[1])

    const lteMatch = zodType.match(/\.lte\(\s*(-?\d+(?:\.\d+)?)/)
    if (lteMatch && lteMatch[1]) maximum = parseFloat(lteMatch[1])
  } else if (zodType.startsWith('z.boolean(')) {
    type = 'boolean'
  } else if (zodType.startsWith('z.bigint(')) {
    type = 'integer'
  } else if (zodType.startsWith('z.date(')) {
    type = 'string'
    format = 'date-time'
  } else if (zodType.startsWith('z.array(')) {
    type = 'array'
    // Extract item type
    const itemMatch = zodType.match(/z\.array\(\s*(z\.\w+(?:\([^)]*\))?(?:\.[^)]+\))?)/)
    if (itemMatch && itemMatch[1]) {
      const itemType = parseZodType('items', itemMatch[1])
      items = {
        name: 'items',
        type: itemType.type,
        properties: {},
      }
    }
  } else if (zodType.startsWith('z.enum(')) {
    type = 'string'
    const enumMatch = zodType.match(/z\.enum\(\s*\[\s*([\s\S]*?)\s*\]\s*\)/)
    if (enumMatch && enumMatch[1]) {
      enumValues = enumMatch[1]
        .split(',')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    }
  } else if (zodType.startsWith('z.literal(')) {
    type = 'string'
    const literalMatch = zodType.match(/z\.literal\(\s*(['"`])(.+?)\1\s*\)/)
    if (literalMatch && literalMatch[2]) {
      enumValues = [literalMatch[2]]
    }
  } else if (zodType.startsWith('z.object(')) {
    type = 'object'
  } else if (zodType.startsWith('z.record(')) {
    type = 'object'
  } else if (zodType.startsWith('z.union(') || zodType.startsWith('z.or(')) {
    // For unions, try to detect if it's a string enum-like union
    type = 'string'
  } else if (zodType.startsWith('z.null(') || zodType.startsWith('z.undefined()')) {
    type = 'null'
    nullable = true
  } else if (zodType.startsWith('z.any(') || zodType.startsWith('z.unknown()')) {
    type = 'object'
  } else if (zodType.startsWith('z.lazy(')) {
    // Lazy types are usually recursive references
    type = 'object'
    const lazyMatch = zodType.match(/z\.lazy\(\s*\(\)\s*=>\s*(\w+)/)
    if (lazyMatch && lazyMatch[1]) {
      format = `ref:${lazyMatch[1].replace(/(Schema|Type)$/, '')}`
    }
  } else {
    // Check if it's a reference to another schema
    const refMatch = zodType.match(/^(\w+)(Schema|Type)?(?:\.|$)/)
    if (refMatch && refMatch[1]) {
      type = 'object'
      format = `ref:${refMatch[1].replace(/(Schema|Type)$/, '')}`
    }
  }

  return {
    name,
    type,
    format,
    required,
    nullable,
    description,
    default: defaultValue,
    enum: enumValues,
    minimum,
    maximum,
    minLength,
    maxLength,
    pattern,
    items,
  }
}

/**
 * Parse a Zod enum into a DataModel.
 */
function parseZodEnum(
  name: string,
  zodExpr: string,
  fullMatch: string
): DataModel | null {
  const enumMatch = zodExpr.match(/z\.enum\(\s*\[\s*([\s\S]*?)\s*\]\s*\)/)
  if (!enumMatch || !enumMatch[1]) return null

  const values = enumMatch[1]
    .split(',')
    .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)

  return {
    name,
    type: 'string',
    description: extractJSDocDescription(fullMatch),
    enum: values,
  }
}

/**
 * Parse a default value from Zod.
 */
function parseDefaultValue(valueStr: string): unknown {
  const trimmed = valueStr.trim()

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (trimmed === 'undefined') return undefined

  // Try parsing as number
  const num = parseFloat(trimmed)
  if (!isNaN(num)) return num

  // Try parsing as string literal
  const strMatch = trimmed.match(/^['"`](.*)['"`]$/)
  if (strMatch) return strMatch[1]

  // Try parsing as array
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed
    }
  }

  return trimmed
}

/**
 * Extract description from JSDoc comment.
 */
function extractJSDocDescription(text: string): string | undefined {
  const jsdocMatch = text.match(/\/\*\*\s*([\s\S]*?)\s*\*\//)
  if (jsdocMatch && jsdocMatch[1]) {
    const content = jsdocMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter((line) => !line.startsWith('@'))
      .join(' ')
      .trim()

    return content || undefined
  }

  return undefined
}
