import type { QueryKey } from '@demokit-ai/core'
import type { SWRFixtureMap, SWRFixtureContext } from './types'
import { findMatchingFixture, normalizeKey } from './matcher'

/**
 * Options for creating a demo-aware fetcher
 */
export interface CreateDemoFetcherOptions {
  /**
   * Map of key patterns to fixture handlers
   */
  fixtures: SWRFixtureMap

  /**
   * Function to check if demo mode is enabled
   */
  isEnabled: () => boolean

  /**
   * Delay in ms before returning fixture data
   * @default 0
   */
  delay?: number

  /**
   * Fallback fetcher to use when demo mode is disabled
   * or no fixture matches
   */
  fallbackFetcher?: <T>(key: string | unknown[]) => Promise<T>
}

/**
 * Create a demo-aware fetcher function for SWR
 *
 * This fetcher intercepts requests when demo mode is enabled
 * and returns fixture data instead of making real API calls.
 *
 * @example
 * const fixtures = new Map([
 *   [['/api/users'], [{ id: '1', name: 'Demo User' }]],
 *   [['/api/users', ':id'], ({ params }) => ({ id: params.id, name: 'User' })],
 * ])
 *
 * const fetcher = createDemoFetcher({
 *   fixtures,
 *   isEnabled: () => isDemoMode,
 *   delay: 100,
 * })
 *
 * // Use with SWR
 * const { data } = useSWR('/api/users', fetcher)
 */
export function createDemoFetcher(options: CreateDemoFetcherOptions) {
  const { fixtures, isEnabled, delay = 0, fallbackFetcher } = options

  return async function demoFetcher<TData = unknown>(key: string | unknown[]): Promise<TData> {
    // If demo mode is not enabled, use fallback
    if (!isEnabled()) {
      if (fallbackFetcher) {
        return fallbackFetcher<TData>(key)
      }
      throw new Error(
        `[DemoKit SWR] No fallback fetcher provided and demo mode is disabled. ` +
          `Key: ${JSON.stringify(key)}`
      )
    }

    // Find matching fixture
    const match = findMatchingFixture(fixtures, key)

    if (!match) {
      // No fixture found, try fallback
      if (fallbackFetcher) {
        return fallbackFetcher<TData>(key)
      }
      throw new Error(`[DemoKit SWR] No fixture found for key: ${JSON.stringify(key)}`)
    }

    const [handler, { params, normalizedKey }] = match

    // Apply delay if configured
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // Build context
    const context: SWRFixtureContext = {
      key,
      normalizedKey,
      params,
      match: { matched: true, params },
    }

    // Execute handler
    if (typeof handler === 'function') {
      return handler(context) as TData
    }

    // Return static value
    return handler as TData
  }
}

/**
 * Default fetcher that uses fetch API
 * Used as fallback when demo mode is disabled
 */
export async function defaultFetcher<TData = unknown>(key: string | unknown[]): Promise<TData> {
  const url = typeof key === 'string' ? key : String(key[0])
  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }

  return response.json()
}
