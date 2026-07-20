/**
 * Publish API Route (OSS) — spec §6.
 *
 * POST publishes a generation (default: the current draft). The gate
 * hard-fails only on deterministic validation errors; everything else is a
 * warning. Rollback = POST with an older generationId — one insert
 * re-pointing, the publishes table stays immutable.
 *
 * GET returns the publish history (audit log), newest first.
 */
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, badRequest, handleError } from '@/lib/api/utils'
import { publishRequestSchema } from '@/lib/api/schemas'
import { projects, fixtures, fixtureGenerations, publishes, endpointMappings, eq, and, desc } from '@db'

type RouteParams = { params: Promise<{ id: string; fixtureId: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId } = await params
    const user = await getAuthenticatedUser()
    if (!user) return unauthorized()

    const db = getDb()
    const fixture = await db.query.fixtures.findFirst({
      where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
    })
    if (!fixture) return notFound('Fixture')

    const history = await db.query.publishes.findMany({
      where: eq(publishes.fixtureId, fixtureId),
      orderBy: [desc(publishes.publishedAt)],
    })
    return NextResponse.json(history)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/fixtures/[fixtureId]/publish')
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId } = await params
    const user = await getAuthenticatedUser()
    if (!user) return unauthorized()

    const db = getDb()
    const project = await db.query.projects.findFirst({ where: eq(projects.id, id) })
    if (!project) return notFound('Project')

    const fixture = await db.query.fixtures.findFirst({
      where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
      with: {
        endpointMappings: { where: eq(endpointMappings.isEnabled, true) },
      },
    })
    if (!fixture) return notFound('Fixture')

    const body = await request.json().catch(() => ({}))
    const validatedData = publishRequestSchema.parse(body)

    const targetId = validatedData.generationId ?? fixture.draftGenerationId
    if (!targetId) {
      return badRequest('Nothing to publish: no generationId given and the fixture has no draft')
    }

    const generation = await db.query.fixtureGenerations.findFirst({
      where: and(eq(fixtureGenerations.id, targetId), eq(fixtureGenerations.fixtureId, fixtureId)),
    })
    if (!generation) return notFound('Generation')
    if (generation.status !== 'completed' || !generation.data) {
      return badRequest('Generation is not completed or has no data')
    }

    // Publish gate (spec §6): hard-fail only on deterministic validation errors.
    if (generation.validationValid === false) {
      return NextResponse.json(
        {
          error: 'Generation failed deterministic validation',
          code: 'VALIDATION_FAILED',
          details: generation.validationErrors ?? [],
        },
        { status: 422 }
      )
    }

    // Everything below is warning-only — rollback must never be blockable.
    const warnings: string[] = []
    const unreviewed = generation.unreviewedRows ?? {}
    const unreviewedCount = Object.values(unreviewed).reduce((sum, ids) => sum + ids.length, 0)
    if (unreviewedCount > 0) {
      warnings.push(`${unreviewedCount} generated rows have not been reviewed`)
    }
    const dataModels = new Set(Object.keys((generation.data as Record<string, unknown[]>) ?? {}))
    // OSS `db.query` has no relations() config (the cloud app supplies the real
    // relation graph), so the `with.endpointMappings` result isn't typed here —
    // cast to the known row shape rather than losing the single-query fetch.
    const enabledMappings = (fixture.endpointMappings ?? []) as (typeof endpointMappings.$inferSelect)[]
    for (const mapping of enabledMappings) {
      if (!dataModels.has(mapping.sourceModel)) {
        warnings.push(`Mapping ${mapping.method} ${mapping.pattern} reads model "${mapping.sourceModel}", which this generation has no data for`)
        continue
      }
      const aggregateField = mapping.aggregateConfig?.field
      if (aggregateField) {
        const rows = (generation.data as Record<string, Record<string, unknown>[]>)[mapping.sourceModel] ?? []
        const hasField = rows.some((row) => aggregateField in row)
        if (!hasField) {
          warnings.push(`Mapping ${mapping.method} ${mapping.pattern} aggregates "${mapping.sourceModel}.${aggregateField}", which no generated row contains`)
        }
      }
    }

    const [publish] = await db
      .insert(publishes)
      .values({
        fixtureId,
        generationId: targetId,
        previousGenerationId: fixture.publishedGenerationId,
        publishedById: user.id,
        note: validatedData.note ?? null,
      })
      .returning()

    const [updatedFixture] = await db
      .update(fixtures)
      .set({
        publishedGenerationId: targetId,
        draftGenerationId: fixture.draftGenerationId === targetId ? null : fixture.draftGenerationId,
        updatedAt: new Date(),
      })
      .where(eq(fixtures.id, fixtureId))
      .returning()

    return NextResponse.json({ publish, fixture: updatedFixture, warnings })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/fixtures/[fixtureId]/publish')
  }
}
