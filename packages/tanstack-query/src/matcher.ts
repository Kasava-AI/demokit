import { matchQueryKey, findMatchingQueryKeyPattern } from '@demokit-ai/core'
import type { QueryKey } from '@demokit-ai/core'
import type { QueryKey as TanStackQueryKey } from '@tanstack/react-query'
import type { QueryFixtureHandler, QueryFixtureMap, QueryFixtureMapObject } from './types'

/**
 * Convert TanStack Query key to DemoKit QueryKey
 * TanStack Query keys can contain any value, so we normalize them
 */
export function normalizeQueryKey(queryKey: TanStackQueryKey): QueryKey {
  return queryKey.map((element) => {
    if (element === null || element === undefined) {
      return element
    }
    if (typeof element === 'object') {
      // Keep objects as-is for matching
      return element as Record<string, unknown>
    }
    // Primitives are kept as-is
    return element as string | number | boolean
  })
}

/**
 * Parse a JSON string pattern into a QueryKey
 * Handles both array notation and simple string patterns
 *
 * @example
 * parsePatternString('["users"]') // ['users']
 * parsePatternString('["users", ":id"]') // ['users', ':id']
 * parsePatternString('users') // ['users']
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
export function normalizeFixtureMap(fixtures: QueryFixtureMapObject | QueryFixtureMap): QueryFixtureMap {
  if (fixtures instanceof Map) {
    return fixtures
  }

  const map = new Map<QueryKey, QueryFixtureHandler>()
  for (const [pattern, handler] of Object.entries(fixtures)) {
    map.set(parsePatternString(pattern), handler)
  }
  return map
}

/**
 * Find a matching fixture for a query key
 *
 * @param fixtures - Map of query key patterns to handlers
 * @param queryKey - The query key to match
 * @returns Tuple of [handler, match result] or null if no match
 */
export function findMatchingFixture(
  fixtures: QueryFixtureMap,
  queryKey: TanStackQueryKey
): [QueryFixtureHandler, { params: Record<string, unknown> }] | null {
  const normalizedKey = normalizeQueryKey(queryKey)
  const result = findMatchingQueryKeyPattern(fixtures, normalizedKey)

  if (result) {
    const [, handler, matchResult] = result
    return [handler, { params: matchResult.params }]
  }

  return null
}

/**
 * Re-export the matchQueryKey function for direct use
 */
export { matchQueryKey }
