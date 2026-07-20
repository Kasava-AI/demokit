import { describe, it, expect } from 'vitest'
import { generateFromStorySpec } from '../generation/generator'
import { TREND_WINDOW_MS } from '../generation/story'
import { TEST_SCHEMA, baseSpec } from './story-spec.test'

const BASE_TS = Date.UTC(2026, 6, 1)

function quartileCounts(rows: Record<string, unknown>[], field: string): number[] {
  const start = BASE_TS - TREND_WINDOW_MS
  const counts = [0, 0, 0, 0]
  for (const row of rows) {
    const t = new Date(String(row[field])).getTime()
    const q = Math.min(3, Math.max(0, Math.floor(((t - start) / TREND_WINDOW_MS) * 4)))
    counts[q]! += 1
  }
  return counts
}

describe('story trends', () => {
  const spec = (shape: 'up' | 'down' | 'flat') =>
    baseSpec({
      counts: { Customer: 3, Subscription: 400 },
      trends: [{ model: 'Subscription', dateField: 'createdAt', shape }],
    })

  it('keeps every trended date inside the window', () => {
    const result = generateFromStorySpec(TEST_SCHEMA, spec('flat'), { baseTimestamp: BASE_TS })
    for (const row of result.data.Subscription!) {
      const t = new Date(String(row.createdAt)).getTime()
      expect(t).toBeGreaterThanOrEqual(BASE_TS - TREND_WINDOW_MS)
      expect(t).toBeLessThanOrEqual(BASE_TS)
      expect(row.createdAt).toBeDefined() // trended fields never hit optional dropout
    }
  })

  it('up-trend density increases toward the window end', () => {
    const result = generateFromStorySpec(TEST_SCHEMA, spec('up'), { baseTimestamp: BASE_TS })
    const [q1, , , q4] = quartileCounts(result.data.Subscription!, 'createdAt')
    expect(q4!).toBeGreaterThan(q1! * 1.5)
  })

  it('down-trend density decreases toward the window end', () => {
    const result = generateFromStorySpec(TEST_SCHEMA, spec('down'), { baseTimestamp: BASE_TS })
    const [q1, , , q4] = quartileCounts(result.data.Subscription!, 'createdAt')
    expect(q1!).toBeGreaterThan(q4! * 1.5)
  })

  it('is deterministic', () => {
    const a = generateFromStorySpec(TEST_SCHEMA, spec('up'), { baseTimestamp: BASE_TS })
    const b = generateFromStorySpec(TEST_SCHEMA, spec('up'), { baseTimestamp: BASE_TS })
    expect(a.data.Subscription).toEqual(b.data.Subscription)
  })
})
