/**
 * StorySpec execution helpers (spec §5.2): pin parsing, the post-generation
 * pin pass, and trend-shaped date generation (Task 4).
 */
import type { DemoData, Pin, StorySpec, TrendSpec } from '../types'
import type { DemokitSchema } from '../../schema'
import { hashString, seededRandom } from './random'

export type HeldFields = Record<string, Map<number, Set<string>>>

export type ParsedPin =
  | { kind: 'field'; model: string; field: string; value: unknown }
  | { kind: 'sum' | 'avg'; model: string; field: string; value: number }
  | { kind: 'count'; model: string; value: number }

const AGGREGATE_RE = /^(sum|avg)\(([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\)$/
const COUNT_RE = /^count\(([A-Za-z0-9_]+)\)$/
const FIELD_RE = /^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$/

export function parsePinPath(pin: Pin): ParsedPin | null {
  const aggregate = AGGREGATE_RE.exec(pin.path)
  if (aggregate) {
    const value = Number(pin.value)
    if (!Number.isFinite(value)) return null
    return { kind: aggregate[1] as 'sum' | 'avg', model: aggregate[2]!, field: aggregate[3]!, value }
  }
  const count = COUNT_RE.exec(pin.path)
  if (count) {
    const value = Number(pin.value)
    if (!Number.isInteger(value) || value < 0) return null
    return { kind: 'count', model: count[1]!, value }
  }
  const field = FIELD_RE.exec(pin.path)
  if (field) {
    return { kind: 'field', model: field[1]!, field: field[2]!, value: pin.value }
  }
  return null
}

function markHeld(held: HeldFields, model: string, index: number, field: string): void {
  const perModel = (held[model] ??= new Map())
  const fields = perModel.get(index) ?? new Set()
  fields.add(field)
  perModel.set(index, fields)
}

function heldIndices(held: HeldFields, model: string, field: string): Set<number> {
  const result = new Set<number>()
  for (const [index, fields] of held[model] ?? []) {
    if (fields.has(field)) result.add(index)
  }
  return result
}

const round2 = (value: number): number => Math.round(value * 100) / 100

/**
 * Scale a numeric column so it sums to `target`, leaving held rows (anchors,
 * field pins) untouched. Rounding drift is absorbed into the last adjustable
 * row so the aggregate holds exactly.
 */
export function scaleColumnToSum(
  rows: Record<string, unknown>[],
  field: string,
  target: number,
  heldIdx: Set<number>,
  options: { integer?: boolean } = {}
): void {
  const round = options.integer ? Math.round : round2
  const adjustable: number[] = []
  let heldSum = 0
  rows.forEach((row, i) => {
    const value = Number(row[field])
    if (!Number.isFinite(value)) return
    if (heldIdx.has(i)) heldSum += value
    else adjustable.push(i)
  })
  if (adjustable.length === 0) return

  const remaining = target - heldSum
  const currentSum = adjustable.reduce((total, i) => total + Number(rows[i]![field]), 0)
  if (currentSum > 0 && remaining > 0) {
    const factor = remaining / currentSum
    for (const i of adjustable) rows[i]![field] = round(Number(rows[i]![field]) * factor)
  } else {
    const even = remaining / adjustable.length
    for (const i of adjustable) rows[i]![field] = round(even)
  }

  const finalSum = rows.reduce((total, row) => {
    const value = Number(row[field])
    return Number.isFinite(value) ? total + value : total
  }, 0)
  const last = adjustable[adjustable.length - 1]!
  rows[last]![field] = round(Number(rows[last]![field]) + (options.integer ? Math.round(target - finalSum) : round2(target - finalSum)))
}

/** Trend window: rows are distributed over the year ending at baseTimestamp. */
export const TREND_WINDOW_MS = 365 * 86400000

/**
 * Deterministic trend-shaped date: draw a uniform per (seed,row,field), warp
 * it through the shape's inverse-CDF, and map onto the window (1.0 = most
 * recent). 'up' concentrates rows near the window end, 'down' near the start,
 * 'seasonal' adds sinusoidal clustering. `slope` steepens the warp.
 */
export function generateTrendDate(
  trend: TrendSpec,
  index: number,
  seed: number,
  baseTimestamp: number | undefined,
  format: string | undefined
): string {
  const end = baseTimestamp ?? Date.now()
  const u = seededRandom(seed + index * 1000 + hashString(trend.dateField) + 7)
  const slope = trend.slope ?? 1
  let position: number
  switch (trend.shape) {
    case 'up':
      position = Math.pow(u, 1 / (1 + slope))
      break
    case 'down':
      position = 1 - Math.pow(u, 1 / (1 + slope))
      break
    case 'seasonal': {
      const wobble = 0.12 * Math.min(slope, 2)
      position = Math.min(1, Math.max(0, u + wobble * Math.sin(4 * Math.PI * u)))
      break
    }
    case 'flat':
    default:
      position = u
  }
  const date = new Date(end - (1 - position) * TREND_WINDOW_MS)
  return format === 'date' ? (date.toISOString().split('T')[0] ?? '') : date.toISOString()
}

/** Post-generation pin pass. Field pins first — they become held values. */
export function applyPins(
  data: DemoData,
  story: StorySpec,
  held: HeldFields,
  schema?: DemokitSchema
): void {
  const parsed = story.pins.map(parsePinPath)

  for (const pin of parsed) {
    if (pin?.kind !== 'field') continue
    const rows = data[pin.model]
    if (!rows?.length) continue
    rows[0]![pin.field] = pin.value
    markHeld(held, pin.model, 0, pin.field)
  }

  for (const pin of parsed) {
    if (pin?.kind !== 'sum' && pin?.kind !== 'avg') continue
    const rows = data[pin.model]
    if (!rows?.length) continue
    const finiteCount = rows.filter((row) => Number.isFinite(Number(row[pin.field]))).length
    if (finiteCount === 0) continue
    // avg targets the rows that HAVE the field — the validator averages the
    // same set, so optional-field dropout no longer guarantees a mismatch.
    const target = pin.kind === 'avg' ? pin.value * finiteCount : pin.value
    const integer = schema?.models[pin.model]?.properties?.[pin.field]?.type === 'integer'
    scaleColumnToSum(rows, pin.field, target, heldIndices(held, pin.model, pin.field), { integer })
  }
}
