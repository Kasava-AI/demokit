import { matchQueryKey, findMatchingQueryKeyPattern } from '@demokit-ai/core'
import type { QueryKey } from '@demokit-ai/core'
import type { SWRFixtureHandler, SWRFixtureMap, SWRFixtureMapObject } from './types'

/**
 * Normalize an SWR key to a QueryKey for matching
 *
 * SWR keys can be:
 * - Strings: '/api/users' -> ['/api/users']
 * - Arrays: ['/api/users', id] -> ['/api/users', id]
 * - Functions that return keys (not handled here)
 */
export function normalizeKey(key: string | unknown[]): QueryKey {
  if (typeof key === 'string') {
    return [key]
  }

  return key.map((element) => {
    if (element === null || element === undefined) {
      return element
    }
    if (typeof element === 'object') {
      return element as Record<string, unknown>
    }
    return element as string | number | boolean
  })
}

/**
 * Parse a JSON string pattern into a QueryKey
 * Handles both array notation and simple string patterns
 *
 * @example
 * parsePatternString('["/api/users"]') // ['/api/users']
 * parsePatternString('["/api/users", ":id"]') // ['/api/users', ':id']
 * parsePatternString('/api/users') // ['/api/users']
 */
export function parsePatternString(pattern: string): QueryKey {
  // Try to parse as JSON array
  if (pattern.startsWith('[')) {
    try {
      return JSON.parse(pattern) as QueryKey
    } catch {
      // Fall through to simple string
    }
  }

  // Simple string becomes single-element array
  return [pattern]
}

/**
 * Convert object-based fixture map to Map-based fixture map
 */
export function normalizeFixtureMap(fixtures: SWRFixtureMapObject | SWRFixtureMap): SWRFixtureMap {
  if (fixtures instanceof Map) {
    return fixtures
  }

  const map = new Map<QueryKey, SWRFixtureHandler>()
  for (const [pattern, handler] of Object.entries(fixtures)) {
    map.set(parsePatternString(pattern), handler)
  }
  return map
}

/**
 * Find a matching fixture for an SWR key
 *
 * @param fixtures - Map of key patterns to handlers
 * @param key - The SWR key to match
 * @returns Tuple of [handler, match result] or null if no match
 */
export function findMatchingFixture(
  fixtures: SWRFixtureMap,
  key: string | unknown[]
): [SWRFixtureHandler, { params: Record<string, unknown>; normalizedKey: QueryKey }] | null {
  const normalizedKey = normalizeKey(key)
  const result = findMatchingQueryKeyPattern(fixtures, normalizedKey)

  if (result) {
    const [, handler, matchResult] = result
    return [handler, { params: matchResult.params, normalizedKey }]
  }

  return null
}

/**
 * Re-export the matchQueryKey function for direct use
 */
export { matchQueryKey }