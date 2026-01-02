/**
 * Output Formatters
 *
 * Convert generated demo data into various output formats for different use cases:
 *
 * - **TypeScript**: Type-safe fixture files with const assertions
 * - **JSON**: Standard data interchange format with optional metadata
 * - **SQL**: INSERT statements for database seeding
 * - **CSV**: Spreadsheet-compatible format for individual models
 *
 * Each formatter handles:
 * - Proper escaping for the target format
 * - Optional headers/metadata
 * - Null and special value handling
 * - Nested objects and arrays
 *
 * @example
 * ```typescript
 * // Generate TypeScript fixtures
 * const tsCode = formatAsTypeScript(data, { asConst: true })
 *
 * // Generate JSON with metadata
 * const json = formatAsJSON(data, { includeMetadata: true })
 *
 * // Generate SQL INSERT statements
 * const sql = formatAsSQL(data, { tableName: name => `tbl_${name}` })
 *
 * // Generate CSV for a specific model
 * const csv = formatAsCSV(data, 'Customer')
 * ```
 *
 * @module
 */

import type { DemoData, DemoNarrative } from '../types'

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Output format options for TypeScript generation
 *
 * Controls the generated TypeScript code structure and styling.
 *
 * @example
 * ```typescript
 * const options: OutputOptions = {
 *   asConst: true,           // Add 'as const' for type safety
 *   indent: 2,               // 2-space indentation
 *   includeHeader: true,     // Add generation comment
 *   narrative: myNarrative,  // Include narrative in header
 * }
 * ```
 */
export interface OutputOptions {
  /** Whether to include TypeScript 'as const' assertions. Defaults to true. */
  asConst?: boolean

  /** Whether to include type annotations (future use). */
  includeTypes?: boolean

  /** Indentation in spaces. Defaults to 2. */
  indent?: number

  /** Whether to add a comment header with generation info. Defaults to true. */
  includeHeader?: boolean

  /** Narrative for header comments (scenario, key points). */
  narrative?: DemoNarrative
}

// ============================================================================
// TypeScript Formatter
// ============================================================================

/**
 * Format demo data as TypeScript code
 *
 * Generates a TypeScript module with:
 * - Header comment with generation timestamp
 * - Optional narrative info (scenario, key points)
 * - Individual exports per model (DEMO_USER, DEMO_ORDER, etc.)
 * - Combined DEMO_DATA export with all models
 * - 'as const' assertions for full type inference
 *
 * Model names are converted to CONSTANT_CASE for variable names.
 *
 * @param data - Demo data object (model names → record arrays)
 * @param options - Formatting options (asConst, indent, header, narrative)
 * @returns TypeScript source code as string
 *
 * @example
 * ```typescript
 * const data = {
 *   User: [{ id: '1', name: 'Alice' }],
 *   Order: [{ id: '1', userId: '1', total: 100 }],
 * }
 *
 * const code = formatAsTypeScript(data, {
 *   asConst: true,
 *   narrative: { scenario: 'Demo', keyPoints: ['Show users'] },
 * })
 *
 * // Output:
 * // /**
 * //  * Auto-generated demo fixtures
 * //  * Scenario: Demo
 * //  * Key points:
 * //  * - Show users
 * //  *‍/
 * // export const DEMO_USER = [...] as const
 * // export const DEMO_ORDER = [...] as const
 * // export const DEMO_DATA = { User: DEMO_USER, Order: DEMO_ORDER } as const
 * ```
 */
export function formatAsTypeScript(
  data: DemoData,
  options: OutputOptions = {}
): string {
  const {
    asConst = true,
    indent = 2,
    includeHeader = true,
    narrative,
  } = options

  const lines: string[] = []

  // -------------------------------------------------------------------------
  // Header Comment: Generation info and optional narrative
  // -------------------------------------------------------------------------
  if (includeHeader) {
    lines.push('/**')
    lines.push(' * Auto-generated demo fixtures')
    lines.push(` * Generated at: ${new Date().toISOString()}`)

    // Include narrative info if provided
    if (narrative) {
      lines.push(' *')
      lines.push(` * Scenario: ${narrative.scenario}`)
      if (narrative.keyPoints.length > 0) {
        lines.push(' *')
        lines.push(' * Key points:')
        for (const point of narrative.keyPoints) {
          lines.push(` * - ${point}`)
        }
      }
    }

    lines.push(' */')
    lines.push('')
  }

  // -------------------------------------------------------------------------
  // Individual Model Exports: DEMO_USER, DEMO_ORDER, etc.
  // -------------------------------------------------------------------------
  for (const [modelName, records] of Object.entries(data)) {
    // Convert model name to CONSTANT_CASE (e.g., UserProfile → USER_PROFILE)
    const varName = `DEMO_${toConstantCase(modelName)}`

    // Serialize with proper indentation
    const jsonData = JSON.stringify(records, null, indent)

    // Add 'as const' for full type inference if enabled
    const constAssertion = asConst ? ' as const' : ''

    lines.push(`export const ${varName} = ${jsonData}${constAssertion}`)
    lines.push('')
  }

  // -------------------------------------------------------------------------
  // Combined Export: DEMO_DATA with all models
  // -------------------------------------------------------------------------
  const modelNames = Object.keys(data)
  if (modelNames.length > 0) {
    const constAssertion = asConst ? ' as const' : ''
    lines.push('export const DEMO_DATA = {')
    for (const name of modelNames) {
      lines.push(`  ${name}: DEMO_${toConstantCase(name)},`)
    }
    lines.push(`}${constAssertion}`)
  }

  return lines.join('\n')
}

// ============================================================================
// JSON Formatter
// ============================================================================

/**
 * Format demo data as JSON
 *
 * Generates standard JSON output with optional metadata wrapper.
 *
 * Without metadata:
 * ```json
 * { "User": [...], "Order": [...] }
 * ```
 *
 * With metadata:
 * ```json
 * {
 *   "_metadata": { "generatedAt": "...", "modelCount": 2, "recordCount": 10 },
 *   "data": { "User": [...], "Order": [...] }
 * }
 * ```
 *
 * @param data - Demo data object (model names → record arrays)
 * @param options - Formatting options (indent, includeMetadata)
 * @returns JSON string
 *
 * @example
 * ```typescript
 * // Simple JSON output
 * const json = formatAsJSON(data)
 *
 * // JSON with metadata
 * const jsonWithMeta = formatAsJSON(data, { includeMetadata: true })
 * ```
 */
export function formatAsJSON(
  data: DemoData,
  options: { indent?: number; includeMetadata?: boolean } = {}
): string {
  const { indent = 2, includeMetadata = false } = options

  // -------------------------------------------------------------------------
  // With Metadata: Wrap data in envelope with generation info
  // -------------------------------------------------------------------------
  if (includeMetadata) {
    return JSON.stringify(
      {
        _metadata: {
          generatedAt: new Date().toISOString(),
          modelCount: Object.keys(data).length,
          recordCount: Object.values(data).reduce((sum, arr) => sum + arr.length, 0),
        },
        data,
      },
      null,
      indent
    )
  }

  // -------------------------------------------------------------------------
  // Simple: Just the data object
  // -------------------------------------------------------------------------
  return JSON.stringify(data, null, indent)
}

// ============================================================================
// SQL Formatter
// ============================================================================

/**
 * Format demo data as SQL INSERT statements
 *
 * Generates INSERT statements for database seeding. Handles:
 * - Automatic table name conversion (snake_case by default)
 * - Proper value escaping (strings, nulls, numbers, booleans)
 * - JSON serialization for arrays and objects
 * - Comment headers with record counts
 *
 * @param data - Demo data object (model names → record arrays)
 * @param options - Formatting options (tableName function)
 * @returns SQL INSERT statements as string
 *
 * @example
 * ```typescript
 * const sql = formatAsSQL(data)
 * // Output:
 * // -- Auto-generated demo data
 * // -- User (5 records)
 * // INSERT INTO user (id, name, email) VALUES ('1', 'Alice', 'alice@example.com');
 *
 * // Custom table names
 * const sql = formatAsSQL(data, {
 *   tableName: name => `demo_${name.toLowerCase()}`
 * })
 * ```
 */
export function formatAsSQL(
  data: DemoData,
  options: { tableName?: (modelName: string) => string } = {}
): string {
  // Default table name: convert PascalCase to snake_case
  const { tableName = (name) => toSnakeCase(name) } = options

  // -------------------------------------------------------------------------
  // Header: Generation timestamp
  // -------------------------------------------------------------------------
  const lines: string[] = [
    '-- Auto-generated demo data',
    `-- Generated at: ${new Date().toISOString()}`,
    '',
  ]

  // -------------------------------------------------------------------------
  // Generate INSERT statements for each model
  // -------------------------------------------------------------------------
  for (const [modelName, records] of Object.entries(data)) {
    // Skip empty model arrays
    if (records.length === 0) continue

    // Convert model name to table name
    const table = tableName(modelName)

    // Add comment with record count
    lines.push(`-- ${modelName} (${records.length} records)`)

    // Generate INSERT for each record
    for (const record of records) {
      const columns = Object.keys(record)
      const values = Object.values(record).map(formatSQLValue)

      lines.push(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`
      )
    }

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format a single value for SQL INSERT statement
 *
 * Handles:
 * - null/undefined → NULL
 * - strings → 'escaped string' (single quotes escaped as '')
 * - numbers/booleans → raw value
 * - arrays/objects → JSON string (escaped)
 *
 * @param value - Value to format
 * @returns SQL-safe value string
 *
 * @example
 * formatSQLValue(null)           // 'NULL'
 * formatSQLValue('hello')        // "'hello'"
 * formatSQLValue("it's")         // "'it''s'"
 * formatSQLValue(42)             // '42'
 * formatSQLValue([1, 2])         // "'[1,2]'"
 */
function formatSQLValue(value: unknown): string {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return 'NULL'
  }

  // Handle strings: escape single quotes by doubling them
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`
  }

  // Handle numbers and booleans: use raw value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  // Handle arrays and objects: serialize to JSON, then escape
  if (Array.isArray(value) || typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`
  }

  // Fallback for unexpected types
  return 'NULL'
}

// ============================================================================
// CSV Formatter
// ============================================================================

/**
 * Format demo data as CSV (one model at a time)
 *
 * Generates RFC 4180-compliant CSV with:
 * - Header row with all column names
 * - Proper escaping (commas, quotes, newlines)
 * - Unified columns from all records (handles sparse data)
 * - JSON serialization for complex values
 *
 * Note: CSV format only supports a single model at a time.
 * For multiple models, call this function once per model.
 *
 * @param data - Demo data object (model names → record arrays)
 * @param modelName - Name of the model to export
 * @returns CSV string (empty string if model not found or empty)
 *
 * @example
 * ```typescript
 * const userCsv = formatAsCSV(data, 'User')
 * // Output:
 * // id,name,email
 * // 1,Alice,alice@example.com
 * // 2,Bob,bob@example.com
 *
 * // Export each model to separate files
 * for (const model of Object.keys(data)) {
 *   const csv = formatAsCSV(data, model)
 *   writeFileSync(`${model}.csv`, csv)
 * }
 * ```
 */
export function formatAsCSV(
  data: DemoData,
  modelName: string
): string {
  const records = data[modelName]

  // Return empty string for missing or empty models
  if (!records || records.length === 0) {
    return ''
  }

  // -------------------------------------------------------------------------
  // Collect all unique column names from all records
  // This handles sparse data where not all records have all fields
  // -------------------------------------------------------------------------
  const columns = new Set<string>()
  for (const record of records) {
    for (const key of Object.keys(record)) {
      columns.add(key)
    }
  }

  const columnList = Array.from(columns)

  // -------------------------------------------------------------------------
  // Header Row: Column names (escaped if necessary)
  // -------------------------------------------------------------------------
  const lines: string[] = [columnList.map(escapeCSV).join(',')]

  // -------------------------------------------------------------------------
  // Data Rows: Values for each record
  // -------------------------------------------------------------------------
  for (const record of records) {
    const values = columnList.map(col => {
      const value = record[col]
      // Format value first (handles complex types), then escape for CSV
      return escapeCSV(formatCSVValue(value))
    })
    lines.push(values.join(','))
  }

  return lines.join('\n')
}

/**
 * Escape a string value for CSV
 *
 * Per RFC 4180, values containing commas, quotes, or newlines
 * must be wrapped in double quotes, with internal quotes doubled.
 *
 * @param value - String to escape
 * @returns CSV-safe string
 *
 * @example
 * escapeCSV('hello')           // 'hello'
 * escapeCSV('hello, world')    // '"hello, world"'
 * escapeCSV('say "hi"')        // '"say ""hi"""'
 * escapeCSV('line1\nline2')    // '"line1\nline2"'
 */
function escapeCSV(value: string): string {
  // Check if escaping is needed (contains special characters)
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Wrap in double quotes, escape internal quotes by doubling
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Format a value for CSV output
 *
 * Converts values to string representation:
 * - null/undefined → empty string
 * - strings → as-is
 * - numbers/booleans → string representation
 * - arrays/objects → JSON string
 *
 * @param value - Value to format
 * @returns String representation for CSV
 *
 * @example
 * formatCSVValue(null)        // ''
 * formatCSVValue('hello')     // 'hello'
 * formatCSVValue(42)          // '42'
 * formatCSVValue([1, 2])      // '["a","b"]'
 */
function formatCSVValue(value: unknown): string {
  // Handle null and undefined as empty strings
  if (value === null || value === undefined) {
    return ''
  }

  // Strings pass through directly
  if (typeof value === 'string') {
    return value
  }

  // Numbers and booleans convert to string
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  // Arrays and objects serialize to JSON
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value)
  }

  // Fallback for unexpected types
  return ''
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a name to CONSTANT_CASE
 *
 * Transforms camelCase or PascalCase to SCREAMING_SNAKE_CASE.
 * Used for generating TypeScript constant names.
 *
 * @param name - Input name (e.g., "CustomerOrder", "userId")
 * @returns CONSTANT_CASE name (e.g., "CUSTOMER_ORDER", "USER_ID")
 *
 * @example
 * toConstantCase('CustomerOrder')  // 'CUSTOMER_ORDER'
 * toConstantCase('userId')         // 'USER_ID'
 * toConstantCase('APIKey')         // 'API_KEY'
 */
function toConstantCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Insert underscore between lower→upper
    .replace(/[^a-zA-Z0-9]/g, '_')       // Replace non-alphanumeric with underscore
    .toUpperCase()
}

/**
 * Convert a name to snake_case
 *
 * Transforms camelCase or PascalCase to lowercase_snake_case.
 * Used for generating SQL table names.
 *
 * @param name - Input name (e.g., "CustomerOrder", "UserId")
 * @returns snake_case name (e.g., "customer_order", "user_id")
 *
 * @example
 * toSnakeCase('CustomerOrder')  // 'customer_order'
 * toSnakeCase('UserId')         // 'user_id'
 * toSnakeCase('APIKey')         // 'api_key'
 */
function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Insert underscore between lower→upper
    .replace(/[^a-zA-Z0-9]/g, '_')       // Replace non-alphanumeric with underscore
    .toLowerCase()
}
