/**
 * Deterministic StorySpec execution (spec §5.2 step 2): no LLM. Lands as a
 * draft generation (spec §6); rows are marked unreviewed when the fixture
 * already serves a published generation. Reused later by CI auto-fill.
 */
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, badRequest, handleError } from '@/lib/api/utils'
import { generateStoryRequestSchema } from '@/lib/api/schemas'
import { projects, projectSources, fixtures, fixtureGenerations, demoVariants, demos, publishes, eq, and } from '@db'
import { generateFromStorySpec, parseStorySpec } from '@demokit-ai/core'
import type { DemokitSchema } from '@demokit-ai/core'

type RouteParams = { params: Promise<{ id: string; fixtureId: string }> }

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
    })
    if (!fixture) return notFound('Fixture')

    const body = generateStoryRequestSchema.parse(await request.json())

    let spec = body.storySpec
    if (!spec && body.variantId) {
      const variant = await db.query.demoVariants.findFirst({
        where: eq(demoVariants.id, body.variantId),
      })
      if (!variant?.storySpec) return notFound('Variant story spec')
      const variantDemo = await db.query.demos.findFirst({
        where: and(eq(demos.id, variant.demoId), eq(demos.projectId, id)),
      })
      if (!variantDemo) return notFound('Variant story spec')
      spec = parseStorySpec(variant.storySpec)
    }
    if (!spec) return badRequest('No story spec resolved')

    // Same resolution as the story-spec route: project.schema, else merged sources.
    const projectSchema = project.schema as unknown as DemokitSchema | undefined
    let schema: DemokitSchema | null =
      projectSchema?.models && Object.keys(projectSchema.models).length > 0 ? projectSchema : null
    if (!schema) {
      const sources = await db.query.projectSources.findMany({
        where: eq(projectSources.projectId, id),
      })
      const parsed = sources
        .map((source) => source.parsedSchema as unknown as DemokitSchema | null)
        .filter((candidate): candidate is DemokitSchema => !!candidate && !!candidate.models)
      if (parsed.length > 0) {
        schema = {
          models: Object.assign({}, ...parsed.map((candidate) => candidate.models)),
          relationships: parsed.flatMap((candidate) => candidate.relationships ?? []),
        } as DemokitSchema
      }
    }
    if (!schema) {
      return NextResponse.json(
        { error: 'Project has no parsed schema to generate against', code: 'NO_SCHEMA' },
        { status: 409 }
      )
    }

    const startTime = Date.now()
    const baseTimestamp = body.baseTimestamp ?? Date.now()
    const result = generateFromStorySpec(schema, spec, { baseTimestamp })
    const durationMs = Date.now() - startTime

    const hasPublished = !!fixture.publishedGenerationId
    const { totalRecords, recordsByModel } = result.metadata

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
        unreviewedRows: hasPublished ? collectRowIds(result.data as Record<string, Record<string, unknown>[]>) : null,
        status: 'completed',
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs,
      })
      .returning()

    // Draft/publish split (spec §6) — same semantics as the generations POST.
    if (!hasPublished && result.validation.valid) {
      await db.transaction(async (tx) => {
        await tx.insert(publishes).values({
          fixtureId,
          generationId: generation.id,
          previousGenerationId: null,
          publishedById: user.id,
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

    return NextResponse.json({ generation, validation: result.validation }, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/fixtures/[fixtureId]/generate-story')
  }
}
