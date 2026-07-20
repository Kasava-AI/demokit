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
