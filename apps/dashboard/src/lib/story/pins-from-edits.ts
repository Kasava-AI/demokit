/**
 * Spec Decision 4: a hand-edited anchor field is promoted to a pin so
 * regeneration preserves it. v1 heuristic: anchors are generated first, so
 * row 0 is the anchor row; only row-0 edits pin.
 *
 * Pin values are derived from the FINAL saved data, not the edit log's
 * captured values. `RowEdit.value` (and the `editHistory` it's built from)
 * records what a field was set to *at the moment it was edited* — not a
 * stable fact about the saved draft. Once delete/duplicate are in the mix, a
 * row-0 field edited early in a session can be orphaned by a later delete
 * that shifts a different record into row 0; the edit-log value then no
 * longer matches what's actually in row 0 of the data being saved. Using
 * `edits` only to determine WHICH Model.field paths were touched at row 0,
 * then reading their CURRENT value out of `finalData`, keeps the invariant
 * that every emitted pin's value equals the saved draft's actual row-0 value
 * for that path — regardless of how many times the row was edited, reverted,
 * deleted, or duplicated in between.
 */
import type { DemoData, Pin, StorySpec } from '@demokit-ai/core'

export interface RowEdit {
  model: string
  rowIndex: number
  field: string
  value: unknown
}

export function pinsFromEdits(edits: RowEdit[], finalData: DemoData, spec: StorySpec): Pin[] {
  const merged = new Map<string, Pin>()
  for (const pin of spec.pins ?? []) merged.set(pin.path, pin)

  // Distinct row-0 Model.field paths touched anywhere in the edit log.
  // Deduped by path — the lookup below always reads the current value, so
  // "last write wins" is automatic regardless of how many times a path was
  // edited or in what order.
  const touched = new Map<string, { model: string; field: string }>()
  for (const edit of edits) {
    if (edit.rowIndex !== 0) continue
    touched.set(`${edit.model}.${edit.field}`, { model: edit.model, field: edit.field })
  }

  for (const [path, { model, field }] of touched) {
    const row0 = finalData[model]?.[0]
    // Skip — leave whatever pin (if any) was already there untouched — when
    // there's no row 0 left to read from, rather than writing a bogus value.
    if (!row0 || !(field in row0)) continue
    merged.set(path, { path, value: row0[field] })
  }

  return [...merged.values()]
}
