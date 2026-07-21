import { describe, it, expect } from 'vitest'
import { pinsFromEdits, type RowEdit } from '../pins-from-edits'
import type { StorySpec } from '@demokit-ai/core'

const spec = { pins: [{ path: 'Customer.name', value: 'Old Corp' }] } as unknown as StorySpec

describe('pinsFromEdits', () => {
  it('promotes row-0 edits to field pins, replacing same-path pins', () => {
    const edits: RowEdit[] = [
      { model: 'Customer', rowIndex: 0, field: 'name', value: 'Acme Corp' },
      { model: 'Customer', rowIndex: 0, field: 'plan', value: 'enterprise' },
      { model: 'Customer', rowIndex: 3, field: 'name', value: 'Ignored Inc' },
    ]
    const pins = pinsFromEdits(edits, spec)
    expect(pins).toEqual([
      { path: 'Customer.name', value: 'Acme Corp' },
      { path: 'Customer.plan', value: 'enterprise' },
    ])
  })

  it('keeps unrelated existing pins', () => {
    const withAggregate = { pins: [{ path: 'sum(Subscription.amount)', value: 100 }] } as unknown as StorySpec
    const pins = pinsFromEdits([{ model: 'Customer', rowIndex: 0, field: 'name', value: 'A' }], withAggregate)
    expect(pins).toEqual([
      { path: 'sum(Subscription.amount)', value: 100 },
      { path: 'Customer.name', value: 'A' },
    ])
  })
})
