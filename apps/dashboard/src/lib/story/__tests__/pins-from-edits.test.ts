import { describe, it, expect } from 'vitest'
import { pinsFromEdits, type RowEdit } from '../pins-from-edits'
import type { DemoData, StorySpec } from '@demokit-ai/core'

const spec = { pins: [{ path: 'Customer.name', value: 'Old Corp' }] } as unknown as StorySpec

describe('pinsFromEdits', () => {
  it('promotes row-0 edits to field pins, replacing same-path pins', () => {
    const edits: RowEdit[] = [
      { model: 'Customer', rowIndex: 0, field: 'name', value: 'Acme Corp' },
      { model: 'Customer', rowIndex: 0, field: 'plan', value: 'enterprise' },
      { model: 'Customer', rowIndex: 3, field: 'name', value: 'Ignored Inc' },
    ]
    const finalData: DemoData = {
      Customer: [{ name: 'Acme Corp', plan: 'enterprise' }],
    }
    const pins = pinsFromEdits(edits, finalData, spec)
    expect(pins).toEqual([
      { path: 'Customer.name', value: 'Acme Corp' },
      { path: 'Customer.plan', value: 'enterprise' },
    ])
  })

  it('keeps unrelated existing pins', () => {
    const withAggregate = { pins: [{ path: 'sum(Subscription.amount)', value: 100 }] } as unknown as StorySpec
    const finalData: DemoData = { Customer: [{ name: 'A' }] }
    const pins = pinsFromEdits(
      [{ model: 'Customer', rowIndex: 0, field: 'name', value: 'A' }],
      finalData,
      withAggregate
    )
    expect(pins).toEqual([
      { path: 'sum(Subscription.amount)', value: 100 },
      { path: 'Customer.name', value: 'A' },
    ])
  })

  it('pins the final row-0 value, not the stale edit value, after row 0 is deleted', () => {
    // User edits row 0's name, then deletes that row — a different record
    // (previously row 1) shifts into row 0. editHistory still carries the
    // stale pre-delete value; the saved draft's actual row 0 is 'Bar'.
    const edits: RowEdit[] = [{ model: 'Customer', rowIndex: 0, field: 'name', value: 'Foo Corp' }]
    const finalData: DemoData = { Customer: [{ name: 'Bar' }] }
    const pins = pinsFromEdits(edits, finalData, spec)
    expect(pins).toEqual([{ path: 'Customer.name', value: 'Bar' }])
  })

  it('pins the current row-0 value after row 0 is duplicated', () => {
    // Duplicating row 0 inserts the clone after it — row 0 itself doesn't
    // move, so the edited value is still read correctly.
    const edits: RowEdit[] = [{ model: 'Customer', rowIndex: 0, field: 'name', value: 'Acme' }]
    const finalData: DemoData = { Customer: [{ name: 'Acme' }, { name: 'Acme' }] }
    const pins = pinsFromEdits(edits, finalData, spec)
    expect(pins).toEqual([{ path: 'Customer.name', value: 'Acme' }])
  })

  it('still satisfies the invariant when the user edits back to the original value', () => {
    // Two edits recorded for the same path (New, then back to Old); the
    // final data matches the pre-edit original — the emitted pin must too.
    const edits: RowEdit[] = [
      { model: 'Customer', rowIndex: 0, field: 'name', value: 'New Corp' },
      { model: 'Customer', rowIndex: 0, field: 'name', value: 'Old Corp' },
    ]
    const finalData: DemoData = { Customer: [{ name: 'Old Corp' }] }
    const pins = pinsFromEdits(edits, finalData, spec)
    expect(pins).toEqual([{ path: 'Customer.name', value: 'Old Corp' }])
  })

  it('leaves a pre-existing pin untouched when the model has no rows in the final data', () => {
    const edits: RowEdit[] = [{ model: 'Customer', rowIndex: 0, field: 'name', value: 'Acme' }]
    const finalData: DemoData = { Customer: [] }
    const pins = pinsFromEdits(edits, finalData, spec)
    expect(pins).toEqual([{ path: 'Customer.name', value: 'Old Corp' }])
  })

  it('leaves a pre-existing pin untouched when the edited field is absent from the final row 0', () => {
    const edits: RowEdit[] = [{ model: 'Customer', rowIndex: 0, field: 'name', value: 'Acme' }]
    const finalData: DemoData = { Customer: [{ plan: 'enterprise' }] }
    const pins = pinsFromEdits(edits, finalData, spec)
    expect(pins).toEqual([{ path: 'Customer.name', value: 'Old Corp' }])
  })

  it('tolerates a spec whose pins array is missing', () => {
    const legacySpec = {} as unknown as StorySpec
    const finalData: DemoData = { Customer: [{ name: 'Acme' }] }
    const pins = pinsFromEdits(
      [{ model: 'Customer', rowIndex: 0, field: 'name', value: 'Acme' }],
      finalData,
      legacySpec
    )
    expect(pins).toEqual([{ path: 'Customer.name', value: 'Acme' }])
  })
})
