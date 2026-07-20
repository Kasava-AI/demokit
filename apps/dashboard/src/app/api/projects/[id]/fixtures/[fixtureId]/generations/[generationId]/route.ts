/**
 * Fixture Generation API Route (OSS)
 *
 * GET/DELETE operations for a single generation.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, handleError } from '@/lib/api/utils'
import { projects, fixtures, fixtureGenerations, eq, and } from '@db'

type RouteParams = { params: Promise<{ id: string; fixtureId: string; generationId: string }> }

/**
 * GET /api/projects/[id]/fixtures/[fixtureId]/generations/[generationId]
 * Returns a single generation with its data.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId, generationId } = await params
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

    const generation = await db.query.fixtureGenerations.findFirst({
      where: and(
        eq(fixtureGenerations.id, generationId),
        eq(fixtureGenerations.fixtureId, fixtureId)
      ),
    })

    if (!generation) {
      return notFound('Generation')
    }

    return NextResponse.json(generation)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/fixtures/[fixtureId]/generations/[generationId]')
  }
}

/**
 * DELETE /api/projects/[id]/fixtures/[fixtureId]/generations/[generationId]
 * Deletes a generation. Refuses to delete the published generation (publish
 * another first); clears the fixture's draftGenerationId if it's the draft.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId, generationId } = await params
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

    const generation = await db.query.fixtureGenerations.findFirst({
      where: and(
        eq(fixtureGenerations.id, generationId),
        eq(fixtureGenerations.fixtureId, fixtureId)
      ),
    })

    if (!generation) {
      return notFound('Generation')
    }

    // The published generation is what the SDK serves — deleting it would
    // break live demos and orphan the audit trail. Publish another first.
    if (fixture.publishedGenerationId === generationId) {
      return NextResponse.json(
        { error: 'Cannot delete the published generation. Publish another generation first.', code: 'PUBLISHED_GENERATION' },
        { status: 409 }
      )
    }
    if (fixture.draftGenerationId === generationId) {
      await db
        .update(fixtures)
        .set({ draftGenerationId: null, updatedAt: new Date() })
        .where(eq(fixtures.id, fixtureId))
    }

    // Delete the generation
    await db.delete(fixtureGenerations).where(eq(fixtureGenerations.id, generationId))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, 'DELETE /api/projects/[id]/fixtures/[fixtureId]/generations/[generationId]')
  }
}
