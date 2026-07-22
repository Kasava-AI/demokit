/**
 * Coverage-health reporter (spec §8): batches demo-mode misses and errors and
 * POSTs them to the cloud. Paths and methods only — never values, bodies, or
 * query strings; that constraint is enforced here at the call-site types and
 * at the seams that construct events (pathname, not url). Reporting must
 * never break the host app: every failure is swallowed.
 */
import type { ShapeNode } from './shape'

export type CoverageEventType =
  | 'unmatched_request'
  | 'blocked_mutation'
  | 'unregistered_transform'
  | 'projection_error'

export interface CoverageEvent {
  type: CoverageEventType
  method: string
  path: string
  /**
   * Values-free response shape (spec §9.4), attached to `unmatched_request`
   * events by the fetch/msw transports' passthrough shape hook. Dedupe
   * merge is last-wins: a later event for the same key without a shape does
   * NOT clear a previously stored one.
   */
  shape?: ShapeNode
}

export interface CoverageReporterOptions {
  apiKey: string
  apiUrl?: string
  /** @default 10000 */
  flushIntervalMs?: number
  /** Distinct event keys that trigger an eager flush. @default 50 */
  maxBatch?: number
  /** Injectable for tests. @default globalThis.fetch */
  fetchFn?: typeof fetch
}

export interface CoverageReporter {
  record(event: CoverageEvent): void
  /**
   * Merge-only shape attachment (F1 fix, Phase 5 final review): sets or
   * creates the `unmatched_request` entry's shape WITHOUT incrementing
   * `count`. The provider's shape hooks (fetch's `onPassthroughShape`, msw's
   * bypass-response hook) call this instead of `record()` — `record()`
   * itself is reserved for `onUnmatchedRequest`'s own counting call, so one
   * real request produces exactly one count no matter whether a shape was
   * also observed for it. Order-independent: if the shape arrives before
   * the counting `record()` call for the same key, a zero-count placeholder
   * is created and the subsequent `record()` bumps it to 1; if it arrives
   * after, it merges onto the existing count without changing it.
   */
  attachShape(method: string, path: string, shape: ShapeNode): void
  flush(): Promise<void>
  destroy(): void
}

const DEFAULT_COVERAGE_API_URL = 'https://api.demokit.cloud/api'

export function createCoverageReporter(options: CoverageReporterOptions): CoverageReporter {
  const {
    apiKey,
    apiUrl = DEFAULT_COVERAGE_API_URL,
    flushIntervalMs = 10_000,
    maxBatch = 50,
    fetchFn = globalThis.fetch?.bind(globalThis),
  } = options

  const url = `${apiUrl.replace(/\/$/, '')}/coverage`
  const pending = new Map<string, CoverageEvent & { count: number }>()
  let destroyed = false

  const timer = setInterval(() => {
    void flush()
  }, flushIntervalMs)
  // Node returns a Timeout with unref; browsers return a number.
  ;(timer as { unref?: () => void }).unref?.()

  async function flush(): Promise<void> {
    if (pending.size === 0 || !fetchFn) return
    const events = [...pending.values()]
    pending.clear()
    try {
      await fetchFn(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      })
    } catch {
      // Swallowed by design — coverage reporting never breaks the app.
    }
  }

  return {
    record(event: CoverageEvent): void {
      if (destroyed) return
      const key = `${event.type} ${event.method} ${event.path}`
      const existing = pending.get(key)
      if (existing) {
        existing.count += 1
        // Last-wins: a later event without a shape must not clear one
        // already stored for this key (product call #3).
        if (event.shape !== undefined) existing.shape = event.shape
      } else {
        pending.set(key, { ...event, count: 1 })
      }
      if (pending.size >= maxBatch) void flush()
    },
    attachShape(method: string, path: string, shape: ShapeNode): void {
      if (destroyed) return
      const key = `unmatched_request ${method} ${path}`
      const existing = pending.get(key)
      if (existing) {
        existing.shape = shape
      } else {
        pending.set(key, { type: 'unmatched_request', method, path, shape, count: 0 })
      }
      if (pending.size >= maxBatch) void flush()
    },
    flush,
    destroy(): void {
      destroyed = true
      clearInterval(timer)
      void flush()
    },
  }
}
