/**
 * Coverage-health aggregate (spec §8): what fell through, what was blocked,
 * what's unmapped — grouped from api_call_logs over the last 7 days.
 *
 * Phase 5 Task 6 adds shape-drift-on-read: recent `unmatched_request` rows
 * that carry a Task 1 `ShapeNode` are reduced (via SQL `DISTINCT ON`, see
 * the query below) to one observation per distinct method+path pair and
 * diffed against the project's synced schema via Task 5's
 * `detectShapeDrift`. Additive response change only — existing consumers of
 * `totals`/`topPaths` are unaffected.
 */
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { projects, fixtures, apiCallLogs, eq, and, gte, ne, desc, sql, isNotNull } from '@db'
import { detectShapeDrift } from '@demokit-ai/core'
import type { DemokitSchema, DriftFinding, ObservedShape, ShapeDriftReport, ShapeNode } from '@demokit-ai/core'

type RouteParams = { params: Promise<{ id: string; fixtureId: string }> }

/** A drift finding rolled up across concrete paths — see `rollupFindings`. */
type DriftRow = DriftFinding & { occurrences: number }

type CoverageDrift = Omit<ShapeDriftReport, 'findings'> & { findings: DriftRow[] }

/**
 * Cap on distinct (method, path) pairs fed into `detectShapeDrift` — applied
 * as the outer query's SQL `LIMIT` below (the primary enforcement) and
 * again defensively in `latestShapePerPath` (belt-and-suspenders: makes the
 * route provably capped even if a future change to the query loses the SQL
 * `LIMIT`, and keeps the cap unit-testable without a live Postgres).
 */
const MAX_DISTINCT_SHAPE_PATHS = 200

/**
 * Reduce rows to one ObservedShape per distinct method+path pair, capped at
 * MAX_DISTINCT_SHAPE_PATHS.
 *
 * Latest-per-pair dedup is now done in SQL (`DISTINCT ON`, see the query
 * below) rather than here — an earlier version of this route selected a
 * bounded window of *raw* rows (ordered by raw event recency, not per-pair)
 * before reducing in JS. Under skewed traffic (one or a few chatty
 * endpoints dominating the window), that raw-row window could be entirely
 * consumed before a genuinely-recent but low-frequency pair's only row was
 * ever seen, silently dropping that endpoint's drift from the report even
 * though it was within the 7-day window — a pair's survival depended on
 * *someone else's* request volume, not its own recency. `DISTINCT ON`
 * operates over the full WHERE-filtered set, so every distinct pair in the
 * window is considered regardless of how many raw events any other pair
 * generated.
 *
 * This function is now a defensive no-op in the common case (its input has
 * already been deduped and recency-capped by the query) — kept because it
 * makes the route provably correct against a duplicate or oversized input
 * without needing a live Postgres to exercise `DISTINCT ON` against, and
 * costs nothing meaningful since it only ever sees a small, already-bounded
 * row set.
 */
function latestShapePerPath(
  rows: Array<{ method: string | null; path: string | null; shape: unknown }>
): ObservedShape[] {
  const seen = new Map<string, ObservedShape>()
  for (const row of rows) {
    if (!row.method || !row.path || !row.shape) continue
    const key = `${row.method} ${row.path}`
    if (seen.has(key)) continue
    if (seen.size >= MAX_DISTINCT_SHAPE_PATHS) break
    seen.set(key, { method: row.method, path: row.path, shape: row.shape as ShapeNode })
  }
  return [...seen.values()]
}

/**
 * Collapse findings that differ only by which concrete path observed them —
 * e.g. `GET /users/1` and `GET /users/2` both missing `email` against the
 * same templated `/users/{id}` endpoint — into one row with an
 * `occurrences` count. Grouped on (kind, endpointPath ?? path, key): the
 * `unknown_endpoint` kind has no `endpointPath`, so it falls back to the
 * observed `path` itself. Keeps the Task 5 classifier pure (no rollup
 * concept there) and the UI from repeating the same finding once per
 * concrete path (review note carried over from Task 5).
 */
function rollupFindings(findings: DriftFinding[]): DriftRow[] {
  const rows = new Map<string, DriftRow>()
  for (const finding of findings) {
    const groupKey = `${finding.kind}::${finding.endpointPath ?? finding.path}::${finding.key ?? ''}`
    const existing = rows.get(groupKey)
    if (existing) {
      existing.occurrences += 1
    } else {
      rows.set(groupKey, { ...finding, occurrences: 1 })
    }
  }
  return [...rows.values()]
}

/**
 * Whether a project has a schema synced at all. Deliberately the same
 * plain `!!schema` truthiness check used throughout the dashboard (e.g.
 * `hasSchema` in app/projects/[id]/page.tsx, FixturesTab.tsx,
 * SchemaUploadSheet.tsx) rather than generate-story route's models-based
 * guard — that route additionally falls back to merged project-source
 * schemas when models are empty, which doesn't apply here: this route has
 * no such fallback, so "synced" just means "the column holds a schema."
 */
function hasSyncedSchema(schema: DemokitSchema | null | undefined): schema is DemokitSchema {
  return !!schema
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId } = await params
    const user = await getAuthenticatedUser()
    if (!user) return unauthorized()

    const db = getDb()
    const project = await db.query.projects.findFirst({ where: eq(projects.id, id) })
    if (!project) return notFound('Project')
    const fixture = await db.query.fixtures.findFirst({
      where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
    })
    if (!fixture) return notFound('Fixture')

    const since = new Date(Date.now() - 7 * 86400000)

    const totals = await db
      .select({ eventType: apiCallLogs.eventType, count: sql<number>`sum(${apiCallLogs.count})::int` })
      .from(apiCallLogs)
      .where(and(eq(apiCallLogs.fixtureId, fixtureId), gte(apiCallLogs.timestamp, since)))
      .groupBy(apiCallLogs.eventType)

    const topPaths = await db
      .select({
        eventType: apiCallLogs.eventType,
        method: apiCallLogs.method,
        path: apiCallLogs.path,
        count: sql<number>`sum(${apiCallLogs.count})::int`,
      })
      .from(apiCallLogs)
      .where(
        and(
          eq(apiCallLogs.fixtureId, fixtureId),
          gte(apiCallLogs.timestamp, since),
          ne(apiCallLogs.eventType, 'fixture_fetch'),
          isNotNull(apiCallLogs.path)
        )
      )
      .groupBy(apiCallLogs.eventType, apiCallLogs.method, apiCallLogs.path)
      .orderBy(desc(sql`sum(${apiCallLogs.count})`))
      .limit(50)

    // No schema synced -> nothing to diff against; skip the shape query
    // entirely rather than paying for a select whose result would be
    // discarded (see hasSyncedSchema).
    const projectSchema = project.schema as unknown as DemokitSchema | undefined
    const schema = hasSyncedSchema(projectSchema) ? projectSchema : null

    let drift: CoverageDrift | null = null
    if (schema) {
      // One row per distinct (method, path) pair, holding that pair's
      // LATEST shape — `DISTINCT ON` requires its leading `ORDER BY`
      // columns to match the `DISTINCT ON` list, so `timestamp DESC` as the
      // tiebreaker is what makes "one row per pair" mean "the latest row
      // for that pair" rather than an arbitrary one. This subquery is
      // evaluated over the *entire* WHERE-filtered set (every matching row
      // in the 7-day window) — not a bounded raw-row prefix — so a pair
      // can't be crowded out by another pair's request volume (see
      // `latestShapePerPath`'s doc comment for the bug this replaces).
      const latestPerPair = db
        .selectDistinctOn([apiCallLogs.method, apiCallLogs.path], {
          method: apiCallLogs.method,
          path: apiCallLogs.path,
          shape: apiCallLogs.shape,
          timestamp: apiCallLogs.timestamp,
        })
        .from(apiCallLogs)
        .where(
          and(
            eq(apiCallLogs.fixtureId, fixtureId),
            eq(apiCallLogs.eventType, 'unmatched_request'),
            gte(apiCallLogs.timestamp, since),
            isNotNull(apiCallLogs.shape)
          )
        )
        .orderBy(apiCallLogs.method, apiCallLogs.path, desc(apiCallLogs.timestamp))
        .as('latest_shape_per_pair')

      // `DISTINCT ON`'s own output is ordered by (method, path) — i.e.
      // alphabetically, not by recency. Re-sort by timestamp here before
      // capping so the pairs kept under MAX_DISTINCT_SHAPE_PATHS are the
      // 200 MOST RECENT pairs, not just the first 200 alphabetically.
      const shapeRows = await db
        .select({
          method: latestPerPair.method,
          path: latestPerPair.path,
          shape: latestPerPair.shape,
        })
        .from(latestPerPair)
        .orderBy(desc(latestPerPair.timestamp))
        .limit(MAX_DISTINCT_SHAPE_PATHS)

      const observed = latestShapePerPath(shapeRows)
      const report = detectShapeDrift(observed, schema)
      drift = { ...report, findings: rollupFindings(report.findings) }
    }

    return NextResponse.json({ since: since.toISOString(), totals, topPaths, drift })
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/fixtures/[fixtureId]/coverage')
  }
}
