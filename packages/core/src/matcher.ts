import type { MatchResult, ParsedPattern } from './types'

/**
 * Cache for parsed patterns to avoid re-parsing
 */
const patternCache = new Map<string, ParsedPattern>()

/**
 * Parse a URL pattern into its components
 *
 * @param pattern - Pattern in format "METHOD /path/:param"
 * @returns Parsed pattern with method, regex, and param names
 *
 * @example
 * parseUrlPattern('GET /api/users/:id')
 * // { method: 'GET', pathPattern: /^\/api\/users\/([^/]+)$/, paramNames: ['id'] }
 *
 * parseUrlPattern('GET /api/projects/*')
 * // { method: 'GET', pathPattern: /^\/api\/projects\/.*$/, paramNames: [] }
 */
export function parseUrlPattern(pattern: string): ParsedPattern {
  const cached = patternCache.get(pattern)
  if (cached) {
    return cached
  }

  const spaceIndex = pattern.indexOf(' ')
  if (spaceIndex === -1) {
    throw new Error(
      `Invalid pattern "${pattern}": must be in format "METHOD /path". Example: "GET /api/users/:id"`
    )
  }

  const method = pattern.slice(0, spaceIndex).toUpperCase()
  const path = pattern.slice(spaceIndex + 1)

  if (!path.startsWith('/')) {
    throw new Error(
      `Invalid pattern "${pattern}": path must start with "/". Example: "GET /api/users"`
    )
  }

  const paramNames: string[] = []

  // Escape regex special characters except : and *
  // Then convert :param to capture groups and * to wildcards
  let regexStr = path
    // Escape regex special chars (except : and *)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Convert :paramName to named capture group pattern
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name: string) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    // Convert * to wildcard (match anything)
    .replace(/\*/g, '.*')

  const parsed: ParsedPattern = {
    method,
    pathPattern: new RegExp(`^${regexStr}$`),
    paramNames,
  }

  patternCache.set(pattern, parsed)
  return parsed
}

/**
 * Match a request against a fixture pattern
 *
 * @param pattern - Fixture pattern (e.g., "GET /api/users/:id")
 * @param method - HTTP method of the request
 * @param pathname - URL pathname of the request
 * @returns Match result with extracted params, or null if no match
 *
 * @example
 * matchUrl('GET /api/users/:id', 'GET', '/api/users/123')
 * // { matched: true, params: { id: '123' } }
 *
 * matchUrl('GET /api/users/:id', 'POST', '/api/users/123')
 * // null (method doesn't match)
 *
 * matchUrl('GET /api/users/:id', 'GET', '/api/projects/123')
 * // null (path doesn't match)
 */
export function matchUrl(
  pattern: string,
  method: string,
  pathname: string
): MatchResult | null {
  const { method: patternMethod, pathPattern, paramNames } = parseUrlPattern(pattern)

  // Check method first (fast path)
  if (patternMethod !== method.toUpperCase()) {
    return null
  }

  // Match path against pattern
  const match = pathname.match(pathPattern)
  if (!match) {
    return null
  }

  // Extract params from capture groups
  const params: Record<string, string> = {}
  paramNames.forEach((name, index) => {
    const value = match[index + 1]
    if (value !== undefined) {
      params[name] = decodeURIComponent(value)
    }
  })

  return { matched: true, params }
}

/**
 * Find the first matching pattern from a fixture map
 *
 * @param fixtures - Map of patterns to fixtures
 * @param method - HTTP method of the request
 * @param pathname - URL pathname of the request
 * @returns Tuple of [pattern, match result] or null if no match
 */
export function findMatchingPattern(
  fixtures: Record<string, unknown>,
  method: string,
  pathname: string
): [string, MatchResult] | null {
  for (const pattern of Object.keys(fixtures)) {
    const result = matchUrl(pattern, method, pathname)
    if (result) {
      return [pattern, result]
    }
  }
  return null
}

/**
 * Clear the pattern cache (useful for testing)
 */
export function clearPatternCache(): void {
  patternCache.clear()
}

// ============================================================================
// Query Key Matching (for TanStack Query, SWR, etc.)
// ============================================================================

/**
 * A query key element can be a string, number, or object
 */
export type QueryKeyElement = string | number | boolean | null | undefined | Record<string, unknown>

/**
 * A query key is an array of elements (like TanStack Query uses)
 */
export type QueryKey = readonly QueryKeyElement[]

/**
 * Result of query key matching
 */
export interface QueryKeyMatchResult {
  /**
   * Whether the pattern matched the query key
   */
  matched: boolean

  /**
   * Extracted parameters from :param placeholders
   */
  params: Record<string, unknown>
}

/**
 * Check if two values are deeply equal
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)

    if (aKeys.length !== bKeys.length) return false

    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]))
  }

  return false
}

/**
 * Check if a string is a parameter placeholder (e.g., ':id', ':userId')
 */
function isParamPlaceholder(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(':') && value.length > 1
}

/**
 * Extract the parameter name from a placeholder (e.g., ':id' -> 'id')
 */
function getParamName(placeholder: string): string {
  return placeholder.slice(1)
}

/**
 * Match an object value against an object pattern with parameter extraction
 *
 * @param value - The actual object value from the query key
 * @param pattern - The pattern object (may contain :param placeholders)
 * @returns Match result with extracted params, or null if no match
 */
function matchObjectWithParams(
  value: Record<string, unknown>,
  pattern: Record<string, unknown>
): { matched: boolean; params: Record<string, unknown> } | null {
  const params: Record<string, unknown> = {}
  const patternKeys = Object.keys(pattern)
  const valueKeys = Object.keys(value)

  // Pattern must have same or fewer keys (pattern keys must all be present in value)
  if (patternKeys.length > valueKeys.length) {
    return null
  }

  for (const key of patternKeys) {
    if (!(key in value)) {
      return null
    }

    const patternVal = pattern[key]
    const actualVal = value[key]

    if (isParamPlaceholder(patternVal)) {
      // Extract parameter value
      params[getParamName(patternVal)] = actualVal
    } else if (typeof patternVal === 'object' && patternVal !== null && typeof actualVal === 'object' && actualVal !== null) {
      // Recursively match nested objects
      const nestedResult = matchObjectWithParams(
        actualVal as Record<string, unknown>,
        patternVal as Record<string, unknown>
      )
      if (!nestedResult) {
        return null
      }
      Object.assign(params, nestedResult.params)
    } else if (!deepEqual(patternVal, actualVal)) {
      return null
    }
  }

  return { matched: true, params }
}

/**
 * Match a query key against a pattern
 *
 * Supports:
 * - Exact string/number matching: ['users'] matches ['users']
 * - Parameter extraction with :param syntax: ['users', ':id'] matches ['users', '123']
 * - Object matching with params: ['users', { id: ':id' }] matches ['users', { id: '123' }]
 * - Wildcard matching with '*': ['users', '*'] matches ['users', 'anything']
 *
 * @param queryKey - The actual query key to match
 * @param pattern - The pattern to match against
 * @returns Match result with extracted params, or null if no match
 *
 * @example
 * // Exact match
 * matchQueryKey(['users'], ['users'])
 * // { matched: true, params: {} }
 *
 * // Parameter extraction from string
 * matchQueryKey(['users', '123'], ['users', ':id'])
 * // { matched: true, params: { id: '123' } }
 *
 * // Parameter extraction from object
 * matchQueryKey(['users', { id: '123', status: 'active' }], ['users', { id: ':userId' }])
 * // { matched: true, params: { userId: '123' } }
 *
 * // Wildcard matching
 * matchQueryKey(['users', 'anything'], ['users', '*'])
 * // { matched: true, params: {} }
 *
 * // No match - different length
 * matchQueryKey(['users'], ['users', 'list'])
 * // null
 */
export function matchQueryKey(
  queryKey: QueryKey,
  pattern: QueryKey
): QueryKeyMatchResult | null {
  // Arrays must be same length
  if (queryKey.length !== pattern.length) {
    return null
  }

  const params: Record<string, unknown> = {}

  for (let i = 0; i < pattern.length; i++) {
    const patternElement = pattern[i]
    const keyElement = queryKey[i]

    // Wildcard matches anything
    if (patternElement === '*') {
      continue
    }

    // Parameter placeholder extracts value
    if (isParamPlaceholder(patternElement)) {
      params[getParamName(patternElement)] = keyElement
      continue
    }

    // Object matching with potential nested params
    if (
      typeof patternElement === 'object' &&
      patternElement !== null &&
      typeof keyElement === 'object' &&
      keyElement !== null
    ) {
      const objectResult = matchObjectWithParams(
        keyElement as Record<string, unknown>,
        patternElement as Record<string, unknown>
      )
      if (!objectResult) {
        return null
      }
      Object.assign(params, objectResult.params)
      continue
    }

    // Exact match for primitives
    if (patternElement !== keyElement) {
      return null
    }
  }

  return { matched: true, params }
}

/**
 * Find the first matching pattern from a map of query key patterns
 *
 * @param patterns - Map of serialized patterns to values
 * @param queryKey - The query key to match
 * @returns Tuple of [pattern, value, match result] or null if no match
 *
 * @example
 * const patterns = {
 *   'users': { data: [] },
 *   'users/:id': (params) => ({ id: params.id }),
 * }
 * findMatchingQueryKeyPattern(patterns, ['users', '123'])
 * // [['users', ':id'], { params: { id: '123' } }]
 */
export function findMatchingQueryKeyPattern<T>(
  patterns: Map<QueryKey, T>,
  queryKey: QueryKey
): [QueryKey, T, QueryKeyMatchResult] | null {
  for (const [pattern, value] of patterns) {
    const result = matchQueryKey(queryKey, pattern)
    if (result) {
      return [pattern, value, result]
    }
  }
  return null
}
