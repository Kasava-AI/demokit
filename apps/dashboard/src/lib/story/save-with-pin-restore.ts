/**
 * Orchestrates the two-mutation save-as-draft flow (spec Decision 4 pins +
 * draft generation creation) so retries and partial failures behave safely.
 * Framework-agnostic and DI'd on purpose — SelectedFixturePreview.tsx wires
 * this to the real mutateAsync calls; tests wire it to plain vi.fn()s with
 * no React/hooks involved.
 */
import type { DemoData, Pin, StorySpec } from '@demokit-ai/core'
import { pinsFromEdits, type RowEdit } from './pins-from-edits'

export interface SaveWithPinRestoreParams<TGenerationResult> {
  /** Edits made this session — row-0 field edits are promoted to pins. */
  edits: RowEdit[]
  /** The data being saved as the new draft generation; pin values are read from here (see pins-from-edits.ts). */
  finalData: DemoData
  /** The linked variant's current StorySpec, or null when there's no linked variant / no storySpec yet — pin merging is skipped entirely when null. */
  spec: StorySpec | null
  /** Persists a new pins array onto the linked variant's storySpec. */
  updateVariantPins: (pins: Pin[]) => Promise<unknown>
  /** Creates the new draft generation. */
  createGeneration: () => Promise<TGenerationResult>
  /**
   * Called if draft creation fails AFTER the pin write already landed, and
   * the best-effort restore of the previous pins ALSO fails — the variant
   * may now be carrying pins from an abandoned session.
   */
  onPinsRestoreFailed?: () => void
}

/**
 * 1. If there's a linked variant with a spec, persist its updated pins
 *    FIRST — this write is idempotent (pinsFromEdits is deterministic given
 *    the same edits/finalData/spec), so retrying it after a failure is
 *    always safe and never compounds.
 * 2. Only then create the draft generation.
 * 3. If generation creation fails after the pin write already landed, this
 *    is a best-effort compensating write: restore the variant's pre-session
 *    pins so abandoning the save (e.g. the user clicks Cancel instead of
 *    retrying) doesn't leave the variant permanently carrying pins from a
 *    session that produced no draft. The original createGeneration error is
 *    always what's thrown; `onPinsRestoreFailed` fires as a side effect if
 *    the restore attempt itself also fails.
 */
export async function saveWithPinRestore<TGenerationResult>({
  edits,
  finalData,
  spec,
  updateVariantPins,
  createGeneration,
  onPinsRestoreFailed,
}: SaveWithPinRestoreParams<TGenerationResult>): Promise<TGenerationResult> {
  let previousPins: Pin[] | null = null

  if (spec) {
    previousPins = spec.pins ?? []
    const pins = pinsFromEdits(edits, finalData, spec)
    await updateVariantPins(pins)
  }

  try {
    return await createGeneration()
  } catch (createError) {
    if (previousPins !== null) {
      try {
        await updateVariantPins(previousPins)
      } catch {
        onPinsRestoreFailed?.()
      }
    }
    throw createError
  }
}
