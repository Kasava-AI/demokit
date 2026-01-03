/**
 * Remote Configuration Support for DemoKit Cloud
 *
 * Provides functions to fetch fixture data and endpoint mappings from DemoKit Cloud
 * and transform them into FixtureMap handlers that can be used with the demo interceptor.
 *
 * @example
 * ```typescript
 * import { fetchCloudFixtures, buildFixtureMap } from '@demokit-ai/core'
 *
 * const response = await fetchCloudFixtures({
 *   apiKey: 'dk_live_xxx',
 * })
 *
 * const fixtureMap = buildFixtureMap(response.data, response.mappings)
 * ```
 */

import type {
  RemoteConfig,
  CloudFixtureResponse,
  EndpointMapping,
  FixtureMap,
  FixtureHandler,
  RequestContext,
} from './types'

/**
 * Default DemoKit Cloud API URL
 */
export const DEFAULT_API_URL = 'https://api.demokit.cloud/api'

/**
 * @deprecated Use DEFAULT_API_URL instead
 */
export const DEFAULT_CLOUD_URL = DEFAULT_API_URL

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 10000

/**
 * Default maximum retries
 */
export const DEFAULT_MAX_RETRIES = 3

/**
 * Validate API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.startsWith('dk_live_')
}

/**
 * Error thrown when remote fetch fails
 */
export class RemoteFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'RemoteFetchError'
  }
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000)
}

/**
 * Fetch fixtures and mappings from DemoKit Cloud
 *
 * @param config - Remote configuration with API key and options
 * @returns Promise resolving to cloud fixture response with data, mappings, and version
 * @throws RemoteFetchError if the request fails
 *
 * @example
 * ```typescript
 * const response = await fetchCloudFixtures({
 *   apiKey: 'dk_live_xxx',
 *   onLoad: (data) => console.log('Loaded version:', data.version),
 *   onError: (error) => console.error('Failed to load:', error),
 * })
 * ```
 */
export async function fetchCloudFixtures(
  config: RemoteConfig
): Promise<CloudFixtureResponse> {
  const {
    apiKey,
    apiUrl,
    cloudUrl, // deprecated, for backwards compatibility
    onError,
    onLoad,
    timeout = DEFAULT_TIMEOUT,
    retry = true,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = config

  // Use apiUrl if provided, fall back to cloudUrl for backwards compatibility
  const baseUrl = apiUrl || cloudUrl || DEFAULT_API_URL

  // Validate API key format
  if (!isValidApiKey(apiKey)) {
    const error = new RemoteFetchError(
      'Invalid API key format. Expected format: dk_live_xxx',
      undefined,
      false
    )
    onError?.(error)
    throw error
  }

  // Build the fixtures endpoint URL
  // apiUrl is expected to be the versioned base (e.g., https://api.demokit.cloud/api/v1)
  // We just append /fixtures
  const url = `${baseUrl.replace(/\/$/, '')}/fixtures`

  let lastError: Error | null = null
  const maxAttempts = retry ? maxRetries : 1

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Handle non-OK responses
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = (body as { error?: string }).error || response.statusText

        // Determine if retryable (5xx errors)
        const retryable = response.status >= 500

        throw new RemoteFetchError(message, response.status, retryable)
      }

      // Parse response
      const data = (await response.json()) as CloudFixtureResponse

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new RemoteFetchError('Invalid response format', undefined, false)
      }

      if (!data.data || !data.mappings || !data.version) {
        throw new RemoteFetchError(
          'Missing required fields in response: data, mappings, or version',
          undefined,
          false
        )
      }

      // Call success callback
      onLoad?.(data)

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new RemoteFetchError(
          `Request timed out after ${timeout}ms`,
          undefined,
          true
        )
      }

      // Check if we should retry
      const isRetryable =
        error instanceof RemoteFetchError ? error.retryable : true
      const shouldRetry = retry && isRetryable && attempt < maxAttempts - 1

      if (shouldRetry) {
        const delay = getBackoffDelay(attempt)
        await sleep(delay)
        continue
      }

      // No more retries
      break
    }
  }

  // All attempts failed
  onError?.(lastError!)
  throw lastError
}

/**
 * Build a FixtureMap from cloud data and endpoint mappings
 *
 * Transforms endpoint mappings into fixture handlers that can be used
 * with the demo interceptor. Each mapping becomes a pattern-matched
 * handler that returns the appropriate data.
 *
 * @param data - Fixture data keyed by model name (e.g., { users: [...], products: [...] })
 * @param mappings - Endpoint mappings from DemoKit Cloud
 * @returns FixtureMap that can be passed to createDemoInterceptor
 *
 * @example
 * ```typescript
 * const fixtureMap = buildFixtureMap(
 *   { users: [{ id: '1', name: 'Alice' }] },
 *   [
 *     { method: 'GET', pattern: '/api/users', sourceModel: 'users', responseType: 'collection' },
 *     { method: 'GET', pattern: '/api/users/:id', sourceModel: 'users', responseType: 'single', lookupField: 'id', lookupParam: 'id' },
 *   ]
 * )
 *
 * // Result:
 * // {
 * //   'GET /api/users': () => [{ id: '1', name: 'Alice' }],
 * //   'GET /api/users/:id': ({ params }) => users.find(u => u.id === params.id),
 * // }
 * ```
 */
export function buildFixtureMap(
  data: Record<string, unknown[]>,
  mappings: EndpointMapping[]
): FixtureMap {
  const fixtureMap: FixtureMap = {}

  for (const mapping of mappings) {
    const key = `${mapping.method} ${mapping.pattern}`
    const sourceData = data[mapping.sourceModel] || []

    const handler = createHandlerForMapping(mapping, sourceData)
    if (handler) {
      fixtureMap[key] = handler
    }
  }

  return fixtureMap
}

/**
 * Create a fixture handler for a single endpoint mapping
 *
 * @param mapping - The endpoint mapping configuration
 * @param sourceData - The source data array for this mapping
 * @returns A fixture handler function or undefined if mapping is invalid
 */
export function createHandlerForMapping(
  mapping: EndpointMapping,
  sourceData: unknown[]
): FixtureHandler | undefined {
  switch (mapping.responseType) {
    case 'collection':
      return createCollectionHandler(sourceData)

    case 'single':
      return createSingleHandler(mapping, sourceData)

    case 'custom':
      // Custom handlers are not yet supported in the SDK
      // They would require safe eval or a transform registry
      console.warn(
        `[DemoKit] Custom response type not yet supported for pattern: ${mapping.pattern}`
      )
      return undefined

    default:
      console.warn(
        `[DemoKit] Unknown response type "${mapping.responseType}" for pattern: ${mapping.pattern}`
      )
      return undefined
  }
}

/**
 * Create a handler that returns all records from source data
 */
function createCollectionHandler(sourceData: unknown[]): FixtureHandler {
  // Return a shallow copy to prevent accidental mutation
  return () => [...sourceData]
}

/**
 * Create a handler that looks up a single record by field value
 */
function createSingleHandler(
  mapping: EndpointMapping,
  sourceData: unknown[]
): FixtureHandler {
  const { lookupField, lookupParam } = mapping

  // If lookup configuration is missing, return first item or undefined
  if (!lookupField || !lookupParam) {
    return () => sourceData[0]
  }

  return (context: RequestContext) => {
    const lookupValue = context.params[lookupParam]

    if (lookupValue === undefined) {
      return undefined
    }

    // Find record where field matches the param value (as strings)
    return sourceData.find((item) => {
      if (!item || typeof item !== 'object') return false
      const record = item as Record<string, unknown>
      return String(record[lookupField]) === lookupValue
    })
  }
}

/**
 * Merge remote fixtures with local overrides
 *
 * Creates a combined FixtureMap where local fixtures take precedence
 * over remote fixtures for the same patterns.
 *
 * @param remoteFixtures - Fixtures built from cloud mappings
 * @param localOverrides - Local fixtures that override remote ones
 * @returns Merged FixtureMap
 *
 * @example
 * ```typescript
 * const merged = mergeFixtures(remoteFixtures, {
 *   // Override specific endpoint with custom logic
 *   'POST /api/users': ({ body }) => ({ id: 'custom', ...body }),
 * })
 * ```
 */
export function mergeFixtures(
  remoteFixtures: FixtureMap,
  localOverrides?: FixtureMap
): FixtureMap {
  if (!localOverrides) {
    return { ...remoteFixtures }
  }

  return {
    ...remoteFixtures,
    ...localOverrides,
  }
}

/**
 * Create a complete fixture setup from cloud response and optional overrides
 *
 * Convenience function that combines buildFixtureMap and mergeFixtures.
 *
 * @param response - Cloud fixture response
 * @param localOverrides - Optional local fixtures to merge
 * @returns Complete FixtureMap ready for use with createDemoInterceptor
 */
export function createRemoteFixtures(
  response: CloudFixtureResponse,
  localOverrides?: FixtureMap
): FixtureMap {
  const remoteFixtures = buildFixtureMap(response.data, response.mappings)
  return mergeFixtures(remoteFixtures, localOverrides)
}
