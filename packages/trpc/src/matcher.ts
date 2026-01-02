import type { FlatFixtureMap, TRPCFixtureHandler, FixtureMatchResult } from './types'

/**
 * Find a matching fixture for a procedure path
 *
 * @param fixtures - Map of procedure paths to fixture handlers
 * @param path - The procedure path to match (e.g., 'user.get', 'post.list')
 * @returns Match result with handler if found
 *
 * @example
 * const fixtures = new Map([
 *   ['user.list', () => []],
 *   ['user.get', ({ input }) => ({ id: input.id })],
 * ])
 *
 * findMatchingFixture(fixtures, 'user.get')
 * // { matched: true, handler: Function, path: 'user.get' }
 *
 * findMatchingFixture(fixtures, 'unknown.path')
 * // { matched: false, path: 'unknown.path' }
 */
export function findMatchingFixture<TOutput = unknown>(
  fixtures: FlatFixtureMap,
  path: string
): FixtureMatchResult<TOutput> {
  const handler = fixtures.get(path)

  if (handler !== undefined) {
    return {
      matched: true,
      handler: handler as TRPCFixtureHandler<unknown, TOutput>,
      path,
    }
  }

  return {
    matched: false,
    path,
  }
}

/**
 * Check if a procedure path should be intercepted based on include/exclude rules
 *
 * @param path - The procedure path to check
 * @param include - Optional list of paths to include (if provided, only these are intercepted)
 * @param exclude - Optional list of paths to exclude (takes precedence over include)
 * @returns Whether the path should be intercepted
 *
 * @example
 * // Include only specific paths
 * shouldIntercept('user.get', ['user.get', 'user.list'], [])
 * // true
 *
 * shouldIntercept('post.list', ['user.get', 'user.list'], [])
 * // false
 *
 * // Exclude takes precedence
 * shouldIntercept('user.get', ['user.get'], ['user.get'])
 * // false
 */
export function shouldIntercept(
  path: string,
  include?: string[],
  exclude?: string[]
): boolean {
  // Exclude takes precedence
  if (exclude?.includes(path)) {
    return false
  }

  // If include list is provided, only intercept those
  if (include && include.length > 0) {
    return include.includes(path)
  }

  // By default, intercept all
  return true
}

/**
 * Check if a procedure path matches a pattern with wildcards
 *
 * Supports:
 * - Exact match: 'user.get' matches 'user.get'
 * - Wildcard suffix: 'user.*' matches 'user.get', 'user.list', etc.
 * - Wildcard prefix: '*.get' matches 'user.get', 'post.get', etc.
 * - Full wildcard: '*' matches everything
 *
 * @param path - The procedure path to check
 * @param pattern - The pattern to match against
 * @returns Whether the path matches the pattern
 *
 * @example
 * matchPath('user.get', 'user.get')   // true
 * matchPath('user.get', 'user.*')     // true
 * matchPath('user.get', '*.get')      // true
 * matchPath('user.get', '*')          // true
 * matchPath('user.get', 'post.*')     // false
 */
export function matchPath(path: string, pattern: string): boolean {
  if (pattern === '*') {
    return true
  }

  if (pattern === path) {
    return true
  }

  // Handle wildcard patterns
  if (pattern.includes('*')) {
    const regex = new RegExp(
      '^' +
        pattern
          .split('*')
          .map((s) => escapeRegex(s))
          .join('.*') +
        '$'
    )
    return regex.test(path)
  }

  return false
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Filter fixtures based on include/exclude patterns
 *
 * @param fixtures - The fixture map to filter
 * @param include - Patterns to include (supports wildcards)
 * @param exclude - Patterns to exclude (takes precedence, supports wildcards)
 * @returns A new fixture map with only matching fixtures
 */
export function filterFixtures(
  fixtures: FlatFixtureMap,
  include?: string[],
  exclude?: string[]
): FlatFixtureMap {
  const result: FlatFixtureMap = new Map()

  for (const [path, handler] of fixtures) {
    // Check if path should be included
    let shouldInclude = true

    if (include && include.length > 0) {
      shouldInclude = include.some((pattern) => matchPath(path, pattern))
    }

    // Check if path should be excluded
    if (exclude && exclude.length > 0) {
      if (exclude.some((pattern) => matchPath(path, pattern))) {
        shouldInclude = false
      }
    }

    if (shouldInclude) {
      result.set(path, handler)
    }
  }

  return result
}

/**
 * Get all procedure paths from a fixture map
 *
 * @param fixtures - The fixture map
 * @returns Array of all procedure paths
 */
export function getFixturePaths(fixtures: FlatFixtureMap): string[] {
  return Array.from(fixtures.keys())
}

/**
 * Merge multiple fixture maps
 *
 * Later maps take precedence over earlier ones for the same path.
 *
 * @param maps - Fixture maps to merge
 * @returns Merged fixture map
 */
export function mergeFixtures(...maps: FlatFixtureMap[]): FlatFixtureMap {
  const result: FlatFixtureMap = new Map()

  for (const map of maps) {
    for (const [path, handler] of map) {
      result.set(path, handler)
    }
  }

  return result
}
