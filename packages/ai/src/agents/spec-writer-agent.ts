/**
 * Spec-Writer Agent (spec §5.2 step 1) — the only free-text→structure step in
 * the system. Converts sales prose into a StorySpec draft; a Haiku-class
 * model is enough because the output is small, schema-constrained JSON.
 */
import { Agent } from '@mastra/core/agent'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { DemokitSchema } from '@demokit-ai/core'
import { buildSchemaContext } from './narrative-agent'

const SPEC_WRITER_INSTRUCTIONS = `You convert a salesperson's prose description of a demo story into a structured StorySpec. You never generate data rows — a deterministic generator executes your spec.

Field-by-field rules:
- scenario: restate the story in 1-3 sales-readable sentences.
- counts: per-model record counts, keyed by EXACT model names from the schema below. Pick sensible demo sizes (3-50) for models the story mentions; omit models it doesn't.
- pins: facts the user states as exact numbers. Paths must use one of these forms exactly:
  - "Model.field" (a single displayed value, e.g. the company name on the account record)
  - "sum(Model.field)" (a total, e.g. total ARR across subscriptions)
  - "avg(Model.field)" (an average)
  - "count(Model)" (an exact row count)
  Only pin what the user explicitly quantified. Never invent numbers.
- anchors: named entities the user wants visible on screen (e.g. "the Acme Corp account"). attrs holds only the fields the user specified.
- trends: growth/decline statements ("pipeline growing", "churn slowing") become { model, dateField, shape } where dateField is a date/date-time field that exists on that model and shape is one of up, down, flat, seasonal.
- events: dated milestones from the story, chronological order, ISO dates when the user gave one.
- fieldRules: only when the user constrains a field's allowed values or range, keyed "Model.field".

Reference ONLY models and fields that appear in the schema below. If the story mentions something the schema has no model for, leave it out.`

export interface CreateSpecWriterAgentOptions {
  /** Optional custom API key (BYOK). */
  apiKey?: string
}

export function createSpecWriterAgent(
  schema: DemokitSchema,
  options?: CreateSpecWriterAgentOptions
): Agent {
  const anthropic = createAnthropic(options?.apiKey ? { apiKey: options.apiKey } : {})
  return new Agent({
    id: 'demokit-spec-writer-agent',
    name: 'DemoKit Spec Writer',
    instructions: `${SPEC_WRITER_INSTRUCTIONS}\n\n${buildSchemaContext(schema)}`,
    model: anthropic('claude-haiku-4-5-20251001'),
  })
}
