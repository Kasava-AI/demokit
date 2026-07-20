import { describe, it, expect } from 'vitest'
import { validateStoryConsistency } from '../validation/story'
import { generateFromStorySpec } from '../generation/generator'
import { TEST_SCHEMA, baseSpec } from './story-spec.test'

const BASE_TS = Date.UTC(2026, 6, 1)

describe('validateStoryConsistency', () => {
  it('flags an aggregate mismatch', () => {
    const data = { Subscription: [{ amount: 10 }, { amount: 20 }] }
    const errors = validateStoryConsistency(data, baseSpec({ pins: [{ path: 'sum(Subscription.amount)', value: 100 }] }), {
      baseTimestamp: BASE_TS,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0]!.type).toBe('aggregate_mismatch')
  })

  it('flags a count mismatch and a pin with no rows', () => {
    const errors = validateStoryConsistency(
      { Customer: [{ id: '1' }] },
      baseSpec({ pins: [{ path: 'count(Customer)', value: 3 }, { path: 'sum(Subscription.amount)', value: 5 }] }),
      { baseTimestamp: BASE_TS }
    )
    expect(errors.map((e) => e.type)).toEqual(['aggregate_mismatch', 'aggregate_mismatch'])
  })

  it('flags trend dates outside the window', () => {
    const errors = validateStoryConsistency(
      { Subscription: [{ createdAt: '2020-01-01T00:00:00.000Z' }] },
      baseSpec({ trends: [{ model: 'Subscription', dateField: 'createdAt', shape: 'up' }] }),
      { baseTimestamp: BASE_TS }
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]!.type).toBe('story_date_out_of_range')
  })

  it('flags out-of-order ISO-dated timeline events, ignoring prose dates', () => {
    const errors = validateStoryConsistency(
      {},
      baseSpec({
        events: [
          { when: '2026-03-01', event: 'Expansion closed' },
          { when: 'three months ago', event: 'Kickoff' },
          { when: '2026-01-01', event: 'First contact' },
        ],
      }),
      { baseTimestamp: BASE_TS }
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]!.type).toBe('story_date_out_of_range')
  })

  it('a satisfied spec produces zero errors end-to-end', () => {
    const spec = baseSpec({
      pins: [{ path: 'sum(Subscription.amount)', value: 120000 }, { path: 'count(Customer)', value: 4 }],
      anchors: [{ model: 'Customer', attrs: { name: 'Acme Corp' } }],
      trends: [{ model: 'Subscription', dateField: 'createdAt', shape: 'up' }],
    })
    const result = generateFromStorySpec(TEST_SCHEMA, spec, { baseTimestamp: BASE_TS })
    expect(result.validation.valid).toBe(true)
    expect(result.validation.errors).toEqual([])
  })

  it('generateDemoData surfaces story errors in the result', () => {
    // A field pin on a nonexistent model can't be applied — the validator reports it.
    const spec = baseSpec({ pins: [{ path: 'sum(Invoice.total)', value: 10 }] })
    const result = generateFromStorySpec(TEST_SCHEMA, spec, { baseTimestamp: BASE_TS })
    expect(result.validation.valid).toBe(false)
    expect(result.validation.errors.some((e) => e.type === 'aggregate_mismatch')).toBe(true)
  })

  it('flags a count pin contradicted by a larger anchor set', () => {
    const spec = baseSpec({
      pins: [{ path: 'count(Customer)', value: 2 }],
      anchors: [1, 2, 3].map((n) => ({ model: 'Customer', attrs: { name: `Anchor ${n}` } })),
    })
    const result = generateFromStorySpec(TEST_SCHEMA, spec, { baseTimestamp: BASE_TS })
    expect(result.data.Customer).toHaveLength(3)
    expect(result.validation.valid).toBe(false)
    expect(result.validation.errors.some((e) => e.type === 'aggregate_mismatch')).toBe(true)
  })
})
