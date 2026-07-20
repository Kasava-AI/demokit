import { describe, it, expect } from 'vitest'
import { generateFromStorySpec } from '../generation/generator'
import { TEST_SCHEMA, baseSpec } from './story-spec.test'

const BASE_TS = Date.UTC(2026, 6, 1)

describe('story anchors', () => {
  it('creates anchor rows first with attrs applied verbatim', () => {
    const result = generateFromStorySpec(
      TEST_SCHEMA,
      baseSpec({ anchors: [{ model: 'Customer', attrs: { name: 'Acme Corp' } }] }),
      { baseTimestamp: BASE_TS }
    )
    expect(result.data.Customer![0]!.name).toBe('Acme Corp')
    expect(result.data.Customer).toHaveLength(5)
  })

  it('floors the model count at the anchor count', () => {
    const anchors = [1, 2, 3].map((n) => ({ model: 'Customer', attrs: { name: `Anchor ${n}` } }))
    const result = generateFromStorySpec(TEST_SCHEMA, baseSpec({ anchors, counts: { Customer: 1, Subscription: 5 } }), {
      baseTimestamp: BASE_TS,
    })
    expect(result.data.Customer).toHaveLength(3)
    expect(result.data.Customer!.map((row) => row.name)).toEqual(['Anchor 1', 'Anchor 2', 'Anchor 3'])
  })

  it('prefers anchor rows as FK targets', () => {
    const result = generateFromStorySpec(
      TEST_SCHEMA,
      baseSpec({
        anchors: [{ model: 'Customer', attrs: { name: 'Acme Corp' } }],
        counts: { Customer: 10, Subscription: 200 },
      }),
      { baseTimestamp: BASE_TS }
    )
    const anchorId = String(result.data.Customer![0]!.id)
    const hits = result.data.Subscription!.filter((row) => String(row.customerId) === anchorId).length
    // Uniform would give ~20 of 200; the 0.5 anchor preference gives ~100.
    expect(hits).toBeGreaterThan(60)
    // Still deterministic and FK-valid.
    expect(result.validation.valid).toBe(true)
  })
})
