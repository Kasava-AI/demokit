/**
 * Narrative Linter Agent (spec §5.2.4) — advisory reviewer. Judges whether a
 * dataset SAMPLE plausibly tells the story the scenario prose claims. It is
 * forbidden to do arithmetic: every aggregate in the sample is precomputed
 * and authoritative.
 */
import { Agent } from '@mastra/core/agent'
import { createAnthropic } from '@ai-sdk/anthropic'

const LINTER_INSTRUCTIONS = `You review demo datasets for narrative plausibility. You receive a scenario (the story sales wants to tell) and a SAMPLE of the generated dataset: row counts, anchor rows, precomputed pinned aggregates (target vs actual), date ranges, numeric ranges, and timeline events.

Rules:
- Every number in the sample is precomputed and authoritative. NEVER recompute, re-add, or re-average anything. Deterministic validators already checked sums, counts, and date order — do not report arithmetic mismatches.
- Judge plausibility and coherence against the scenario: values that undermine the story (a "thriving enterprise account" with a $40 subscription), implausible ranges (negative amounts, ages over 120, dates far outside the story's era), anchor rows that contradict their described role, name/tone mismatches (a healthcare story full of crypto-sounding companies).
- severity: 'warning' for things a prospect would notice on a call; 'notice' for polish.
- path: the pin path ('sum(Model.field)'), 'Model.field' for a field concern, or 'events'.
- At most 8 findings. An empty findings list is a good outcome — do not invent problems.`

export interface CreateLinterAgentOptions {
  /** Optional custom API key (BYOK). */
  apiKey?: string
}

export function createLinterAgent(options?: CreateLinterAgentOptions): Agent {
  const anthropic = createAnthropic(options?.apiKey ? { apiKey: options.apiKey } : {})
  return new Agent({
    id: 'demokit-narrative-linter-agent',
    name: 'DemoKit Narrative Linter',
    instructions: LINTER_INSTRUCTIONS,
    model: anthropic('claude-haiku-4-5-20251001'),
  })
}
