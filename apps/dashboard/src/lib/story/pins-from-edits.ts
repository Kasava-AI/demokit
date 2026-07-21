/**
 * Spec Decision 4: a hand-edited anchor field is promoted to a pin so
 * regeneration preserves it. v1 heuristic: anchors are generated first, so
 * row 0 is the anchor row; only row-0 edits pin.
 */
import type { Pin, StorySpec } from '@demokit-ai/core'

export interface RowEdit {
  model: string
  rowIndex: number
  field: string
  value: unknown
}

export function pinsFromEdits(edits: RowEdit[], spec: StorySpec): Pin[] {
  const merged = new Map<string, Pin>()
  for (const pin of spec.pins) merged.set(pin.path, pin)
  for (const edit of edits) {
    if (edit.rowIndex !== 0) continue
    const path = `${edit.model}.${edit.field}`
    merged.set(path, { path, value: edit.value })
  }
  return [...merged.values()]
}
