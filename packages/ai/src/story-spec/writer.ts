import {
  storySpecSchema,
  parsePinPath,
  type DemokitSchema,
  type StorySpec,
} from '@demokit-ai/core'
import { createSpecWriterAgent } from '../agents/spec-writer-agent'

/** The LLM drafts everything except version/seed — those are set here. */
const specWriterOutputSchema = storySpecSchema.omit({ version: true, seed: true })

type SpecDraft = Omit<StorySpec, 'version' | 'seed'>

export interface WriteStorySpecOptions {
  schema: DemokitSchema
  prose: string
  /** Reuse the existing spec's seed on edits so regeneration diffs stay minimal (spec §5.2). Defaults to a hash of the prose. */
  seed?: number
  /** Optional custom API key (BYOK). */
  apiKey?: string
}

export interface WriteStorySpecResult {
  spec: StorySpec
  /** Model/field references the schema doesn't know, dropped deterministically. */
  warnings: string[]
}

export async function writeStorySpec(options: WriteStorySpecOptions): Promise<WriteStorySpecResult> {
  const { schema, prose, apiKey } = options
  const agent = createSpecWriterAgent(schema, { apiKey })
  const result = await agent.generate(prose, {
    structuredOutput: { schema: specWriterOutputSchema },
    providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
  })
  const draft = specWriterOutputSchema.parse(result.object) as SpecDraft
  const { sanitized, warnings } = sanitizeSpec(draft, schema)
  const spec: StorySpec = {
    ...sanitized,
    version: 1,
    seed: options.seed ?? hashProse(prose),
  }
  return { spec: storySpecSchema.parse(spec) as StorySpec, warnings }
}

function sanitizeSpec(draft: SpecDraft, schema: DemokitSchema): { sanitized: SpecDraft; warnings: string[] } {
  const warnings: string[] = []
  const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)
  const hasModel = (model: string) => hasOwn(schema.models, model)
  const hasField = (model: string, field: string) =>
    hasModel(model) && hasOwn(schema.models[model]!.properties ?? {}, field)

  const counts: Record<string, number> = {}
  for (const [model, count] of Object.entries(draft.counts)) {
    if (hasModel(model)) counts[model] = count
    else warnings.push(`counts: unknown model "${model}" dropped`)
  }

  const pins = draft.pins.filter((pin) => {
    const parsed = parsePinPath(pin)
    if (!parsed) {
      warnings.push(`pins: unparseable path "${pin.path}" dropped`)
      return false
    }
    const ok = parsed.kind === 'count' ? hasModel(parsed.model) : hasField(parsed.model, parsed.field)
    if (!ok) warnings.push(`pins: "${pin.path}" references an unknown model or field, dropped`)
    return ok
  })

  const anchors = draft.anchors.filter((anchor) => {
    if (hasModel(anchor.model)) return true
    warnings.push(`anchors: unknown model "${anchor.model}" dropped`)
    return false
  })

  const trends = draft.trends.filter((trend) => {
    if (hasField(trend.model, trend.dateField)) return true
    warnings.push(`trends: "${trend.model}.${trend.dateField}" not in schema, dropped`)
    return false
  })

  const fieldRules: SpecDraft['fieldRules'] = {}
  for (const [key, rule] of Object.entries(draft.fieldRules)) {
    const segments = key.split('.')
    if (segments.length !== 2) {
      warnings.push(`fieldRules: "${key}" is not a Model.field key, dropped`)
      continue
    }
    const [model, field] = segments
    if (model && field && hasField(model, field)) fieldRules[key] = rule
    else warnings.push(`fieldRules: "${key}" not in schema, dropped`)
  }

  return { sanitized: { ...draft, counts, pins, anchors, trends, fieldRules }, warnings }
}

/** djb2 — deterministic default seed so the same prose regenerates identically. */
function hashProse(prose: string): number {
  let hash = 5381
  for (let i = 0; i < prose.length; i++) {
    hash = ((hash << 5) + hash + prose.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
