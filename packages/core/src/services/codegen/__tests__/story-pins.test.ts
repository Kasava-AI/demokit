import { describe, it, expect } from 'vitest'
import { generateFromStorySpec } from '../generation/generator'
import { parsePinPath } from '../generation/story'
import { TEST_SCHEMA, baseSpec } from './story-spec.test'

const BASE_TS = Date.UTC(2026, 6, 1)

const sum = (rows: Record<string, unknown>[], field: string) =>
  rows.reduce((total, row) => {
    const value = Number(row[field])
    return Number.isFinite(value) ? total + value : total
  }, 0)

describe('parsePinPath', () => {
  it('parses all four forms and rejects garbage', () => {
    expect(parsePinPath({ path: 'Customer.name', value: 'Acme' })).toEqual({ kind: 'field', model: 'Customer', field: 'name', value: 'Acme' })
    expect(parsePinPath({ path: 'sum(Subscription.amount)', value: 120000 })).toEqual({ kind: 'sum', model: 'Subscription', field: 'amount', value: 120000 })
    expect(parsePinPath({ path: 'avg(Subscription.amount)', value: 500 })).toEqual({ kind: 'avg', model: 'Subscription', field: 'amount', value: 500 })
    expect(parsePinPath({ path: 'count(Customer)', value: 7 })).toEqual({ kind: 'count', model: 'Customer', value: 7 })
    expect(parsePinPath({ path: 'sum(Subscription.amount)', value: 'not a number' })).toBeNull()
    expect(parsePinPath({ path: 'nonsense(', value: 1 })).toBeNull()
  })
})

describe('story pins', () => {
  it('count pin overrides the model count', () => {
    const result = generateFromStorySpec(TEST_SCHEMA, baseSpec({ pins: [{ path: 'count(Customer)', value: 7 }] }), {
      baseTimestamp: BASE_TS,
    })
    expect(result.data.Customer).toHaveLength(7)
  })

  it('sum pin back-solves the column exactly', () => {
    const result = generateFromStorySpec(
      TEST_SCHEMA,
      baseSpec({ pins: [{ path: 'sum(Subscription.amount)', value: 120000 }] }),
      { baseTimestamp: BASE_TS }
    )
    expect(sum(result.data.Subscription!, 'amount')).toBeCloseTo(120000, 2)
    expect(result.validation.valid).toBe(true)
  })

  it('field pin sets the first row and survives aggregate scaling', () => {
    const result = generateFromStorySpec(
      TEST_SCHEMA,
      baseSpec({
        pins: [
          { path: 'Subscription.amount', value: 999 },
          { path: 'sum(Subscription.amount)', value: 50000 },
        ],
      }),
      { baseTimestamp: BASE_TS }
    )
    expect(result.data.Subscription![0]!.amount).toBe(999)
    expect(sum(result.data.Subscription!, 'amount')).toBeCloseTo(50000, 2)
  })

  it('anchor-provided values are held during scaling', () => {
    const result = generateFromStorySpec(
      TEST_SCHEMA,
      baseSpec({
        anchors: [{ model: 'Subscription', attrs: { amount: 1234 } }],
        pins: [{ path: 'sum(Subscription.amount)', value: 80000 }],
      }),
      { baseTimestamp: BASE_TS }
    )
    expect(result.data.Subscription![0]!.amount).toBe(1234)
    expect(sum(result.data.Subscription!, 'amount')).toBeCloseTo(80000, 2)
  })
})
