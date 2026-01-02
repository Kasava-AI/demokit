/**
 * Output Module
 *
 * Provides formatters to convert demo data into various output formats:
 *
 * - **TypeScript**: Type-safe fixture files with 'as const'
 * - **JSON**: Standard data interchange format
 * - **SQL**: INSERT statements for database seeding
 * - **CSV**: Spreadsheet-compatible format
 *
 * @example
 * ```typescript
 * import {
 *   formatAsTypeScript,
 *   formatAsJSON,
 *   formatAsSQL,
 *   formatAsCSV,
 * } from '@demokit-ai/codegen'
 *
 * // Generate TypeScript fixtures
 * const code = formatAsTypeScript(data, { asConst: true })
 *
 * // Generate SQL for database seeding
 * const sql = formatAsSQL(data)
 *
 * // Generate CSV for a specific model
 * const csv = formatAsCSV(data, 'Customer')
 * ```
 *
 * @module
 */

export {
  formatAsTypeScript,
  formatAsJSON,
  formatAsSQL,
  formatAsCSV,
  type OutputOptions,
} from './formatter'
