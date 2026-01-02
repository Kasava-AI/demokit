/**
 * @demokit-ai/core
 *
 * Framework-agnostic demo mode SDK with fetch interception.
 * Intercept API calls and return mock data without backend changes.
 *
 * @example
 * import { createDemoInterceptor } from '@demokit-ai/core'
 *
 * const demo = createDemoInterceptor({
 *   fixtures: {
 *     'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 *     'GET /api/users/:id': ({ params }) => ({ id: params.id, name: 'Demo User' }),
 *   }
 * })
 *
 * demo.enable()   // All matching fetches return mock data
 * demo.disable()  // Back to real API
 *
 * @packageDocumentation
 */

// Main API
export { createDemoInterceptor } from './interceptor'

// Session state management
export { createSessionState } from './session'

// URL pattern matching utilities
export {
  matchUrl,
  parseUrlPattern,
  findMatchingPattern,
  clearPatternCache,
  // Query key matching (for TanStack Query, SWR, etc.)
  matchQueryKey,
  findMatchingQueryKeyPattern,
} from './matcher'

// Shared demo state management
export { createDemoState, createDemoStateStore } from './state'

// Storage utilities
export { loadDemoState, saveDemoState, clearDemoState, DEFAULT_STORAGE_KEY } from './storage'

// Remote configuration utilities (for DemoKit Cloud)
export {
  fetchCloudFixtures,
  buildFixtureMap,
  createHandlerForMapping,
  mergeFixtures,
  createRemoteFixtures,
  isValidApiKey,
  RemoteFetchError,
  DEFAULT_CLOUD_URL,
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_RETRIES,
} from './remote'

// Types
export type {
  DemoKitConfig,
  DemoInterceptor,
  FixtureMap,
  FixtureHandler,
  RequestContext,
  MatchResult,
  ParsedPattern,
  // Remote config types (for cloud-managed fixtures)
  RemoteConfig,
  CloudFixtureResponse,
  EndpointMapping,
  DemoKitRemoteConfig,
  RemoteLoadingState,
} from './types'

export type { SessionState } from './session'

// Query key matching types
export type { QueryKey, QueryKeyElement, QueryKeyMatchResult } from './matcher'

// Demo state types
export type { DemoState, DemoStateStore, DemoStateStoreOptions } from './state'

// Services (schema, ai, auth, codegen)
export * from './services'
