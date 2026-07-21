/**
 * Fixture Generations API Route (OSS)
 *
 * GET/POST operations for fixture generations.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, handleError } from '@/lib/api/utils'
import { createGenerationSchema } from '@/lib/api/schemas'
import { projects, fixtures, fixtureGenerations, publishes, eq, and, desc } from '@db'
import { buildNarrativeSample, runNarrativeLinter, type LinterFinding } from '@demokit-ai/ai'
import type { DemoData } from '@demokit-ai/core'

type RouteParams = { params: Promise<{ id: string; fixtureId: string }> }

/**
 * GET /api/projects/[id]/fixtures/[fixtureId]/generations
 * Returns all generations for a fixture.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    // Verify fixture exists
    const fixture = await db.query.fixtures.findFirst({
      where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
    })

    if (!fixture) {
      return notFound('Fixture')
    }

    const generations = await db.query.fixtureGenerations.findMany({
      where: eq(fixtureGenerations.fixtureId, fixtureId),
      orderBy: [desc(fixtureGenerations.createdAt)],
    })

    return NextResponse.json(generations)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/fixtures/[fixtureId]/generations')
  }
}

/**
 * POST /api/projects/[id]/fixtures/[fixtureId]/generations
 * Creates a new generation for a fixture.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    // Verify fixture exists
    const fixture = await db.query.fixtures.findFirst({
      where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
    })

    if (!fixture) {
      return notFound('Fixture')
    }

    const body = await request.json()
    const validatedData = createGenerationSchema.parse(body)

    // Calculate record count if not provided
    const recordCount = validatedData.recordCount ??
      Object.values(validatedData.data).reduce((sum, records) => sum + records.length, 0)

    const [generation] = await db
      .insert(fixtureGenerations)
      .values({
        fixtureId,
        label: validatedData.label,
        level: validatedData.level,
        data: validatedData.data,
        code: validatedData.code,
        validationValid: validatedData.validationValid,
        validationErrorCount: validatedData.validationErrorCount,
        validationWarningCount: validatedData.validationWarningCount,
        validationErrors: validatedData.validationErrors,
        recordCount,
        recordsByModel: validatedData.recordsByModel,
        inputParameters: validatedData.inputParameters,
        durationMs: validatedData.durationMs,
        tokensUsed: validatedData.tokensUsed,
        status: 'completed',
        completedAt: new Date(),
      })
      .returning()

    let linterFindings: LinterFinding[] = []
    const scenario =
      typeof validatedData.inputParameters?.scenario === 'string' ? validatedData.inputParameters.scenario : null
    if (scenario && process.env.ANTHROPIC_API_KEY) {
      const sample = buildNarrativeSample(validatedData.data as DemoData)
      linterFindings = await runNarrativeLinter({ scenario, sample })
      if (linterFindings.length > 0) {
        await db.update(fixtureGenerations).set({ linterFindings }).where(eq(fixtureGenerations.id, generation.id))
      }
    }

    // Draft/publish split (spec §6): land as draft; bootstrap-publish only
    // when nothing is published yet and validation passed.
    if (!fixture.publishedGenerationId && validatedData.validationValid !== false) {
      await db.transaction(async (tx) => {
        await tx.insert(publishes).values({
          fixtureId,
          generationId: generation.id,
          previousGenerationId: null,
          publishedById: null,
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

    return NextResponse.json({ ...generation, linterFindings }, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/fixtures/[fixtureId]/generations')
  }
}
