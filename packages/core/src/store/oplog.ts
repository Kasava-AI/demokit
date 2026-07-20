/**
 * Op-log persistence (spec §3.3).
 *
 * Every mutation appends a StoreOp to an in-memory log flushed to
 * localStorage. On demo start: load published dataset -> replay op-log.
 * Discarded when the dataset version changes. Capped (~500 ops / ~256KB);
 * on overflow the full store state is snapshotted and the log truncated.
 * `storage` events keep other tabs in sync.
 */
import type { DemoData } from '../services/codegen/types'
import type { DemoStore, StoreOp } from './types'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface OpLogOptions {
  store: DemoStore
  /** Full storage key, e.g. `demokit-mode:oplog`. */
  key: string
  /** Published dataset version (generation id). Mismatch discards the log. */
  version: string
  /** Injectable for tests / non-browser runtimes. Defaults to window.localStorage. */
  storage?: StorageLike
  /** @default 500 */
  maxOps?: number
  /** @default 262144 (256 KB) */
  maxBytes?: number
}

export interface OpLogPersistence {
  /** Wipe persisted state (the "reset demo" path). */
  clear(): void
  /** Unsubscribe from the store and storage events. */
  destroy(): void
}

interface OpLogPayload {
  version: string
  seq: number
  snapshot?: DemoData
  ops: StoreOp[]
}

function defaultStorage(): StorageLike | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined
    const testKey = '__demokit_oplog_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return window.localStorage
  } catch {
    return undefined
  }
}

export function attachOpLogPersistence(options: OpLogOptions): OpLogPersistence {
  const { store, key, version, maxOps = 500, maxBytes = 256 * 1024 } = options
  const storage = options.storage ?? defaultStorage()

  let snapshotData: DemoData | null = null
  let ops: StoreOp[] = []
  let destroyed = false

  function read(): OpLogPayload | null {
    if (!storage) return null
    try {
      const raw = storage.getItem(key)
      if (!raw) return null
      return JSON.parse(raw) as OpLogPayload
    } catch {
      return null
    }
  }

  function persist(): void {
    if (!storage || destroyed) return
    try {
      let payload: OpLogPayload = {
        version,
        seq: store.seq(),
        ...(snapshotData ? { snapshot: snapshotData } : {}),
        ops,
      }
      const serialized = JSON.stringify(payload)
      if (ops.length > maxOps || serialized.length > maxBytes) {
        snapshotData = store.snapshot()
        ops = []
        payload = { version, seq: store.seq(), snapshot: snapshotData, ops }
        storage.setItem(key, JSON.stringify(payload))
        return
      }
      storage.setItem(key, serialized)
    } catch {
      // Storage full or restricted — persistence is best-effort.
    }
  }

  function restore(payload: OpLogPayload): void {
    if (payload.snapshot) {
      store.loadSnapshot(payload.snapshot, payload.seq - payload.ops.length)
    }
    store.applyOpLog(payload.ops)
    snapshotData = payload.snapshot ?? null
    ops = payload.ops
  }

  // --- Load phase ---
  try {
    const existing = read()
    if (existing) {
      if (existing.version === version) {
        restore(existing)
      } else {
        storage?.removeItem(key)
      }
    }
  } catch {
    // Malformed payload (missing ops, etc.) or removeItem threw: discard and continue.
    // Best-effort cleanup of corrupted data.
    try {
      storage?.removeItem(key)
    } catch {
      // Storage error — give up and proceed with fresh session.
    }
  }

  // --- Subscribe to mutations ---
  const unsubscribe = store.onOp((op) => {
    ops.push(op)
    persist()
  })

  // --- Tab sync ---
  const onStorage = (event: { key: string | null; newValue: string | null }) => {
    if (destroyed || event.key !== key || !event.newValue) return
    try {
      const payload = JSON.parse(event.newValue) as OpLogPayload
      if (payload.version !== version || payload.seq <= store.seq()) return
      if (payload.snapshot) {
        restore(payload)
      } else {
        const fresh = payload.ops.filter((op) => op.seq > store.seq())
        store.applyOpLog(fresh)
        ops = payload.ops
      }
    } catch {
      // Ignore malformed cross-tab payloads.
    }
  }
  const hasWindowEvents =
    typeof window !== 'undefined' && typeof window.addEventListener === 'function'
  if (hasWindowEvents) {
    window.addEventListener('storage', onStorage as EventListener)
  }

  return {
    clear(): void {
      snapshotData = null
      ops = []
      try {
        storage?.removeItem(key)
      } catch {
        // best-effort
      }
    },
    destroy(): void {
      destroyed = true
      unsubscribe()
      if (hasWindowEvents) {
        window.removeEventListener('storage', onStorage as EventListener)
      }
    },
  }
}
