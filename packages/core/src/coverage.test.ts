import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCoverageReporter } from './coverage'

const okFetch = () => vi.fn().mockResolvedValue(new Response(null, { status: 202 }))

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createCoverageReporter', () => {
  it('batches and dedupes events, flushing on the interval', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users' })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users' })
    reporter.record({ type: 'blocked_mutation', method: 'POST', path: '/api/orders' })
    expect(fetchFn).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe('https://c.test/api/coverage')
    expect(init.headers.Authorization).toBe('Bearer dk_live_x')
    expect(JSON.parse(init.body)).toEqual({
      events: [
        { type: 'unmatched_request', method: 'GET', path: '/api/users', count: 2 },
        { type: 'blocked_mutation', method: 'POST', path: '/api/orders', count: 1 },
      ],
    })
  })

  it('flushes eagerly at maxBatch distinct events and on destroy', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn, maxBatch: 2 })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/a' })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/b' })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    reporter.record({ type: 'projection_error', method: 'GET', path: '/c' })
    reporter.destroy()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    reporter.record({ type: 'projection_error', method: 'GET', path: '/d' }) // after destroy: dropped
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('swallows network errors and keeps working', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'))
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/a' })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchFn).toHaveBeenCalledTimes(1) // no throw escaped
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/a' })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('includes shape in the flushed wire format when the event carries one', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    const shape = { t: 'object', keys: { id: { t: 'string' } } } as const
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users', shape })
    await vi.advanceTimersByTimeAsync(10_000)
    const [, init] = fetchFn.mock.calls[0]!
    expect(JSON.parse(init.body)).toEqual({
      events: [{ type: 'unmatched_request', method: 'GET', path: '/api/users', count: 1, shape }],
    })
  })

  it('omits shape from the wire format when the event never carried one', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users' })
    await vi.advanceTimersByTimeAsync(10_000)
    const [, init] = fetchFn.mock.calls[0]!
    const events = JSON.parse(init.body).events as Array<Record<string, unknown>>
    expect(events[0]).not.toHaveProperty('shape')
  })

  it('dedupe merge: last shape wins, and a later event without a shape does not clear the stored one', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    const shapeA = { t: 'string' } as const
    const shapeB = { t: 'number' } as const
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users', shape: shapeA })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users', shape: shapeB })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users' }) // no shape: must not clear
    await vi.advanceTimersByTimeAsync(10_000)
    const [, init] = fetchFn.mock.calls[0]!
    expect(JSON.parse(init.body)).toEqual({
      events: [{ type: 'unmatched_request', method: 'GET', path: '/api/users', count: 3, shape: shapeB }],
    })
  })

  // F1 regression (Phase 5 final review): the provider wires TWO callbacks
  // for the same real unmatched request — `onUnmatchedRequest` (counting)
  // and the shape hook (`onPassthroughShape` / `handleMswBypassResponse`).
  // Before this fix both called `record()`, so one real request produced
  // `count: 2`. `attachShape` is the merge-only counterpart the shape hooks
  // now call instead: it sets/creates the entry's shape WITHOUT
  // incrementing `count`, and the merge must hold regardless of which of
  // the two callbacks happens to fire first.
  it('attachShape merges a shape onto an existing pending record without incrementing count (record-then-attach)', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    const shape = { t: 'object', keys: { id: { t: 'string' } } } as const
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users' })
    reporter.attachShape('GET', '/api/users', shape)
    await vi.advanceTimersByTimeAsync(10_000)
    const [, init] = fetchFn.mock.calls[0]!
    expect(JSON.parse(init.body)).toEqual({
      events: [{ type: 'unmatched_request', method: 'GET', path: '/api/users', count: 1, shape }],
    })
  })

  it('attachShape creates a zero-count entry that a later record() bumps to 1 (attach-then-record, order-independent)', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    const shape = { t: 'object', keys: { id: { t: 'string' } } } as const
    reporter.attachShape('GET', '/api/users', shape)
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/users' })
    await vi.advanceTimersByTimeAsync(10_000)
    const [, init] = fetchFn.mock.calls[0]!
    expect(JSON.parse(init.body)).toEqual({
      events: [{ type: 'unmatched_request', method: 'GET', path: '/api/users', count: 1, shape }],
    })
  })

  it('attachShape is a no-op after destroy, mirroring record()', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    reporter.destroy()
    reporter.attachShape('GET', '/api/users', { t: 'string' })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  // F4 regression (Phase 5 final review, round 2 — introduced by the F1 fix
  // above): `attachShape` can create a zero-count placeholder when a shape
  // arrives before its counting `record()` call. That's harmless within a
  // batch (the next `record()` bumps it to 1), but if a flush lands in the
  // gap the placeholder would otherwise ship as a `count: 0` wire event —
  // the cloud ingest validates `count: min(1)` and 400s the WHOLE batch on
  // one such orphan, silently losing every other event in the window.
  // `flush()` must drop zero-count entries instead of sending or carrying
  // them over; an orphaned shape is costless to lose since it re-derives on
  // the endpoint's next request.
  it('drops a zero-count orphan entry at flush, never shipping it on the wire', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    reporter.record({ type: 'unmatched_request', method: 'GET', path: '/api/orders' })
    reporter.attachShape('GET', '/api/users', { t: 'string' }) // orphan: no matching record() this batch
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [, init] = fetchFn.mock.calls[0]!
    const events = JSON.parse(init.body).events as Array<Record<string, unknown>>
    expect(events).toEqual([{ type: 'unmatched_request', method: 'GET', path: '/api/orders', count: 1 }])
    expect(events.find((e) => e.path === '/api/users')).toBeUndefined()
    expect(events.some((e) => e.count === 0)).toBe(false)
  })

  it('skips the network call entirely when every pending entry is a zero-count orphan', async () => {
    const fetchFn = okFetch()
    const reporter = createCoverageReporter({ apiKey: 'dk_live_x', apiUrl: 'https://c.test/api', fetchFn })
    reporter.attachShape('GET', '/api/users', { t: 'string' }) // orphan only, no record() at all
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
