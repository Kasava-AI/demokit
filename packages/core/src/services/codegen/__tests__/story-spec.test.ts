import { describe, it, expect } from 'vitest'
import { parseStorySpec, storySpecSchema } from '../story-spec'
import { generateFromStorySpec } from '../generation/generator'
import type { StorySpec } from '../types'
import type { DemokitSchema } from '../../schema'

export const TEST_SCHEMA: DemokitSchema = {
  models: {
    Customer: {
      name: 'Customer',
      type: 'object',
      properties: {
        id: { name: 'id', type: 'string', format: 'uuid' },
        name: { name: 'name', type: 'string' },
        createdAt: { name: 'createdAt', type: 'string', format: 'date-time' },
      },
      required: ['id', 'name', 'createdAt'],
    },
    Subscription: {
      name: 'Subscription',
      type: 'object',
      properties: {
        id: { name: 'id', type: 'string', format: 'uuid' },
        customerId: { name: 'customerId', type: 'string', format: 'uuid' },
        amount: { name: 'amount', type: 'number' },
        createdAt: { name: 'createdAt', type: 'string', format: 'date-time' },
      },
      required: ['id', 'customerId', 'amount', 'createdAt'],
    },
  },
  relationships: [
    {
      from: { model: 'Subscription', field: 'customerId' },
      to: { model: 'Customer', field: 'id' },
      type: 'many-to-one',
      required: true,
    },
  ],
} as unknown as DemokitSchema

export function baseSpec(overrides: Partial<StorySpec> = {}): StorySpec {
  return {
    version: 1,
    scenario: 'A healthy mid-market SaaS book of business',
    seed: 42,
    counts: { Customer: 5, Subscription: 20 },
    pins: [],
    anchors: [],
    trends: [],
    events: [],
    fieldRules: {},
    ...overrides,
  }
}

describe('storySpecSchema', () => {
  it('round-trips a full spec', () => {
    const spec = baseSpec({
      pins: [{ path: 'sum(Subscription.amount)', value: 120000 }],
      anchors: [{ model: 'Customer', attrs: { name: 'Acme Corp' } }],
      trends: [{ model: 'Subscription', dateField: 'createdAt', shape: 'up' }],
      events: [{ when: '2026-01-05', event: 'Enterprise tier launched' }],
      fieldRules: {
        'Subscription.amount': { type: 'number', strategy: 'range', min: 100, max: 900 },
      },
    })
    expect(parseStorySpec(spec)).toEqual(spec)
  })

  it('defaults optional collections so a minimal LLM draft parses', () => {
    const parsed = storySpecSchema.parse({ version: 1, scenario: 'x', seed: 1 })
    expect(parsed.counts).toEqual({})
    expect(parsed.pins).toEqual([])
    expect(parsed.anchors).toEqual([])
    expect(parsed.trends).toEqual([])
    expect(parsed.events).toEqual([])
    expect(parsed.fieldRules).toEqual({})
  })

  it('rejects an unknown trend shape', () => {
    expect(() =>
      parseStorySpec(baseSpec({ trends: [{ model: 'Subscription', dateField: 'createdAt', shape: 'sideways' as never }] }))
    ).toThrow()
  })
})

describe('generateFromStorySpec', () => {
  const BASE_TS = Date.UTC(2026, 6, 1)

  it('is deterministic for the same spec + baseTimestamp', () => {
    const a = generateFromStorySpec(TEST_SCHEMA, baseSpec(), { baseTimestamp: BASE_TS })
    const b = generateFromStorySpec(TEST_SCHEMA, baseSpec(), { baseTimestamp: BASE_TS })
    expect(a.data).toEqual(b.data)
  })

  it('uses story counts and seed, letting explicit options win', () => {
    const result = generateFromStorySpec(TEST_SCHEMA, baseSpec(), { baseTimestamp: BASE_TS })
    expect(result.data.Customer).toHaveLength(5)
    expect(result.data.Subscription).toHaveLength(20)

    const overridden = generateFromStorySpec(TEST_SCHEMA, baseSpec(), {
      baseTimestamp: BASE_TS,
      counts: { Customer: 2 },
    })
    expect(overridden.data.Customer).toHaveLength(2)
    expect(overridden.data.Subscription).toHaveLength(20)

    const differentSeed = generateFromStorySpec(TEST_SCHEMA, baseSpec({ seed: 43 }), { baseTimestamp: BASE_TS })
    expect(differentSeed.data).not.toEqual(result.data)
  })

  it('merges story fieldRules beneath caller customRules', () => {
    const result = generateFromStorySpec(
      TEST_SCHEMA,
      baseSpec({ fieldRules: { 'Subscription.amount': { type: 'number', strategy: 'fixed', value: 111 } } }),
      { baseTimestamp: BASE_TS }
    )
    expect(result.data.Subscription!.every((row) => row.amount === 111)).toBe(true)

    const overridden = generateFromStorySpec(
      TEST_SCHEMA,
      baseSpec({ fieldRules: { 'Subscription.amount': { type: 'number', strategy: 'fixed', value: 111 } } }),
      {
        baseTimestamp: BASE_TS,
        customRules: { version: 1, fieldRules: { 'Subscription.amount': { type: 'number', strategy: 'fixed', value: 222 } } },
      }
    )
    expect(overridden.data.Subscription!.every((row) => row.amount === 222)).toBe(true)
  })
})
