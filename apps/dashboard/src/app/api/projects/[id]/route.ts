/**
 * Project API Route (OSS)
 *
 * Simple single-user mode - no permission checks.
 * All projects are accessible to the local user.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { updateProjectSchema } from '@/lib/api/schemas'
import { projects } from '@db'
import { eq } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/projects/[id]
 * Returns a single project with its related data.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Get project with all related data
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        appIdentity: true,
        features: true,
        userJourneys: true,
        templates: {
          orderBy: (t, { desc }) => [desc(t.relevanceScore)],
        },
        fixtures: {
          orderBy: (f, { desc }) => [desc(f.createdAt)],
          limit: 20,
        },
        activeFixture: {
          with: {
            activeGeneration: true,
          },
        },
        sources: true,
      },
    })

    if (!project) {
      return notFound('Project')
    }

    return NextResponse.json(project)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]')
  }
}

/**
 * PUT /api/projects/[id]
 * Updates a project.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Verify project exists
    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!existing) {
      return notFound('Project')
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    // Update the project
    const [updatedProject] = await db
      .update(projects)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning()

    return NextResponse.json(updatedProject)
  } catch (error) {
    return handleError(error, 'PUT /api/projects/[id]')
  }
}

/**
 * DELETE /api/projects/[id]
 * Deletes a project and all related data (cascades via foreign keys).
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Verify project exists
    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!existing) {
      return notFound('Project')
    }

    // Delete the project (related data will cascade)
    await db.delete(projects).where(eq(projects.id, id))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, 'DELETE /api/projects/[id]')
  }
}
