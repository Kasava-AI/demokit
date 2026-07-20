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
export { createDemoInterceptor, demoResponse, isDemoResponse } from './interceptor'
export type { DemoResponseValue } from './interceptor'

// Session state management
export { createSessionState } from './session'

// URL pattern matching utilities
export {
  matchUrl,
  parseUrlPattern,
  findMatchingPattern,
  clearPatternCache,
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
  DEFAULT_API_URL,
  DEFAULT_CLOUD_URL, // deprecated, use DEFAULT_API_URL
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
  DetectionConfig,
  MutationInterceptedContext,
  UnmatchedMutationContext,
  UnmatchedMutationPolicy,
  // Remote config types (for cloud-managed fixtures)
  RemoteConfig,
  CloudFixtureResponse,
  EndpointMapping,
  AggregateConfig,
  QueryParamConfig,
  DemoKitRemoteConfig,
  RemoteLoadingState,
} from './types'

export type { SessionState } from './session'

// Demo state types
export type { DemoState, DemoStateStore, DemoStateStoreOptions } from './state'

// Canonical dataset store (spec §3-§4)
export { createDemoStore } from './store/store'
export { attachOpLogPersistence } from './store/oplog'
export type { StorageLike, OpLogOptions, OpLogPersistence } from './store/oplog'
export { buildProjectionMap } from './store/projections'
export { pruneModelsForRuntime } from './store/prune'
export { createDemoRuntime } from './store/runtime'
export type { DemoRuntime, DemoRuntimeOptions } from './store/runtime'
export { StoreError } from './store/types'
export type {
  DemoStore,
  ModelHandle,
  Row,
  StoreOp,
  DemoStoreOptions,
  TransformContext,
  TransformFn,
  TransformRegistry,
} from './store/types'

// Services (schema, ai, auth, codegen)
export * from './services'
