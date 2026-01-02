/**
 * TypeScript interface/type parser.
 * Parses TypeScript interface and type declarations into DemokitSchema.
 *
 * Supports:
 * - interface declarations
 * - type aliases (object types)
 * - enum declarations
 * - Generic types (partial support)
 * - Union/intersection types (partial support)
 * - Array types
 * - Optional properties
 * - JSDoc comments for descriptions
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
 * Parse TypeScript files containing interface/type definitions.
 */
export function parseTypeScript(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const {
    name = 'TypeScript Schema',
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

    try {
      const fileModels = parseTypeScriptFile(file.content, file.path, warnings)
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
      description: 'Schema parsed from TypeScript types',
    },
    endpoints: [], // TypeScript types don't define endpoints
    models,
    relationships,
  }

  return {
    schema,
    format: 'typescript',
    warnings,
    parsedFiles,
  }
}

/**
 * Parse a single TypeScript file.
 */
function parseTypeScriptFile(
  content: string,
  filePath: string,
  warnings: ParseWarning[]
): DataModel[] {
  const models: DataModel[] = []

  // Parse interfaces
  const interfaceMatches = content.matchAll(
    /(?:\/\*\*[\s\S]*?\*\/\s*)?(export\s+)?interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?\s*\{([^}]*)\}/g
  )

  for (const match of interfaceMatches) {
    const [fullMatch, , name, body] = match

    // Skip if match groups are undefined
    if (!name || !body) continue

    const description = extractJSDocDescription(fullMatch || '')
    const properties = parseInterfaceBody(body, filePath, warnings)

    models.push({
      name,
      type: 'object',
      description,
      properties,
      required: Object.entries(properties)
        .filter(([, prop]) => prop.required)
        .map(([name]) => name),
    })
  }

  // Parse type aliases (object types only)
  const typeMatches = content.matchAll(
    /(?:\/\*\*[\s\S]*?\*\/\s*)?(export\s+)?type\s+(\w+)\s*=\s*\{([^}]*)\}/g
  )

  for (const match of typeMatches) {
    const [fullMatch, , name, body] = match

    // Skip if match groups are undefined
    if (!name || !body) continue

    const description = extractJSDocDescription(fullMatch || '')
    const properties = parseInterfaceBody(body, filePath, warnings)

    models.push({
      name,
      type: 'object',
      description,
      properties,
      required: Object.entries(properties)
        .filter(([, prop]) => prop.required)
        .map(([name]) => name),
    })
  }

  // Parse enums
  const enumMatches = content.matchAll(
    /(?:\/\*\*[\s\S]*?\*\/\s*)?(export\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g
  )

  for (const match of enumMatches) {
    const [fullMatch, , name, body] = match

    // Skip if match groups are undefined
    if (!name || !body) continue

    const description = extractJSDocDescription(fullMatch || '')
    const enumValues = parseEnumBody(body)

    models.push({
      name,
      type: 'string',
      description,
      enum: enumValues,
    })
  }

  return models
}

/**
 * Parse the body of an interface or type object.
 */
function parseInterfaceBody(
  body: string,
  filePath: string,
  warnings: ParseWarning[]
): Record<string, PropertyDef> {
  const properties: Record<string, PropertyDef> = {}

  // Match property lines: name?: Type; or name: Type;
  // Also captures JSDoc comments before properties
  const lines = body.split('\n')
  let currentJSDoc = ''

  for (const line of lines) {
    const trimmed = line.trim()

    // Collect JSDoc comments
    if (trimmed.startsWith('/**') || trimmed.startsWith('*') || trimmed.startsWith('//')) {
      currentJSDoc += trimmed + '\n'
      continue
    }

    // Match property declaration
    const propMatch = trimmed.match(
      /^(\w+)(\?)?:\s*(.+?)\s*;?\s*$/
    )

    if (propMatch) {
      const [, propName, optional, typeStr] = propMatch

      // Skip if match groups are undefined
      if (!propName || !typeStr) continue

      const isRequired = !optional

      try {
        const { type, format, items, enumValues, nullable } = parseTypeString(typeStr)

        properties[propName] = {
          name: propName,
          type,
          required: isRequired,
          nullable,
          description: extractJSDocDescription(currentJSDoc),
          format,
          items,
          enum: enumValues,
        }
      } catch (error) {
        warnings.push({
          code: 'PROPERTY_PARSE_ERROR',
          message: `Could not parse property "${propName}": ${typeStr}`,
          file: filePath,
        })
      }

      currentJSDoc = ''
    }
  }

  return properties
}

/**
 * Parse a TypeScript type string into PropertyDef fields.
 */
function parseTypeString(typeStr: string): {
  type: PropertyType
  format?: string
  items?: { $ref: string } | DataModel
  enumValues?: unknown[]
  nullable: boolean
} {
  const trimmed = typeStr.trim()

  // Handle nullable types (Type | null or Type | undefined)
  const nullable = /\|\s*(null|undefined)/.test(trimmed)
  const withoutNull = trimmed.replace(/\|\s*(null|undefined)/g, '').trim()

  // Handle array types: Type[] or Array<Type>
  const arrayMatch = withoutNull.match(/^(.+)\[\]$/) || withoutNull.match(/^Array<(.+)>$/)
  if (arrayMatch && arrayMatch[1]) {
    const innerType = arrayMatch[1].trim()
    const { type: itemType } = parseTypeString(innerType)

    // If the inner type looks like a model reference (PascalCase), use $ref
    if (isPascalCase(innerType) && !isPrimitiveType(innerType)) {
      return {
        type: 'array',
        items: { $ref: innerType },
        nullable,
      }
    }

    return {
      type: 'array',
      items: {
        name: 'items',
        type: itemType,
        properties: {},
      },
      nullable,
    }
  }

  // Handle string literal unions as enums
  const stringLiteralMatch = withoutNull.match(/^(['"][^'"]+['"]\s*\|\s*)+['"][^'"]+['"]$/)
  if (stringLiteralMatch) {
    const values = withoutNull
      .split('|')
      .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))

    return {
      type: 'string',
      enumValues: values,
      nullable,
    }
  }

  // Handle primitive types
  const primitiveMap: Record<string, { type: PropertyType; format?: string }> = {
    string: { type: 'string' },
    number: { type: 'number' },
    boolean: { type: 'boolean' },
    bigint: { type: 'integer' },
    Date: { type: 'string', format: 'date-time' },
    // Common utility types
    uuid: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
  }

  const primitive = primitiveMap[withoutNull]
  if (primitive) {
    return { ...primitive, nullable }
  }

  // Handle 'any', 'unknown', 'object' as generic object
  if (['any', 'unknown', 'object', 'Record<string, unknown>', 'Record<string, any>'].includes(withoutNull)) {
    return { type: 'object', nullable }
  }

  // Handle 'void', 'never', 'undefined' as null
  if (['void', 'never', 'undefined'].includes(withoutNull)) {
    return { type: 'null', nullable: true }
  }

  // Assume it's a reference to another model (PascalCase identifier)
  if (isPascalCase(withoutNull) && /^\w+$/.test(withoutNull)) {
    // Return as object with $ref hint (relationship detection will pick this up)
    return {
      type: 'object',
      format: `ref:${withoutNull}`,
      nullable,
    }
  }

  // Default to string for unknown types
  return { type: 'string', nullable }
}

/**
 * Parse enum body into array of values.
 */
function parseEnumBody(body: string): unknown[] {
  const values: unknown[] = []

  // Match enum members: Name = 'value', Name = 123, or just Name
  const memberMatches = body.matchAll(
    /(\w+)\s*(?:=\s*(['"]([^'"]+)['"]|(\d+)))?\s*,?/g
  )

  for (const match of memberMatches) {
    const [, name, , stringValue, numValue] = match

    if (stringValue !== undefined) {
      values.push(stringValue)
    } else if (numValue !== undefined) {
      values.push(parseInt(numValue, 10))
    } else if (name !== undefined) {
      values.push(name)
    }
  }

  return values
}

/**
 * Extract description from JSDoc comment.
 */
function extractJSDocDescription(text: string): string | undefined {
  // Match /** ... */ comments
  const jsdocMatch = text.match(/\/\*\*\s*([\s\S]*?)\s*\*\//)
  if (jsdocMatch && jsdocMatch[1]) {
    const content = jsdocMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter((line) => !line.startsWith('@')) // Exclude @tags
      .join(' ')
      .trim()

    return content || undefined
  }

  // Match // comments
  const lineCommentMatch = text.match(/\/\/\s*(.+)/)
  if (lineCommentMatch && lineCommentMatch[1]) {
    return lineCommentMatch[1].trim()
  }

  return undefined
}

/**
 * Check if a string is PascalCase (likely a type/interface name).
 */
function isPascalCase(str: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str)
}

/**
 * Check if a type string is a primitive TypeScript type.
 */
function isPrimitiveType(type: string): boolean {
  return ['string', 'number', 'boolean', 'bigint', 'symbol', 'null', 'undefined', 'void', 'never', 'any', 'unknown'].includes(type)
}
