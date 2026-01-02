/**
 * Individual validation check functions
 *
 * Each function returns true if the value passes the check.
 */

// ============================================================================
// Type Checks
// ============================================================================

/**
 * Check if value is a string
 */
export function isString(value: unknown): boolean {
  return typeof value === 'string'
}

/**
 * Check if value is a number (not NaN)
 */
export function isNumber(value: unknown): boolean {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Check if value is an integer
 */
export function isInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value)
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean'
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): boolean {
  return Array.isArray(value)
}

/**
 * Check if value is a plain object
 */
export function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if value is null
 */
export function isNull(value: unknown): boolean {
  return value === null
}

/**
 * Check if value is undefined
 */
export function isUndefined(value: unknown): boolean {
  return value === undefined
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): boolean {
  return value === null || value === undefined
}

// ============================================================================
// Format Checks
// ============================================================================

// UUID v4 pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// More relaxed UUID pattern (accepts any version)
const UUID_ANY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Email pattern (simplified but practical)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// URL pattern (simplified)
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i

// ISO 8601 date pattern (YYYY-MM-DD)
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// ISO 8601 datetime pattern (with various formats)
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?)?$/

/**
 * Check if value is a valid UUID
 */
export function isUUID(value: unknown, strict = false): boolean {
  if (typeof value !== 'string') return false
  return strict ? UUID_PATTERN.test(value) : UUID_ANY_PATTERN.test(value)
}

/**
 * Check if value is a valid email format
 */
export function isEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return EMAIL_PATTERN.test(value)
}

/**
 * Check if value is a valid URL
 */
export function isURL(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return URL_PATTERN.test(value)
}

/**
 * Check if value is a valid ISO 8601 date (YYYY-MM-DD)
 */
export function isDate(value: unknown): boolean {
  if (typeof value !== 'string') return false
  if (!DATE_PATTERN.test(value)) return false

  // Validate it's a real date
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

/**
 * Check if value is a valid ISO 8601 datetime
 */
export function isDateTime(value: unknown): boolean {
  if (typeof value !== 'string') return false
  if (!DATETIME_PATTERN.test(value)) return false

  // Validate it's a real datetime
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

/**
 * Alias for isDateTime - checks ISO 8601 format
 */
export function isISO8601(value: unknown): boolean {
  return isDateTime(value)
}

// ============================================================================
// Constraint Checks
// ============================================================================

/**
 * Check if string length is at least minLength
 */
export function hasMinLength(value: unknown, minLength: number): boolean {
  if (typeof value !== 'string') return false
  return value.length >= minLength
}

/**
 * Check if string length is at most maxLength
 */
export function hasMaxLength(value: unknown, maxLength: number): boolean {
  if (typeof value !== 'string') return false
  return value.length <= maxLength
}

/**
 * Check if number is at least minimum
 */
export function hasMinimum(value: unknown, minimum: number): boolean {
  if (typeof value !== 'number') return false
  return value >= minimum
}

/**
 * Check if number is at most maximum
 */
export function hasMaximum(value: unknown, maximum: number): boolean {
  if (typeof value !== 'number') return false
  return value <= maximum
}

/**
 * Check if string matches a regex pattern
 */
export function matchesPattern(value: unknown, pattern: string | RegExp): boolean {
  if (typeof value !== 'string') return false
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
  return regex.test(value)
}

/**
 * Check if value is in an enum array
 */
export function isInEnum(value: unknown, enumValues: unknown[]): boolean {
  return enumValues.includes(value)
}

// ============================================================================
// Comparison Checks
// ============================================================================

/**
 * Check if two values are equal
 */
export function equals(value: unknown, expected: unknown): boolean {
  return value === expected
}

/**
 * Check if a date/datetime is before or equal to another
 */
export function isBeforeOrEqual(value: unknown, other: unknown): boolean {
  if (typeof value !== 'string' || typeof other !== 'string') return false

  const date1 = new Date(value)
  const date2 = new Date(other)

  if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) return false

  return date1.getTime() <= date2.getTime()
}

/**
 * Check if a date/datetime is after or equal to another
 */
export function isAfterOrEqual(value: unknown, other: unknown): boolean {
  if (typeof value !== 'string' || typeof other !== 'string') return false

  const date1 = new Date(value)
  const date2 = new Date(other)

  if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) return false

  return date1.getTime() >= date2.getTime()
}

// ============================================================================
// Array Checks
// ============================================================================

/**
 * Check if array is not empty
 */
export function isArrayNotEmpty(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

/**
 * Check if array has at least minLength items
 */
export function hasArrayMinLength(value: unknown, minLength: number): boolean {
  return Array.isArray(value) && value.length >= minLength
}

/**
 * Check if array has at most maxLength items
 */
export function hasArrayMaxLength(value: unknown, maxLength: number): boolean {
  return Array.isArray(value) && value.length <= maxLength
}

// ============================================================================
// Utility Checks
// ============================================================================

/**
 * Check if a string is empty or only whitespace
 */
export function isEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === ''
}

/**
 * Get the type name of a value (for error messages)
 */
export function getTypeName(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  return typeof value
}
