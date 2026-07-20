/**
 * Deterministic story-consistency checks (spec §5.2 item 4): pinned
 * aggregates, trend windows, and timeline date order. No LLM arithmetic —
 * these are the checks the narrative linter (Phase 3) is forbidden to do.
 */
import type { DemoData, StorySpec, ValidationError } from '../types'
import { parsePinPath, TREND_WINDOW_MS } from '../generation/story'

const EPSILON = 0.01
const DAY_MS = 86400000

export interface StoryValidationOptions {
  /** The baseTimestamp the generation ran with. Defaults to now. */
  baseTimestamp?: number
}

export function validateStoryConsistency(
  data: DemoData,
  story: StorySpec,
  options: StoryValidationOptions = {}
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const pin of story.pins) {
    const parsed = parsePinPath(pin)
    if (!parsed) {
      errors.push({
        type: 'constraint_violation',
        model: '',
        field: pin.path,
        message: `Unparseable pin path: ${pin.path}`,
      })
      continue
    }
    const rows = data[parsed.model]
    if (parsed.kind === 'count') {
      const actual = rows?.length ?? 0
      if (actual !== parsed.value) {
        errors.push({
          type: 'aggregate_mismatch',
          model: parsed.model,
          field: '',
          message: `count(${parsed.model}) is ${actual}, pinned to ${parsed.value}`,
          value: actual,
          expected: String(parsed.value),
        })
      }
      continue
    }
    if (!rows?.length) {
      errors.push({
        type: 'aggregate_mismatch',
        model: parsed.model,
        field: parsed.field,
        message: `Pin ${pin.path} targets ${parsed.model}, but no rows were generated`,
      })
      continue
    }
    if (parsed.kind === 'field') {
      const actual = rows[0]![parsed.field]
      if (String(actual) !== String(parsed.value)) {
        errors.push({
          type: 'constraint_violation',
          model: parsed.model,
          field: parsed.field,
          message: `Pinned field ${pin.path} is ${String(actual)}, expected ${String(parsed.value)}`,
          value: actual,
          expected: String(parsed.value),
        })
      }
      continue
    }
    const numeric = rows.map((row) => Number(row[parsed.field])).filter((value) => Number.isFinite(value))
    if (numeric.length === 0) {
      errors.push({
        type: 'aggregate_mismatch',
        model: parsed.model,
        field: parsed.field,
        message: `Pin ${pin.path} targets a column with no numeric values`,
      })
      continue
    }
    const total = numeric.reduce((a, b) => a + b, 0)
    const actual = parsed.kind === 'avg' ? total / numeric.length : total
    if (Math.abs(actual - parsed.value) > EPSILON) {
      errors.push({
        type: 'aggregate_mismatch',
        model: parsed.model,
        field: parsed.field,
        message: `${pin.path} is ${actual.toFixed(2)}, pinned to ${parsed.value}`,
        value: actual,
        expected: String(parsed.value),
      })
    }
  }

  const end = options.baseTimestamp ?? Date.now()
  const start = end - TREND_WINDOW_MS - DAY_MS
  for (const trend of story.trends) {
    const rows = data[trend.model] ?? []
    rows.forEach((row, index) => {
      const raw = row[trend.dateField]
      if (typeof raw !== 'string') return
      const time = new Date(raw).getTime()
      if (Number.isNaN(time)) return
      if (time < start || time > end + DAY_MS) {
        errors.push({
          type: 'story_date_out_of_range',
          model: trend.model,
          field: trend.dateField,
          message: `${trend.model}[${index}].${trend.dateField} (${raw}) falls outside the story window`,
          value: raw,
          recordId: typeof row.id === 'string' ? row.id : undefined,
        })
      }
    })
  }

  const datedEvents = story.events
    .map((event) => ({ event, time: new Date(event.when).getTime() }))
    .filter((entry) => !Number.isNaN(entry.time))
  for (let i = 1; i < datedEvents.length; i++) {
    if (datedEvents[i]!.time < datedEvents[i - 1]!.time) {
      errors.push({
        type: 'story_date_out_of_range',
        model: '',
        field: 'events',
        message: `Timeline event "${datedEvents[i]!.event.event}" is dated before "${datedEvents[i - 1]!.event.event}" but listed after it`,
      })
    }
  }

  return errors
}
