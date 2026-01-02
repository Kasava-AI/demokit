/**
 * CSV Parser for Linked Datasets
 *
 * Parses CSV content into structured data for use in generation rules.
 * Supports:
 * - Quoted fields with commas and newlines
 * - Header row detection
 * - Row limit enforcement (1000 rows max)
 * - Validation of consistent column counts
 */

import type { ParseCSVResult } from '../types'

/** Maximum number of data rows allowed in a dataset */
const MAX_ROWS = 1000

/**
 * Parse CSV content into columns and rows
 *
 * @param content - Raw CSV content as a string
 * @returns ParseCSVResult with columns, rows, or error
 */
export function parseCSV(content: string): ParseCSVResult {
  if (!content || content.trim().length === 0) {
    return {
      success: false,
      error: 'CSV content is empty',
    }
  }

  try {
    const lines = parseCSVLines(content)

    if (lines.length === 0) {
      return {
        success: false,
        error: 'No data found in CSV',
      }
    }

    // First line is headers
    const columns = lines[0]

    if (!columns || columns.length === 0) {
      return {
        success: false,
        error: 'No columns found in header row',
      }
    }

    // Check for duplicate column names
    const columnSet = new Set<string>()
    for (const col of columns) {
      const trimmed = col.trim()
      if (columnSet.has(trimmed)) {
        return {
          success: false,
          error: `Duplicate column name: "${trimmed}"`,
        }
      }
      columnSet.add(trimmed)
    }

    // Parse data rows
    const allRows = lines.slice(1)
    const originalRowCount = allRows.length

    // Validate and filter rows
    const validRows: string[][] = []
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i]
      if (!row) continue

      // Skip empty rows
      if (row.length === 1 && (row[0]?.trim() ?? '') === '') {
        continue
      }

      // Check column count matches
      if (row.length !== columns.length) {
        return {
          success: false,
          error: `Row ${i + 2} has ${row.length} columns, expected ${columns.length}`,
        }
      }

      validRows.push(row)

      // Enforce row limit
      if (validRows.length >= MAX_ROWS) {
        break
      }
    }

    if (validRows.length === 0) {
      return {
        success: false,
        error: 'No data rows found in CSV',
      }
    }

    const truncated = originalRowCount > MAX_ROWS

    return {
      success: true,
      columns: columns.map((c) => c.trim()),
      rows: validRows.map((row) => row.map((cell) => cell.trim())),
      truncated,
      originalRowCount: truncated ? originalRowCount : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse CSV',
    }
  }
}

/**
 * Parse CSV content into lines, handling quoted fields
 */
function parseCSVLines(content: string): string[][] {
  const lines: string[][] = []
  let currentLine: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i++ // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true
      } else if (char === ',') {
        // End of field
        currentLine.push(currentField)
        currentField = ''
      } else if (char === '\r') {
        // Skip carriage return
        continue
      } else if (char === '\n') {
        // End of line
        currentLine.push(currentField)
        lines.push(currentLine)
        currentLine = []
        currentField = ''
      } else {
        currentField += char
      }
    }
  }

  // Handle last field/line
  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField)
    lines.push(currentLine)
  }

  return lines
}

/**
 * Generate a unique dataset ID
 */
export function generateDatasetId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `ds_${timestamp}${random}`
}

/**
 * Validate that a dataset name is valid
 */
export function validateDatasetName(name: string): string | null {
  const trimmed = name.trim()

  if (trimmed.length === 0) {
    return 'Dataset name is required'
  }

  if (trimmed.length > 50) {
    return 'Dataset name must be 50 characters or less'
  }

  // Allow alphanumeric, spaces, hyphens, underscores
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return 'Dataset name can only contain letters, numbers, spaces, hyphens, and underscores'
  }

  return null
}
