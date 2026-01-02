/**
 * Drizzle ORM schema parser.
 * Parses Drizzle table definitions and relations into DemokitSchema.
 *
 * Supports:
 * - pgTable(), mysqlTable(), sqliteTable() definitions
 * - Column types (text, integer, boolean, uuid, timestamp, etc.)
 * - Primary keys, foreign keys, unique constraints
 * - relations() function for explicit relationships
 * - Default values
 * - Nullable columns
 *
 * This parser extracts high-fidelity relationship information
 * since Drizzle uses explicit relations() declarations.
 */

import type {
  DemokitSchema,
  DataModel,
  PropertyDef,
  PropertyType,
  Relationship,
  RelationshipType,
} from '../types'
import type { CodebaseFile, ParseSchemaOptions, ParseResult, ParseWarning } from './types'
import { detectRelationships } from '../relationships'

/**
 * Parse Drizzle schema files into DemokitSchema.
 */
export function parseDrizzle(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const {
    name = 'Drizzle Schema',
    version = '1.0.0',
    detectRelationships: shouldDetectRelationships = true,
    inferRelationships = true,
  } = options

  const models: Record<string, DataModel> = {}
  const explicitRelationships: Relationship[] = []
  const warnings: ParseWarning[] = []
  const parsedFiles: string[] = []

  for (const file of files) {
    if (!file.path.endsWith('.ts')) {
      continue
    }

    // Check if file contains Drizzle imports
    if (!file.content.includes('drizzle-orm')) {
      continue
    }

    try {
      const { tables, relations } = parseDrizzleFile(file.content, file.path, warnings)

      for (const model of tables) {
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

      explicitRelationships.push(...relations)
      parsedFiles.push(file.path)
    } catch (error) {
      warnings.push({
        code: 'PARSE_ERROR',
        message: `Failed to parse ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: file.path,
      })
    }
  }

  // Combine explicit relationships with inferred ones
  let allRelationships = [...explicitRelationships]

  if (shouldDetectRelationships && inferRelationships) {
    const inferred = detectRelationships(models)
    // Only add inferred relationships that don't conflict with explicit ones
    for (const rel of inferred) {
      const exists = explicitRelationships.some(
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

  const schema: DemokitSchema = {
    info: {
      title: name,
      version,
      description: 'Schema parsed from Drizzle ORM definitions',
    },
    endpoints: [],
    models,
    relationships: allRelationships,
  }

  return {
    schema,
    format: 'drizzle',
    warnings,
    parsedFiles,
  }
}

/**
 * Parse a single Drizzle file.
 */
function parseDrizzleFile(
  content: string,
  filePath: string,
  warnings: ParseWarning[]
): { tables: DataModel[]; relations: Relationship[] } {
  const tables: DataModel[] = []
  const relations: Relationship[] = []

  // Parse table definitions
  // Pattern: export const tableName = pgTable('table_name', { ... })
  const tableMatches = content.matchAll(
    /(?:\/\*\*[\s\S]*?\*\/\s*)?(export\s+)?(?:const|let)\s+(\w+)\s*=\s*(pgTable|mysqlTable|sqliteTable)\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*(?:,\s*\([^)]*\)\s*=>\s*\([\s\S]*?\)\s*)?\)/g
  )

  for (const match of tableMatches) {
    const [fullMatch, , varName, , , columnsBody] = match

    // Skip if required match groups are undefined
    if (!varName || !columnsBody) continue

    const description = extractJSDocDescription(fullMatch || '')

    try {
      const { properties, required } = parseColumnsBody(columnsBody)

      // Use PascalCase version of variable name as model name
      const modelName = toPascalCase(varName)

      tables.push({
        name: modelName,
        type: 'object',
        description,
        properties,
        required,
      })
    } catch (error) {
      warnings.push({
        code: 'TABLE_PARSE_ERROR',
        message: `Could not parse table "${varName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: filePath,
      })
    }
  }

  // Parse relations definitions
  // Pattern: export const tableRelations = relations(table, ({ one, many }) => ({ ... }))
  const relationsMatches = content.matchAll(
    /(?:export\s+)?(?:const|let)\s+(\w+)Relations?\s*=\s*relations\(\s*(\w+)\s*,\s*\(\s*\{\s*([\w,\s]+)\s*\}\s*\)\s*=>\s*\(\s*\{([\s\S]*?)\}\s*\)\s*\)/g
  )

  for (const match of relationsMatches) {
    const [, , sourceTable, , relationsBody] = match

    // Skip if required match groups are undefined
    if (!sourceTable || !relationsBody) continue

    const sourceModel = toPascalCase(sourceTable)

    const parsedRels = parseRelationsBody(relationsBody, sourceModel)
    relations.push(...parsedRels)
  }

  return { tables, relations }
}

/**
 * Parse the columns body of a table definition.
 */
function parseColumnsBody(
  body: string
): { properties: Record<string, PropertyDef>; required: string[] } {
  const properties: Record<string, PropertyDef> = {}
  const required: string[] = []

  // Match column definitions
  // Pattern: columnName: text('column_name').notNull().default(...)
  const columnMatches = body.matchAll(
    /(\w+)\s*:\s*(\w+)\(\s*['"]?(\w+)?['"]?\s*(?:,\s*\{[^}]*\})?\s*\)([\s\S]*?)(?=,\s*\n\s*\w+\s*:|$)/g
  )

  for (const match of columnMatches) {
    const [, propName, columnType, , modifiers] = match

    // Skip if required match groups are undefined
    if (!propName || !columnType) continue

    const { type, format, nullable, isRequired, defaultValue, enumValues } =
      parseColumnType(columnType, modifiers || '')

    properties[propName] = {
      name: propName,
      type,
      format,
      required: isRequired,
      nullable,
      default: defaultValue,
      enum: enumValues,
    }

    if (isRequired) {
      required.push(propName)
    }
  }

  return { properties, required }
}

/**
 * Parse a Drizzle column type and modifiers.
 */
function parseColumnType(
  columnType: string,
  modifiers: string
): {
  type: PropertyType
  format?: string
  nullable: boolean
  isRequired: boolean
  isPrimaryKey: boolean
  defaultValue?: unknown
  enumValues?: unknown[]
} {
  let type: PropertyType = 'string'
  let format: string | undefined
  let nullable = true
  let isRequired = false
  let isPrimaryKey = false
  let defaultValue: unknown
  let enumValues: unknown[] | undefined

  // Parse column type
  switch (columnType.toLowerCase()) {
    case 'text':
    case 'varchar':
    case 'char':
      type = 'string'
      break
    case 'integer':
    case 'int':
    case 'smallint':
    case 'bigint':
    case 'serial':
    case 'smallserial':
    case 'bigserial':
      type = 'integer'
      break
    case 'real':
    case 'doublePrecision':
    case 'double':
    case 'float':
    case 'numeric':
    case 'decimal':
      type = 'number'
      break
    case 'boolean':
      type = 'boolean'
      break
    case 'uuid':
      type = 'string'
      format = 'uuid'
      break
    case 'timestamp':
    case 'timestamptz':
      type = 'string'
      format = 'date-time'
      break
    case 'date':
      type = 'string'
      format = 'date'
      break
    case 'time':
      type = 'string'
      format = 'time'
      break
    case 'json':
    case 'jsonb':
      type = 'object'
      break
    case 'interval':
      type = 'string'
      format = 'duration'
      break
    case 'point':
    case 'line':
    case 'polygon':
    case 'geometry':
    case 'geography':
      type = 'object'
      format = 'geo'
      break
    case 'inet':
    case 'cidr':
    case 'macaddr':
      type = 'string'
      format = 'network'
      break
    case 'bytea':
      type = 'string'
      format = 'byte'
      break
    case 'pgEnum':
    case 'mysqlEnum':
      type = 'string'
      // Try to extract enum values from the call
      const enumMatch = modifiers.match(/\[\s*([\s\S]*?)\s*\]/)
      if (enumMatch && enumMatch[1]) {
        enumValues = enumMatch[1]
          .split(',')
          .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      }
      break
    default:
      type = 'string'
  }

  // Parse modifiers
  if (modifiers.includes('.notNull()')) {
    nullable = false
    isRequired = true
  }

  if (modifiers.includes('.primaryKey()')) {
    isPrimaryKey = true
    isRequired = true
    nullable = false
  }

  if (modifiers.includes('.defaultRandom()')) {
    // UUID default
    defaultValue = undefined // Will be generated
  } else if (modifiers.includes('.defaultNow()')) {
    // Timestamp default
    defaultValue = undefined // Will be current time
  } else {
    // Extract default value
    const defaultMatch = modifiers.match(/\.default\(\s*(.+?)\s*\)/)
    if (defaultMatch && defaultMatch[1]) {
      defaultValue = parseDefaultValue(defaultMatch[1])
    }
  }

  // Check for references (foreign keys)
  if (modifiers.includes('.references(')) {
    const refMatch = modifiers.match(/\.references\(\s*\(\)\s*=>\s*(\w+)\.(\w+)/)
    if (refMatch && refMatch[1]) {
      const refTable = refMatch[1]
      format = `ref:${toPascalCase(refTable)}`
    }
  }

  return { type, format, nullable, isRequired, isPrimaryKey, defaultValue, enumValues }
}

/**
 * Parse the body of a relations() definition.
 */
function parseRelationsBody(
  body: string,
  sourceModel: string
): Relationship[] {
  const relationships: Relationship[] = []

  // Match relation definitions
  // Pattern: relationName: one(targetTable, { fields: [...], references: [...] })
  // or: relationName: many(targetTable)
  const relationMatches = body.matchAll(
    /(\w+)\s*:\s*(one|many)\(\s*(\w+)\s*(?:,\s*\{([\s\S]*?)\}\s*)?\)/g
  )

  for (const match of relationMatches) {
    const [, relationName, relationType, targetTable, options] = match

    // Skip if required match groups are undefined
    if (!relationName || !relationType || !targetTable) continue

    const targetModel = toPascalCase(targetTable)

    let fromField: string = relationName
    let toField: string = 'id'
    const relationshipType: RelationshipType = relationType === 'one' ? 'many-to-one' : 'one-to-many'

    // Parse options if present
    if (options) {
      const fieldsMatch = options.match(/fields\s*:\s*\[\s*(\w+)\.(\w+)\s*\]/)
      if (fieldsMatch && fieldsMatch[2]) {
        fromField = fieldsMatch[2]
      }

      const referencesMatch = options.match(/references\s*:\s*\[\s*(\w+)\.(\w+)\s*\]/)
      if (referencesMatch && referencesMatch[2]) {
        toField = referencesMatch[2]
      }
    }

    relationships.push({
      from: {
        model: sourceModel,
        field: fromField,
      },
      to: {
        model: targetModel,
        field: toField,
      },
      type: relationshipType,
      required: relationType === 'one', // one() relations are typically required
      detectedBy: 'explicit-ref',
    })
  }

  return relationships
}

/**
 * Parse a default value from Drizzle.
 */
function parseDefaultValue(valueStr: string): unknown {
  const trimmed = valueStr.trim()

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null

  const num = parseFloat(trimmed)
  if (!isNaN(num)) return num

  const strMatch = trimmed.match(/^['"`](.*)['"`]$/)
  if (strMatch) return strMatch[1]

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

/**
 * Convert a variable name to PascalCase.
 */
function toPascalCase(str: string): string {
  // Handle snake_case
  if (str.includes('_')) {
    return str
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('')
  }

  // Handle camelCase
  return str.charAt(0).toUpperCase() + str.slice(1)
}
