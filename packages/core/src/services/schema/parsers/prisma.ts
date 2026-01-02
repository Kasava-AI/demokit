/**
 * Prisma schema parser.
 * Parses Prisma schema files (.prisma) into DemokitSchema.
 *
 * Supports:
 * - model definitions with fields
 * - Field types (String, Int, Float, Boolean, DateTime, etc.)
 * - @id, @unique, @default attributes
 * - @relation for relationships
 * - Optional fields (?)
 * - Array fields ([])
 * - Enums
 * - @map and @@map for custom names
 *
 * Prisma schemas have explicit relationship definitions,
 * providing high-fidelity relationship detection.
 */

import type {
  DemokitSchema,
  DataModel,
  PropertyDef,
  PropertyType,
  Relationship,
} from '../types'
import type { CodebaseFile, ParseSchemaOptions, ParseResult, ParseWarning } from './types'

/**
 * Parse Prisma schema files into DemokitSchema.
 */
export function parsePrisma(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const {
    name = 'Prisma Schema',
    version = '1.0.0',
  } = options

  const models: Record<string, DataModel> = {}
  const relationships: Relationship[] = []
  const warnings: ParseWarning[] = []
  const parsedFiles: string[] = []

  for (const file of files) {
    if (!file.path.endsWith('.prisma')) {
      continue
    }

    try {
      const { parsedModels, parsedRelations, parsedEnums } = parsePrismaFile(
        file.content,
        file.path,
        warnings
      )

      for (const model of parsedModels) {
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

      for (const enumModel of parsedEnums) {
        if (models[enumModel.name]) {
          warnings.push({
            code: 'DUPLICATE_ENUM',
            message: `Enum "${enumModel.name}" already exists, skipping duplicate from ${file.path}`,
            file: file.path,
          })
        } else {
          models[enumModel.name] = enumModel
        }
      }

      relationships.push(...parsedRelations)
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
      description: 'Schema parsed from Prisma schema files',
    },
    endpoints: [],
    models,
    relationships,
  }

  return {
    schema,
    format: 'prisma',
    warnings,
    parsedFiles,
  }
}

/**
 * Parse a single Prisma schema file.
 */
function parsePrismaFile(
  content: string,
  filePath: string,
  warnings: ParseWarning[]
): { parsedModels: DataModel[]; parsedRelations: Relationship[]; parsedEnums: DataModel[] } {
  const parsedModels: DataModel[] = []
  const parsedRelations: Relationship[] = []
  const parsedEnums: DataModel[] = []

  // Remove comments for easier parsing
  const cleanContent = removeComments(content)

  // Parse enums first (they may be referenced by models)
  const enumMatches = cleanContent.matchAll(
    /enum\s+(\w+)\s*\{([^}]*)\}/g
  )

  for (const match of enumMatches) {
    const [, enumName, enumBody] = match

    // Skip if match groups are undefined
    if (!enumName || !enumBody) continue

    const values = enumBody
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'))

    parsedEnums.push({
      name: enumName,
      type: 'string',
      enum: values,
    })
  }

  // Parse model definitions
  const modelMatches = cleanContent.matchAll(
    /model\s+(\w+)\s*\{([^}]*)\}/g
  )

  for (const match of modelMatches) {
    const [, modelName, modelBody] = match

    // Skip if match groups are undefined
    if (!modelName || !modelBody) continue

    try {
      const { properties, required, relations } = parseModelBody(
        modelBody,
        modelName
      )

      parsedModels.push({
        name: modelName,
        type: 'object',
        properties,
        required,
      })

      parsedRelations.push(...relations)
    } catch (error) {
      warnings.push({
        code: 'MODEL_PARSE_ERROR',
        message: `Could not parse model "${modelName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: filePath,
      })
    }
  }

  return { parsedModels, parsedRelations, parsedEnums }
}

/**
 * Parse the body of a Prisma model definition.
 */
function parseModelBody(
  body: string,
  modelName: string
): { properties: Record<string, PropertyDef>; required: string[]; relations: Relationship[] } {
  const properties: Record<string, PropertyDef> = {}
  const required: string[] = []
  const relations: Relationship[] = []

  const lines = body.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines, comments, and model-level attributes
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) {
      continue
    }

    // Parse field: fieldName Type @attributes
    const fieldMatch = trimmed.match(
      /^(\w+)\s+([\w\[\]?]+)(?:\s+(.*))?$/
    )

    if (!fieldMatch) {
      continue
    }

    const [, fieldName, fieldType, attributes = ''] = fieldMatch

    // Skip if required match groups are undefined
    if (!fieldName || !fieldType) continue

    // Skip relation fields (they reference other models)
    const isRelationField = isRelationType(fieldType)

    if (isRelationField) {
      // Parse the @relation attribute for relationship info
      const relationMatch = attributes.match(
        /@relation\(\s*(?:name:\s*["'](\w+)["'],?\s*)?(?:fields:\s*\[([^\]]+)\],?\s*)?(?:references:\s*\[([^\]]+)\],?\s*)?\)/
      )

      if (relationMatch) {
        const [, , fields, references] = relationMatch
        const fromField = fields?.trim() || fieldName
        const toField = references?.trim() || 'id'
        const targetModel = fieldType.replace(/[\[\]?]/g, '')

        relations.push({
          from: {
            model: modelName,
            field: fromField,
          },
          to: {
            model: targetModel,
            field: toField,
          },
          type: fieldType.includes('[]') ? 'one-to-many' : 'many-to-one',
          required: !fieldType.includes('?') && !fieldType.includes('[]'),
          detectedBy: 'explicit-ref',
        })
      }

      continue // Don't add relation fields to properties
    }

    // Parse the field
    const { type, format, nullable, isRequired, defaultValue, enumValues } =
      parseFieldType(fieldType, attributes)

    properties[fieldName] = {
      name: fieldName,
      type,
      format,
      required: isRequired,
      nullable,
      default: defaultValue,
      enum: enumValues,
    }

    if (isRequired) {
      required.push(fieldName)
    }
  }

  return { properties, required, relations }
}

/**
 * Parse a Prisma field type and attributes.
 */
function parseFieldType(
  fieldType: string,
  attributes: string
): {
  type: PropertyType
  format?: string
  nullable: boolean
  isRequired: boolean
  defaultValue?: unknown
  enumValues?: unknown[]
} {
  let type: PropertyType = 'string'
  let format: string | undefined
  let nullable = false
  let isRequired = true
  let defaultValue: unknown
  const enumValues: unknown[] | undefined = undefined

  // Check for optional (?)
  if (fieldType.endsWith('?')) {
    nullable = true
    isRequired = false
  }

  // Check for array ([])
  const isArray = fieldType.includes('[]')

  // Get base type (remove ? and [])
  const baseType = fieldType.replace(/[\[\]?]/g, '')

  // Map Prisma types to PropertyType
  switch (baseType) {
    case 'String':
      type = 'string'
      break
    case 'Int':
    case 'BigInt':
      type = 'integer'
      break
    case 'Float':
    case 'Decimal':
      type = 'number'
      break
    case 'Boolean':
      type = 'boolean'
      break
    case 'DateTime':
      type = 'string'
      format = 'date-time'
      break
    case 'Json':
      type = 'object'
      break
    case 'Bytes':
      type = 'string'
      format = 'byte'
      break
    default:
      // Could be an enum or custom type
      type = 'string'
      format = `ref:${baseType}`
  }

  // If array, wrap type
  if (isArray) {
    type = 'array'
  }

  // Parse attributes
  if (attributes.includes('@id')) {
    isRequired = true
    nullable = false
  }

  // Parse @default
  const defaultMatch = attributes.match(/@default\(([^)]+)\)/)
  if (defaultMatch && defaultMatch[1]) {
    const defaultStr = defaultMatch[1].trim()

    if (defaultStr === 'autoincrement()') {
      // Auto-generated
      defaultValue = undefined
    } else if (defaultStr === 'now()') {
      // Current timestamp
      defaultValue = undefined
    } else if (defaultStr === 'uuid()' || defaultStr === 'cuid()') {
      // Generated ID
      defaultValue = undefined
    } else if (defaultStr === 'true') {
      defaultValue = true
    } else if (defaultStr === 'false') {
      defaultValue = false
    } else if (/^-?\d+(\.\d+)?$/.test(defaultStr)) {
      defaultValue = parseFloat(defaultStr)
    } else if (defaultStr.startsWith('"') || defaultStr.startsWith("'")) {
      defaultValue = defaultStr.slice(1, -1)
    } else {
      // Could be an enum value
      defaultValue = defaultStr
    }
  }

  return { type, format, nullable, isRequired, defaultValue, enumValues }
}

/**
 * Check if a type is a relation to another model.
 * Relation fields are PascalCase and may have [] or ?.
 */
function isRelationType(type: string): boolean {
  const baseType = type.replace(/[\[\]?]/g, '')

  // Prisma types are PascalCase
  if (!/^[A-Z]/.test(baseType)) {
    return false
  }

  // Built-in Prisma types
  const builtInTypes = [
    'String', 'Int', 'Float', 'Boolean', 'DateTime',
    'Json', 'Bytes', 'BigInt', 'Decimal', 'Unsupported',
  ]

  return !builtInTypes.includes(baseType)
}

/**
 * Remove comments from Prisma schema content.
 */
function removeComments(content: string): string {
  // Remove single-line comments
  let result = content.replace(/\/\/[^\n]*/g, '')

  // Remove multi-line comments (Prisma uses /// for doc comments)
  result = result.replace(/\/\*[\s\S]*?\*\//g, '')

  return result
}
