/**
 * Composes store + op-log + projections from a cloud payload. The transport
 * (fetch interceptor today, MSW in Phase 4) consumes only the FixtureMap, so
 * the store/projection layer stays transport-agnostic (spec §10).
 */
import type { CloudFixtureResponse, FixtureMap } from '../types'
import type { DemoData } from '../services/codegen/types'
import { createDemoStore } from './store'
import { attachOpLogPersistence, type StorageLike } from './oplog'
import { buildProjectionMap } from './projections'
import type { DemoStore, TransformRegistry } from './types'

export interface DemoRuntimeOptions {
  response: CloudFixtureResponse
  transforms?: TransformRegistry
  /** Demo-mode storage key; the op-log key derives from it. @default 'demokit-mode' */
  storageKey?: string
  /** Injectable for tests. */
  storage?: StorageLike
}

export interface DemoRuntime {
  store: DemoStore
  fixtures: FixtureMap
  /** Clears the op-log and re-seeds from the published dataset (spec §3.3). */
  reset(): void
  destroy(): void
}

export function createDemoRuntime(options: DemoRuntimeOptions): DemoRuntime | null {
  const { response, transforms, storageKey = 'demokit-mode', storage } = options
  if (!response.models || !response.relationships) {
    return null
  }

  const store = createDemoStore({
    data: response.data as DemoData,
    models: response.models,
    relationships: response.relationships,
  })

  const persistence = attachOpLogPersistence({
    store,
    key: `${storageKey}:oplog`,
    version: response.version,
    storage,
  })

  const fixtures = buildProjectionMap(response.mappings, store, transforms)

  return {
    store,
    fixtures,
    reset(): void {
      persistence.clear()
      store.reset()
    },
    destroy(): void {
      persistence.destroy()
    },
  }
}
