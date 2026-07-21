/**
 * Canonical dataset store — types.
 *
 * The store holds one canonical dataset (entities + relationships) per demo
 * variant. Every endpoint is served as a projection of this dataset (spec §3).
 */
import type { DemoData } from '../services/codegen/types'
import type { DataModel, Relationship } from '../services/schema/types'

/** A single entity row. */
export type Row = Record<string, unknown>

/** One entry in the mutation op-log (spec §3.3). */
export interface StoreOp {
  seq: number
  model: string
  op: 'create' | 'update' | 'delete'
  id: string
  /** For 'create': the full created row. For 'update': the patch. Absent for 'delete'. */
  attrs?: Record<string, unknown>
}

/**
 * Thrown by store mutations on validation failure. The interceptor maps
 * `status` onto the mock response, so the app's own error handling renders —
 * same behavior a real API would produce (spec §3.2).
 */
export class StoreError extends Error {
  constructor(
    message: string,
    public readonly status: number = 422
  ) {
    super(message)
    this.name = 'StoreError'
  }
}

export interface ModelHandle {
  all(): Row[]
  find(id: string): Row | undefined
  where(pred: Partial<Row> | ((r: Row) => boolean)): Row[]
  /** Fills defaults from DataModel, validates types/enums/required and FKs. */
  create(attrs: Partial<Row>): Row
  update(id: string, patch: Partial<Row>): Row
  /** Cascades to dependents when the relationship is required, nulls-out when optional. */
  delete(id: string): void
}

export interface DemoStore {
  model(name: string): ModelHandle
  /** Deep-copied current state — for persistence / debugging. */
  snapshot(): DemoData
  /** Back to the published dataset. */
  reset(): void
  /** Rehydration: replay ops through the mutation paths without re-emitting. */
  applyOpLog(ops: StoreOp[]): void
  /** Replace state wholesale (op-log overflow snapshots, tab sync). */
  loadSnapshot(data: DemoData, seq?: number): void
  /** Subscribe to user-initiated mutations. Returns unsubscribe. */
  onOp(listener: (op: StoreOp) => void): () => void
  /** Highest sequence number applied so far. */
  seq(): number
}

export interface DemoStoreOptions {
  data: DemoData
  models?: Record<string, DataModel>
  relationships?: Relationship[]
  /** Primary-key field name. @default 'id' */
  idField?: string
}

/** Context passed to registered transforms (spec §4.2 — the eval boundary). */
export interface TransformContext {
  store: DemoStore
  params: Record<string, string>
  searchParams: URLSearchParams
  body?: unknown
  method: string
  url: string
}

export type TransformFn = (ctx: TransformContext) => unknown | Promise<unknown>

/** Named transforms registered at install time. Cloud mappings reference them by name only. */
export type TransformRegistry = Record<string, TransformFn>

/** A cloud mapping the runtime cannot serve (spec §8 coverage health). */
export interface UnservedMappingInfo {
  reason: 'unregistered_transform' | 'unknown_response_type'
  method: string
  pattern: string
  transformName?: string
}
