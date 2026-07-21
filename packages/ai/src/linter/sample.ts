/**
 * Deterministic sample builder (spec §5.2.4): the linter reviews a SAMPLE —
 * anchors, precomputed aggregates, min/max dates, numeric ranges — never the
 * full row set. All arithmetic happens HERE; the LLM only judges plausibility.
 */
import { parsePinPath, type DemoData, type StorySpec } from '@demokit-ai/core'

export interface NarrativeSample {
  rowCounts: Record<string, number>
  anchors: Array<{ model: string; attrs: Record<string, unknown>; row: Record<string, unknown> | null }>
  pins: Array<{ path: string; target: unknown; actual: unknown }>
  dateRanges: Array<{ model: string; field: string; min: string | null; max: string | null }>
  numericRanges: Array<{ model: string; field: string; min: number; max: number }>
  events: Array<{ when: string; event: string }>
}

const MAX_ANCHORS = 10
const MAX_NUMERIC_FIELDS = 20
const MAX_STRING = 120
const SCAN_ROWS = 200

const truncate = (value: unknown): unknown =>
  typeof value === 'string' && value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value

const truncateRow = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).slice(0, 20).map(([k, v]) => [k, truncate(v)]))

function computePin(data: DemoData, path: string, target: unknown): unknown {
  const parsed = parsePinPath({ path, value: target })
  if (!parsed) return null
  const rows = data[parsed.model] ?? []
  if (parsed.kind === 'count') return rows.length
  if (parsed.kind === 'field') return rows[0]?.[parsed.field] ?? null
  const numeric = rows.map((r) => Number(r[parsed.field])).filter(Number.isFinite)
  if (numeric.length === 0) return null
  const sum = numeric.reduce((a, b) => a + b, 0)
  return parsed.kind === 'avg' ? Math.round((sum / numeric.length) * 100) / 100 : Math.round(sum * 100) / 100
}

export function buildNarrativeSample(data: DemoData, options: { spec?: StorySpec } = {}): NarrativeSample {
  const spec = options.spec

  const rowCounts: Record<string, number> = {}
  for (const [model, rows] of Object.entries(data)) rowCounts[model] = rows.length

  const anchors = (spec?.anchors ?? []).slice(0, MAX_ANCHORS).map((anchor) => {
    const rows = data[anchor.model] ?? []
    const match =
      rows.find((row) => Object.entries(anchor.attrs).every(([k, v]) => String(row[k]) === String(v))) ?? rows[0] ?? null
    return { model: anchor.model, attrs: anchor.attrs, row: match ? truncateRow(match) : null }
  })

  const pins = (spec?.pins ?? []).map((pin) => ({ path: pin.path, target: pin.value, actual: computePin(data, pin.path, pin.value) }))

  const dateRanges = (spec?.trends ?? []).map((trend) => {
    const times = (data[trend.model] ?? [])
      .map((row) => row[trend.dateField])
      .filter((v): v is string => typeof v === 'string')
      .map((v) => new Date(v).getTime())
      .filter((t) => !Number.isNaN(t))
    return {
      model: trend.model,
      field: trend.dateField,
      min: times.length ? new Date(Math.min(...times)).toISOString() : null,
      max: times.length ? new Date(Math.max(...times)).toISOString() : null,
    }
  })

  const numericRanges: NarrativeSample['numericRanges'] = []
  for (const [model, rows] of Object.entries(data)) {
    if (numericRanges.length >= MAX_NUMERIC_FIELDS) break
    const fields = new Set<string>()
    for (const row of rows.slice(0, SCAN_ROWS)) for (const key of Object.keys(row)) fields.add(key)
    for (const field of fields) {
      if (numericRanges.length >= MAX_NUMERIC_FIELDS) break
      const values = rows.slice(0, SCAN_ROWS).map((r) => Number(r[field])).filter(Number.isFinite)
      if (values.length === 0) continue
      // Skip id-ish / boolean-ish columns: a constant value across 2+ rows isn't a
      // meaningful range. A lone row has nothing to compare against, so it stands.
      if (values.length > 1 && new Set(values).size < 2) continue
      numericRanges.push({ model, field, min: Math.min(...values), max: Math.max(...values) })
    }
  }

  const events = (spec?.events ?? []).map((e) => ({ when: e.when, event: e.event }))

  return { rowCounts, anchors, pins, dateRanges, numericRanges, events }
}
