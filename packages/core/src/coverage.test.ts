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
})
