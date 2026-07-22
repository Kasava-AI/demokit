/**
 * Coverage-health aggregate (spec §8): what fell through, what was blocked,
 * what's unmapped — grouped from api_call_logs over the last 7 days.
 *
 * Phase 5 Task 6 adds shape-drift-on-read: recent `unmatched_request` rows
 * that carry a Task 1 `ShapeNode` are reduced to one observation per
 * distinct method+path pair and diffed against the project's synced schema
 * via Task 5's `detectShapeDrift`. Additive response change only — existing
 * consumers of `totals`/`topPaths` are unaffected.
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
 * Bounded select of recent shape-observed rows before the latest-per-pair
 * reduction below (`latestShapePerPath`) — large enough to still find up to
 * `MAX_DISTINCT_SHAPE_PATHS` distinct pairs under heavy duplicate traffic
 * from the same endpoint, small enough to keep the query itself cheap. This
 * expresses the "bounded select then reduce in JS" half of the brief's
 * latest-per-pair requirement (the alternative — a `DISTINCT ON` /
 * `row_number() OVER (...)` window query — would work too, but this keeps
 * the query in the same plain-chain drizzle style as `totals`/`topPaths`
 * above).
 */
const SHAPE_ROWS_SELECT_LIMIT = 1000

/** Cap on distinct (method, path) pairs fed into `detectShapeDrift`. */
const MAX_DISTINCT_SHAPE_PATHS = 200

/**
 * Reduce recency-ordered rows (latest timestamp first) to one ObservedShape
 * per distinct method+path pair — the most recent shape for that pair wins,
 * matching the coverage reporter's own last-wins dedupe semantics
 * (packages/core/src/coverage.ts) — capped at MAX_DISTINCT_SHAPE_PATHS
 * distinct pairs.
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
      const shapeRows = await db
        .select({
          method: apiCallLogs.method,
          path: apiCallLogs.path,
          shape: apiCallLogs.shape,
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
        .orderBy(desc(apiCallLogs.timestamp))
        .limit(SHAPE_ROWS_SELECT_LIMIT)

      const observed = latestShapePerPath(shapeRows)
      const report = detectShapeDrift(observed, schema)
      drift = { ...report, findings: rollupFindings(report.findings) }
    }

    return NextResponse.json({ since: since.toISOString(), totals, topPaths, drift })
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/fixtures/[fixtureId]/coverage')
  }
}
