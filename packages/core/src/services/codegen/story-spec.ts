/**
 * Zod schema for the StorySpec IR (spec §5.1) — the single source both the
 * spec-writer's structured output and route input validation parse against.
 */
import { z } from 'zod'
import type { StorySpec } from './types'

const stringFieldRuleSchema = z.object({
  type: z.literal('string'),
  strategy: z.enum(['oneOf', 'pattern']),
  values: z.array(z.string()).optional(),
  pattern: z.string().optional(),
})

const numberFieldRuleSchema = z.object({
  type: z.literal('number'),
  strategy: z.enum(['range', 'fixed']),
  min: z.number().optional(),
  max: z.number().optional(),
  precision: z.number().int().optional(),
  value: z.number().optional(),
})

const integerFieldRuleSchema = z.object({
  type: z.literal('integer'),
  strategy: z.enum(['range', 'fixed']),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  value: z.number().int().optional(),
})

const booleanFieldRuleSchema = z.object({
  type: z.literal('boolean'),
  strategy: z.enum(['fixed', 'weighted']),
  value: z.boolean().optional(),
  trueProbability: z.number().min(0).max(1).optional(),
})

const enumFieldRuleSchema = z.object({
  type: z.literal('enum'),
  strategy: z.enum(['subset', 'weighted']),
  allowedValues: z.array(z.string()).optional(),
  weights: z.record(z.string(), z.number()).optional(),
})

const datasetFieldRuleSchema = z.object({
  type: z.literal('fromDataset'),
  datasetId: z.string(),
  column: z.string(),
})

export const fieldRuleSchema = z.discriminatedUnion('type', [
  stringFieldRuleSchema,
  numberFieldRuleSchema,
  integerFieldRuleSchema,
  booleanFieldRuleSchema,
  enumFieldRuleSchema,
  datasetFieldRuleSchema,
])

const timelineEventSchema = z.object({
  when: z.string(),
  event: z.string(),
  characters: z.array(z.string()).optional(),
})

export const pinSchema = z.object({ path: z.string().min(1), value: z.unknown() })

export const anchorEntitySchema = z.object({
  model: z.string().min(1),
  attrs: z.record(z.string(), z.unknown()),
})

export const trendSpecSchema = z.object({
  model: z.string().min(1),
  dateField: z.string().min(1),
  shape: z.enum(['up', 'down', 'flat', 'seasonal']),
  slope: z.number().positive().optional(),
})

export const storySpecSchema = z.object({
  version: z.literal(1),
  scenario: z.string().min(1).max(2000),
  seed: z.number().int().nonnegative(),
  counts: z.record(z.string(), z.number().int().min(0).max(1000)).default({}),
  pins: z.array(pinSchema).max(50).default([]),
  anchors: z.array(anchorEntitySchema).max(50).default([]),
  trends: z.array(trendSpecSchema).max(20).default([]),
  events: z.array(timelineEventSchema).max(50).default([]),
  fieldRules: z.record(z.string(), fieldRuleSchema).default({}),
})

export function parseStorySpec(input: unknown): StorySpec {
  return storySpecSchema.parse(input) as StorySpec
}
