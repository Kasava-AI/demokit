/**
 * StorySpec writer route (spec §5.2 step 1) — prose in, StorySpec out, saved
 * on the variant. The only LLM call in the story pipeline; execution
 * (generate-story) is deterministic.
 */
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { writeStorySpecRequestSchema } from '@/lib/api/schemas'
import { projects, projectSources, demos, demoVariants, eq, and } from '@db'
import { writeStorySpec } from '@demokit-ai/ai'
import type { DemokitSchema, StorySpec } from '@demokit-ai/core'

type RouteParams = { params: Promise<{ id: string; demoId: string; variantId: string }> }

/**
 * Task 9's entity-form edits persist as `storySpec.pins` on the variant (see
 * `save-with-pin-restore.ts`). A prose revision (this route) must not
 * silently discard them: carry forward any existing pin whose path the new
 * LLM-authored spec doesn't itself define. On a path collision the new
 * spec's pin wins — the user just asked for a new story at that path.
 */
function mergePins(
  existingPins: StorySpec['pins'] | null | undefined,
  newPins: StorySpec['pins']
): StorySpec['pins'] {
  const newPaths = new Set(newPins.map((pin) => pin.path))
  const carriedForward = (existingPins ?? []).filter((pin) => !newPaths.has(pin.path))
  return [...carriedForward, ...newPins]
}

async function resolveProjectSchema(
  db: ReturnType<typeof getDb>,
  projectId: string
): Promise<DemokitSchema | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) })
  const projectSchema = project?.schema as DemokitSchema | undefined
  if (projectSchema?.models && Object.keys(projectSchema.models).length > 0) {
    return projectSchema
  }
  const sources = await db.query.projectSources.findMany({
    where: eq(projectSources.projectId, projectId),
  })
  const parsed = sources
    .map((source) => source.parsedSchema as unknown as DemokitSchema | null)
    .filter((schema): schema is DemokitSchema => !!schema && !!schema.models)
  if (parsed.length === 0) return null
  return {
    models: Object.assign({}, ...parsed.map((schema) => schema.models)),
    relationships: parsed.flatMap((schema) => schema.relationships ?? []),
  } as DemokitSchema
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id, demoId, variantId } = await params
    const user = await getAuthenticatedUser()
    if (!user) return unauthorized()

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Story spec writing not configured',
          details: 'ANTHROPIC_API_KEY environment variable is required',
        },
        { status: 503 }
      )
    }

    const db = getDb()
    const demo = await db.query.demos.findFirst({
      where: and(eq(demos.id, demoId), eq(demos.projectId, id)),
    })
    if (!demo) return notFound('Demo')

    const variant = await db.query.demoVariants.findFirst({
      where: and(eq(demoVariants.id, variantId), eq(demoVariants.demoId, demoId)),
    })
    if (!variant) return notFound('Variant')

    const schema = await resolveProjectSchema(db, id)
    if (!schema) {
      return NextResponse.json(
        { error: 'Project has no parsed schema to write a story against', code: 'NO_SCHEMA' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { prose } = writeStorySpecRequestSchema.parse(body)

    // Edits reuse the saved spec's seed so regeneration diffs stay minimal.
    const existing = variant.storySpec as unknown as StorySpec | null
    const { spec, warnings } = await writeStorySpec({
      schema,
      prose,
      seed: existing?.seed,
    })

    // Carry forward any Task-9-persisted pins the new spec doesn't itself
    // touch (see mergePins doc comment) — a prose revision augments the
    // spec, it doesn't reset row-level edits the user already made.
    const mergedSpec: StorySpec = { ...spec, pins: mergePins(existing?.pins, spec.pins) }

    await db
      .update(demoVariants)
      .set({ storySpec: mergedSpec as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(demoVariants.id, variantId))

    return NextResponse.json({ spec: mergedSpec, warnings })
  } catch (error) {
    return handleError(error, 'POST .../variants/[variantId]/story-spec')
  }
}
