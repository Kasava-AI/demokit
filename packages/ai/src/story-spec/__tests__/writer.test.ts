import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateMock = vi.fn()
vi.mock('@mastra/core/agent', () => ({
  Agent: class {
    generate = generateMock
  },
}))

import { writeStorySpec } from '../writer'
import type { DemokitSchema } from '@demokit-ai/core'

const SCHEMA = {
  models: {
    Customer: {
      name: 'Customer',
      type: 'object',
      properties: {
        id: { name: 'id', type: 'string', format: 'uuid' },
        name: { name: 'name', type: 'string' },
        createdAt: { name: 'createdAt', type: 'string', format: 'date-time' },
      },
      required: ['id', 'name'],
    },
  },
  relationships: [],
} as unknown as DemokitSchema

const LLM_DRAFT = {
  scenario: 'A growing design-tools account',
  counts: { Customer: 8, Invoice: 4 },
  pins: [
    { path: 'count(Customer)', value: 8 },
    { path: 'sum(Invoice.total)', value: 90000 },
  ],
  anchors: [
    { model: 'Customer', attrs: { name: 'Acme Corp' } },
    { model: 'Invoice', attrs: { total: 500 } },
  ],
  trends: [
    { model: 'Customer', dateField: 'createdAt', shape: 'up' },
    { model: 'Customer', dateField: 'nosuchfield', shape: 'up' },
  ],
  events: [],
  fieldRules: {
    'Customer.name': { type: 'string', strategy: 'oneOf', values: ['Acme'] },
    'Invoice.total': { type: 'number', strategy: 'fixed', value: 1 },
  },
}

beforeEach(() => {
  generateMock.mockReset()
  generateMock.mockResolvedValue({ object: structuredClone(LLM_DRAFT) })
})

describe('writeStorySpec', () => {
  it('returns a valid spec with version and a prose-derived deterministic seed', async () => {
    const a = await writeStorySpec({ schema: SCHEMA, prose: 'Tell a growth story' })
    const b = await writeStorySpec({ schema: SCHEMA, prose: 'Tell a growth story' })
    expect(a.spec.version).toBe(1)
    expect(a.spec.seed).toBe(b.spec.seed)
    expect(a.spec.scenario).toBe('A growing design-tools account')
  })

  it('a caller-provided seed wins (edits reuse the existing seed)', async () => {
    const { spec } = await writeStorySpec({ schema: SCHEMA, prose: 'x', seed: 42 })
    expect(spec.seed).toBe(42)
  })

  it('drops references to unknown models/fields with warnings', async () => {
    const { spec, warnings } = await writeStorySpec({ schema: SCHEMA, prose: 'x' })
    expect(spec.counts).toEqual({ Customer: 8 })
    expect(spec.pins).toEqual([{ path: 'count(Customer)', value: 8 }])
    expect(spec.anchors).toEqual([{ model: 'Customer', attrs: { name: 'Acme Corp' } }])
    expect(spec.trends).toEqual([{ model: 'Customer', dateField: 'createdAt', shape: 'up' }])
    expect(Object.keys(spec.fieldRules)).toEqual(['Customer.name'])
    expect(warnings.length).toBeGreaterThanOrEqual(5)
  })

  it('passes structured output constraints to the agent', async () => {
    await writeStorySpec({ schema: SCHEMA, prose: 'x' })
    const [, callOptions] = generateMock.mock.calls[0]!
    expect(callOptions.structuredOutput?.schema).toBeDefined()
    expect(callOptions.providerOptions?.anthropic?.cacheControl?.type).toBe('ephemeral')
  })
})
