/**
 * Deterministic StorySpec execution (spec §5.2 step 2): no LLM. Lands as a
 * draft generation (spec §6); rows are marked unreviewed when the fixture
 * already serves a published generation. Extracted from the dashboard's
 * generate-story route (Phase 4 Task 8) so DemoKit Cloud's CI auto-fill
 * (Task 13) can call the exact same persistence logic without going
 * through an HTTP round-trip — it imports this module via the `@oss*`
 * alias family.
 *
 * Framework-agnostic on purpose: no `next/*` imports, no route helpers.
 * Callers own auth/authz and the HTTP response shape; this module owns the
 * generation write, the linter run, and the draft/publish split.
 */
import type { Database } from '@db'
import { fixtureGenerations, fixtures, publishes, eq, and } from '@db'
import { generateFromStorySpec } from '@demokit-ai/core'
import type { DemokitSchema, DemoData, StorySpec } from '@demokit-ai/core'
import { buildNarrativeSample, runNarrativeLinter, type LinterFinding } from '@demokit-ai/ai'

export interface StoryDraftInput {
  /** The drizzle instance the route already uses (packages/db's `Database` type). */
  db: Database
  projectId: string
  fixtureId: string
  schema: DemokitSchema
  spec: StorySpec
  /** 'dashboard' = a human clicked Generate; 'ci_fill' = CI auto-fill (Task 13). */
  source: 'dashboard' | 'ci_fill'
  /** Stamped once by the caller and persisted for reproducibility. Defaults to now(). */
  baseTimestamp?: number
  /**
   * Route passes true (today's dashboard behavior): a fixture with nothing
   * published yet auto-publishes its first valid generation. CI passes
   * false — CI must never publish (spec §9.3 never-auto-publish): the
   * bootstrap-publish branch is skipped entirely and the generation always
   * lands as a draft, with `unreviewedRows` populated regardless of
   * whether the fixture has ever published anything — CI fills are
   * unreviewed by definition.
   */
  allowBootstrapPublish: boolean
  /**
   * Recorded as the publisher on the bootstrap-publish audit row.
   * Dashboard-only; CI never reads it because `allowBootstrapPublish:
   * false` never takes that branch.
   */
  publishedById?: string | null
}

export interface StoryDraftResult {
  generationId: string
  warnings: string[]
  linterFindings: Array<{ severity: 'notice' | 'warning'; message: string; path: string }>
  unreviewedRowCount: number
}

function collectRowIds(data: Record<string, Record<string, unknown>[]>): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [model, rows] of Object.entries(data)) {
    const ids = rows
      .map((row) => row.id ?? row.ID ?? row._id)
      .filter((id): id is string | number => id !== undefined && id !== null)
      .map(String)
    if (ids.length > 0) result[model] = ids
  }
  return result
}

export async function createStoryDraftGeneration(input: StoryDraftInput): Promise<StoryDraftResult> {
  const { db, projectId, fixtureId, schema, spec, source, allowBootstrapPublish, publishedById } = input
  const baseTimestamp = input.baseTimestamp ?? Date.now()

  // The interface takes ids, not a pre-loaded row, so both callers (the
  // dashboard route, which already 404s on a missing fixture before
  // reaching here, and cloud's CI path) get the same tenancy-scoped lookup.
  const fixture = await db.query.fixtures.findFirst({
    where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, projectId)),
  })
  if (!fixture) {
    throw new Error(`Fixture not found: ${fixtureId}`)
  }

  const startTime = Date.now()
  const result = generateFromStorySpec(schema, spec, { baseTimestamp })
  const durationMs = Date.now() - startTime

  const hasPublished = !!fixture.publishedGenerationId
  const { totalRecords, recordsByModel } = result.metadata

  // CI fills are unreviewed by definition (spec §9.3 never-auto-publish) —
  // populate unreviewedRows even on a fixture that has never published.
  // The dashboard path keeps today's narrower rule: only mark rows
  // unreviewed when landing this draft would silently sit behind an
  // already-served (published) generation.
  const markUnreviewed = !allowBootstrapPublish || hasPublished
  const unreviewedRows = markUnreviewed
    ? collectRowIds(result.data as Record<string, Record<string, unknown>[]>)
    : null

  const [generation] = await db
    .insert(fixtureGenerations)
    .values({
      fixtureId,
      label: `Story: ${spec.scenario.slice(0, 80)}`,
      level: 'relationship-valid',
      data: result.data as Record<string, unknown[]>,
      validationValid: result.validation.valid,
      validationErrorCount: result.validation.errors.length,
      validationWarningCount: result.validation.warnings.length,
      validationErrors: result.validation.errors.map((e) => ({
        type: e.type,
        model: e.model,
        field: e.field,
        message: e.message,
      })),
      recordCount: totalRecords,
      recordsByModel,
      inputParameters: { storySpec: spec, baseTimestamp },
      unreviewedRows,
      source,
      status: 'completed',
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs,
    })
    .returning()

  // Advisory narrative linter (spec §5.2.4): silent no-op without a key,
  // never blocks or fails the generation — dashboard and CI fills alike.
  let linterFindings: LinterFinding[] = []
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const sample = buildNarrativeSample(result.data as DemoData, { spec })
      linterFindings = await runNarrativeLinter({ scenario: spec.scenario, sample })
      if (linterFindings.length > 0) {
        await db
          .update(fixtureGenerations)
          .set({ linterFindings })
          .where(eq(fixtureGenerations.id, generation.id))
      }
    } catch (error) {
      // Advisory only (spec §5.2.4) — a linter failure never fails the request.
      console.warn('[DemoKit] Narrative linter skipped:', error)
      linterFindings = []
    }
  }

  // Draft/publish split (spec §6), same semantics as the generations POST —
  // except CI (allowBootstrapPublish: false) never takes the
  // bootstrap-publish branch: a CI fill always lands as a draft, even on a
  // fixture that has never published anything.
  if (allowBootstrapPublish && !hasPublished && result.validation.valid) {
    await db.transaction(async (tx) => {
      await tx.insert(publishes).values({
        fixtureId,
        generationId: generation.id,
        previousGenerationId: null,
        publishedById: publishedById ?? null,
        note: 'initial publish',
      })
      await tx
        .update(fixtures)
        .set({ publishedGenerationId: generation.id, updatedAt: new Date() })
        .where(eq(fixtures.id, fixtureId))
    })
  } else {
    await db
      .update(fixtures)
      .set({ draftGenerationId: generation.id, updatedAt: new Date() })
      .where(eq(fixtures.id, fixtureId))
  }

  const unreviewedRowCount = unreviewedRows
    ? Object.values(unreviewedRows).reduce((sum, ids) => sum + ids.length, 0)
    : 0

  return {
    generationId: generation.id,
    warnings: result.validation.warnings.map((w) => w.message),
    linterFindings,
    unreviewedRowCount,
  }
}
