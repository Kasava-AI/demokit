import { describe, it, expect } from 'vitest'
import { generateFromStorySpec } from '../generation/generator'
import { TEST_SCHEMA, baseSpec } from './story-spec.test'
import type { DemokitSchema } from '../../schema'

const BASE_TS = Date.UTC(2026, 6, 1)

// Extend the shared schema with an integer column and an optional numeric column.
const INT_SCHEMA = structuredClone(TEST_SCHEMA) as DemokitSchema
INT_SCHEMA.models.Subscription!.properties!.seats = { name: 'seats', type: 'integer' } as never
INT_SCHEMA.models.Subscription!.required = ['id', 'customerId', 'amount', 'createdAt', 'seats']
INT_SCHEMA.models.Subscription!.properties!.discount = { name: 'discount', type: 'number' } as never
// discount stays optional → ~30% of rows lack it.

const sumOf = (rows: Record<string, unknown>[], field: string) =>
  rows.reduce((t, r) => (Number.isFinite(Number(r[field])) ? t + Number(r[field]) : t), 0)

describe('integer-aware back-solve', () => {
  it('sum pin on an integer column yields whole numbers and an exact sum', () => {
    const result = generateFromStorySpec(
      INT_SCHEMA,
      baseSpec({ pins: [{ path: 'sum(Subscription.seats)', value: 1200 }] }),
      { baseTimestamp: BASE_TS }
    )
    const rows = result.data.Subscription!
    expect(rows.every((r) => Number.isInteger(r.seats))).toBe(true)
    expect(sumOf(rows, 'seats')).toBe(1200)
    expect(result.validation.valid).toBe(true)
  })

  it('avg pin on an optional column targets finite rows and validates clean', () => {
    const result = generateFromStorySpec(
      INT_SCHEMA,
      baseSpec({ counts: { Customer: 5, Subscription: 40 }, pins: [{ path: 'avg(Subscription.discount)', value: 12.5 }] }),
      { baseTimestamp: BASE_TS }
    )
    const rows = result.data.Subscription!
    const finite = rows.map((r) => Number(r.discount)).filter(Number.isFinite)
    expect(finite.length).toBeGreaterThan(0)
    expect(finite.length).toBeLessThan(rows.length) // dropout really occurred
    const avg = finite.reduce((a, b) => a + b, 0) / finite.length
    expect(Math.abs(avg - 12.5)).toBeLessThanOrEqual(0.01)
    expect(result.validation.valid).toBe(true)
  })

  it('held integer values stay held and the remainder lands in whole units', () => {
    const result = generateFromStorySpec(
      INT_SCHEMA,
      baseSpec({
        anchors: [{ model: 'Subscription', attrs: { seats: 111 } }],
        pins: [{ path: 'sum(Subscription.seats)', value: 900 }],
      }),
      { baseTimestamp: BASE_TS }
    )
    const rows = result.data.Subscription!
    expect(rows[0]!.seats).toBe(111)
    expect(rows.every((r) => Number.isInteger(r.seats))).toBe(true)
    expect(sumOf(rows, 'seats')).toBe(900)
  })
})
