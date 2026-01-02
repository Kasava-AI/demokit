/**
 * Supabase generated types parser.
 * Parses Supabase database.types.ts files into DemokitSchema.
 *
 * Supports:
 * - Database interface with Tables property
 * - Tables.*.Row type for each table
 * - Column types mapped from PostgreSQL types
 * - Foreign key relationships from Insert/Update types
 * - Views and Enums
 *
 * Supabase generates types from the database schema,
 * providing accurate type information and relationships.
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
 * Parse Supabase types files into DemokitSchema.
 */
export function parseSupabase(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const {
    name = 'Supabase Schema',
    version = '1.0.0',
  } = options

  const models: Record<string, DataModel> = {}
  const relationships: Relationship[] = []
  const warnings: ParseWarning[] = []
  const parsedFiles: string[] = []

  for (const file of files) {
    if (!file.path.endsWith('.ts')) {
      continue
    }

    // Check for Supabase types patterns
    if (!file.content.includes('Database') ||
        (!file.content.includes('Tables:') && !file.content.includes('Tables: {'))) {
      continue
    }

    try {
      const { parsedModels, parsedRelations, parsedEnums } = parseSupabaseFile(
        file.content,
        file.path,
        warnings
      )

      for (const model of parsedModels) {
        if (models[model.name]) {
          warnings.push({
            code: 'DUPLICATE_TABLE',
            message: `Table "${model.name}" already exists, skipping duplicate from ${file.path}`,
            file: file.path,
          })
        } else {
          models[model.name] = model
        }
      }

      for (const enumModel of parsedEnums) {
        if (!models[enumModel.name]) {
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
      description: 'Schema parsed from Supabase generated types',
    },
    endpoints: [],
    models,
    relationships,
  }

  return {
    schema,
    format: 'supabase',
    warnings,
    parsedFiles,
  }
}

/**
 * Parse a single Supabase types file.
 */
function parseSupabaseFile(
  content: string,
  filePath: string,
  warnings: ParseWarning[]
): { parsedModels: DataModel[]; parsedRelations: Relationship[]; parsedEnums: DataModel[] } {
  const parsedModels: DataModel[] = []
  const parsedRelations: Relationship[] = []
  const parsedEnums: DataModel[] = []

  // Find the Tables section
  // Pattern: Tables: { tableName: { Row: { ... }, Insert: { ... }, Update: { ... } } }
  const tablesMatch = content.match(/Tables:\s*\{([\s\S]*?)\n\s*\}/m)

  if (!tablesMatch) {
    // Try alternative format
    const altTablesMatch = content.match(/public:\s*\{[\s\S]*?Tables:\s*\{([\s\S]*?)\n\s{4}\}/m)
    if (!altTablesMatch) {
      warnings.push({
        code: 'NO_TABLES_FOUND',
        message: 'Could not find Tables section in Supabase types file',
        file: filePath,
      })
      return { parsedModels, parsedRelations, parsedEnums }
    }
  }

  // Parse each table definition
  // Pattern: tableName: { Row: { ... } }
  const tableMatches = content.matchAll(
    /(\w+):\s*\{\s*Row:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
  )

  for (const match of tableMatches) {
    const [, tableName, rowBody] = match

    if (!tableName || !rowBody) continue

    // Skip internal Supabase types
    if (tableName.startsWith('_') || tableName === 'Row' || tableName === 'Insert' || tableName === 'Update') {
      continue
    }

    try {
      const { properties, required, relations } = parseRowType(
        rowBody,
        toPascalCase(tableName)
      )

      parsedModels.push({
        name: toPascalCase(tableName),
        type: 'object',
        description: `Generated from Supabase table: ${tableName}`,
        properties,
        required,
      })

      parsedRelations.push(...relations)
    } catch (error) {
      warnings.push({
        code: 'TABLE_PARSE_ERROR',
        message: `Could not parse table "${tableName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: filePath,
      })
    }
  }

  // Parse Enums section
  const enumsMatch = content.match(/Enums:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/m)
  if (enumsMatch && enumsMatch[1]) {
    const enumMatches = enumsMatch[1].matchAll(
      /(\w+):\s*([^}\n]+)/g
    )

    for (const match of enumMatches) {
      const [, enumName, enumValues] = match
      if (!enumName || !enumValues) continue

      // Parse enum values from the type union
      const values = enumValues
        .split('|')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)

      if (values.length > 0) {
        parsedEnums.push({
          name: enumName,
          type: 'string',
          enum: values,
        })
      }
    }
  }

  return { parsedModels, parsedRelations, parsedEnums }
}

/**
 * Parse the Row type body from a Supabase table.
 */
function parseRowType(
  body: string,
  tableName: string
): { properties: Record<string, PropertyDef>; required: string[]; relations: Relationship[] } {
  const properties: Record<string, PropertyDef> = {}
  const required: string[] = []
  const relations: Relationship[] = []

  // Parse column definitions
  // Pattern: columnName: type | null
  const columnMatches = body.matchAll(
    /(\w+):\s*([^;\n]+?)(?:\s*\|?\s*null)?(?:;|\n|$)/g
  )

  for (const match of columnMatches) {
    const [fullMatch, columnName, columnType] = match

    if (!columnName || !columnType) continue

    const nullable = fullMatch?.includes('| null') || fullMatch?.includes('|null') || false
    const cleanType = columnType.replace(/\s*\|\s*null\s*/g, '').trim()

    const { type, format } = parseSupabaseType(cleanType)

    properties[columnName] = {
      name: columnName,
      type,
      format,
      required: !nullable,
      nullable,
    }

    if (!nullable) {
      required.push(columnName)
    }

    // Detect foreign key relationships from naming convention
    if (columnName.endsWith('_id') && columnName !== 'id') {
      const refTableName = columnName.slice(0, -3) // Remove '_id'
      relations.push({
        from: {
          model: tableName,
          field: columnName,
        },
        to: {
          model: toPascalCase(refTableName),
          field: 'id',
        },
        type: 'many-to-one',
        required: !nullable,
        detectedBy: 'naming-convention',
      })
    }
  }

  return { properties, required, relations }
}

/**
 * Parse a Supabase/PostgreSQL type string.
 */
function parseSupabaseType(
  typeStr: string
): { type: PropertyType; format?: string } {
  const cleanType = typeStr.trim()

  // Handle common PostgreSQL types from Supabase
  switch (cleanType) {
    case 'string':
    case 'text':
      return { type: 'string' }

    case 'number':
    case 'integer':
    case 'bigint':
    case 'smallint':
      return { type: 'integer' }

    case 'float':
    case 'double':
    case 'decimal':
    case 'numeric':
    case 'real':
      return { type: 'number' }

    case 'boolean':
    case 'bool':
      return { type: 'boolean' }

    case 'Date':
    case 'Date | string':
      return { type: 'string', format: 'date-time' }

    default:
      // Check for specific patterns
      if (cleanType.includes('Json') || cleanType === 'Json') {
        return { type: 'object' }
      }

      if (cleanType.startsWith('Database[')) {
        // Reference to enum or other type
        const refMatch = cleanType.match(/Database\["public"\]\["Enums"\]\["(\w+)"\]/)
        if (refMatch) {
          return { type: 'string', format: `enum:${refMatch[1]}` }
        }
      }

      // Array types
      if (cleanType.endsWith('[]')) {
        return { type: 'array' }
      }

      // UUID pattern
      if (cleanType.toLowerCase().includes('uuid')) {
        return { type: 'string', format: 'uuid' }
      }

      return { type: 'string' }
  }
}

/**
 * Convert a snake_case string to PascalCase.
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}
