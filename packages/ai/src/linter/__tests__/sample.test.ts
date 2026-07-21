import { describe, it, expect } from 'vitest'
import { buildNarrativeSample } from '../sample'
import type { StorySpec } from '@demokit-ai/core'

const spec: StorySpec = {
  version: 1,
  scenario: 'A growing account',
  seed: 1,
  counts: {},
  pins: [{ path: 'sum(Subscription.amount)', value: 100 }, { path: 'count(Customer)', value: 2 }],
  anchors: [{ model: 'Customer', attrs: { name: 'Acme Corp' } }],
  trends: [{ model: 'Subscription', dateField: 'createdAt', shape: 'up' }],
  events: [{ when: '2026-01-05', event: 'Launch' }],
  fieldRules: {},
}

const data = {
  Customer: [{ id: 'c1', name: 'Acme Corp' }, { id: 'c2', name: 'Globex' }],
  Subscription: [
    { id: 's1', customerId: 'c1', amount: 60, createdAt: '2026-05-01T00:00:00.000Z' },
    { id: 's2', customerId: 'c2', amount: 40, createdAt: '2026-06-01T00:00:00.000Z' },
  ],
}

describe('buildNarrativeSample', () => {
  it('is deterministic and computes counts, pins, anchors, ranges', () => {
    const a = buildNarrativeSample(data, { spec })
    const b = buildNarrativeSample(data, { spec })
    expect(a).toEqual(b)
    expect(a.rowCounts).toEqual({ Customer: 2, Subscription: 2 })
    expect(a.pins).toEqual([
      { path: 'sum(Subscription.amount)', target: 100, actual: 100 },
      { path: 'count(Customer)', target: 2, actual: 2 },
    ])
    expect(a.anchors[0]!.row).toEqual({ id: 'c1', name: 'Acme Corp' })
    expect(a.dateRanges).toEqual([
      { model: 'Subscription', field: 'createdAt', min: '2026-05-01T00:00:00.000Z', max: '2026-06-01T00:00:00.000Z' },
    ])
    expect(a.numericRanges).toContainEqual({ model: 'Subscription', field: 'amount', min: 40, max: 60 })
  })

  it('degrades to data-only stats without a spec and truncates long strings', () => {
    const long = 'x'.repeat(500)
    const sample = buildNarrativeSample({ M: [{ id: '1', note: long, n: 5 }] })
    expect(sample.pins).toEqual([])
    expect(sample.anchors).toEqual([])
    expect(sample.rowCounts).toEqual({ M: 1 })
    expect(sample.numericRanges).toContainEqual({ model: 'M', field: 'n', min: 5, max: 5 })
  })
})
