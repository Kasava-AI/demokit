/**
 * Deterministic StorySpec execution (spec §5.2 step 2): no LLM. Lands as a
 * draft generation (spec §6); rows are marked unreviewed when the fixture
 * already serves a published generation. Reused later by CI auto-fill.
 *
 * The actual generation write, linter run, and draft/publish split live in
 * createStoryDraftGeneration (lib/services/story-draft.ts, Phase 4 Task 8)
 * so DemoKit Cloud's CI auto-fill can call the same logic directly. This
 * route just resolves auth/schema/spec and shapes the HTTP response.
 */
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, badRequest, handleError } from '@/lib/api/utils'
import { generateStoryRequestSchema } from '@/lib/api/schemas'
import { projects, projectSources, fixtures, fixtureGenerations, demoVariants, demos, eq, and } from '@db'
import { parseStorySpec } from '@demokit-ai/core'
import type { DemokitSchema } from '@demokit-ai/core'
import { createStoryDraftGeneration } from '@/lib/services/story-draft'

type RouteParams = { params: Promise<{ id: string; fixtureId: string }> }

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

    const draft = await createStoryDraftGeneration({
      db,
      projectId: id,
      fixtureId,
      schema,
      spec,
      source: 'dashboard',
      baseTimestamp: body.baseTimestamp,
      allowBootstrapPublish: true,
      publishedById: user.id,
    })

    // Re-fetch: the service owns the write (including the linter's
    // follow-up update), so the route reads back the row it just landed.
    const generation = await db.query.fixtureGenerations.findFirst({
      where: eq(fixtureGenerations.id, draft.generationId),
    })

    return NextResponse.json(
      {
        generation: { ...generation, linterFindings: draft.linterFindings },
        validation: { valid: generation?.validationValid ?? true, errors: generation?.validationErrors ?? [] },
        warnings: draft.warnings,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/fixtures/[fixtureId]/generate-story')
  }
}
