/**
 * Fixture API Route (OSS)
 *
 * Simple single-user mode - no org membership checks.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { updateFixtureSchema } from '@/lib/api/schemas'
import { projects, fixtures } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string; fixtureId: string }> }

/**
 * GET /api/projects/[id]/fixtures/[fixtureId]
 * Returns a single fixture with its data and generation history.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    // Get fixture with related data
    const fixture = await db.query.fixtures.findFirst({
      where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
      with: {
        template: true,
        activeGeneration: true,
        generations: {
          orderBy: (g, { desc }) => [desc(g.createdAt)],
          limit: 10,
        },
      },
    })

    if (!fixture) {
      return notFound('Fixture')
    }

    return NextResponse.json(fixture)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/fixtures/[fixtureId]')
  }
}

/**
 * PUT /api/projects/[id]/fixtures/[fixtureId]
 * Updates a fixture.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Verify fixture exists
    const existing = await db.query.fixtures.findFirst({
      where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
    })

    if (!existing) {
      return notFound('Fixture')
    }

    const body = await request.json()
    const validatedData = updateFixtureSchema.parse(body)

    const [updatedFixture] = await db
      .update(fixtures)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(fixtures.id, fixtureId))
      .returning()

    return NextResponse.json(updatedFixture)
  } catch (error) {
    return handleError(error, 'PUT /api/projects/[id]/fixtures/[fixtureId]')
  }
}

/**
 * DELETE /api/projects/[id]/fixtures/[fixtureId]
 * Deletes a fixture and its generation history.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Verify fixture exists
    const existing = await db.query.fixtures.findFirst({
      where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
    })

    if (!existing) {
      return notFound('Fixture')
    }

    // Delete the fixture (generations will cascade)
    await db.delete(fixtures).where(eq(fixtures.id, fixtureId))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, 'DELETE /api/projects/[id]/fixtures/[fixtureId]')
  }
}
