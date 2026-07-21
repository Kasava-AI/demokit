import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateMock = vi.fn()
vi.mock('@mastra/core/agent', () => ({
  Agent: class {
    generate = generateMock
  },
}))

import { runNarrativeLinter } from '../linter'
import { buildNarrativeSample } from '../sample'

const sample = buildNarrativeSample({ M: [{ id: '1', n: 2 }] })

beforeEach(() => {
  generateMock.mockReset()
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
})

describe('runNarrativeLinter', () => {
  it('returns validated findings from the agent', async () => {
    generateMock.mockResolvedValue({
      object: { findings: [{ severity: 'warning', message: 'ARR looks implausibly low for an enterprise story', path: 'sum(Subscription.amount)' }] },
    })
    const findings = await runNarrativeLinter({ scenario: 'Enterprise expansion', sample })
    expect(findings).toHaveLength(1)
    expect(findings[0]!.severity).toBe('warning')
    const [, callOptions] = generateMock.mock.calls[0]!
    expect(callOptions.structuredOutput?.schema).toBeDefined()
  })

  it('skips silently without a key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const findings = await runNarrativeLinter({ scenario: 'x', sample })
    expect(findings).toEqual([])
    expect(generateMock).not.toHaveBeenCalled()
  })

  it('returns [] on agent errors and malformed output', async () => {
    generateMock.mockRejectedValueOnce(new Error('rate limit'))
    expect(await runNarrativeLinter({ scenario: 'x', sample })).toEqual([])
    generateMock.mockResolvedValueOnce({ object: { findings: [{ severity: 'fatal', message: 'nope', path: 'x' }] } })
    expect(await runNarrativeLinter({ scenario: 'x', sample })).toEqual([])
  })
})
