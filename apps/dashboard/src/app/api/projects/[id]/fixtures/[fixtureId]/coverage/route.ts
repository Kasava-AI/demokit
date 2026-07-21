/**
 * Coverage-health aggregate (spec §8): what fell through, what was blocked,
 * what's unmapped — grouped from api_call_logs over the last 7 days.
 */
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { projects, fixtures, apiCallLogs, eq, and, gte, ne, desc, sql, isNotNull } from '@db'

type RouteParams = { params: Promise<{ id: string; fixtureId: string }> }

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

    return NextResponse.json({ since: since.toISOString(), totals, topPaths })
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/fixtures/[fixtureId]/coverage')
  }
}
