/**
 * Fixtures API Route (OSS)
 *
 * Simple single-user mode - no org membership checks.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { createFixtureSchema } from '@/lib/api/schemas'
import { projects, fixtures } from '@db'
import { eq } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/projects/[id]/fixtures
 * Returns all fixtures for a project.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const projectFixtures = await db.query.fixtures.findMany({
      where: eq(fixtures.projectId, id),
      orderBy: (f, { desc }) => [desc(f.createdAt)],
      with: {
        template: true,
        createdBy: {
          columns: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        activeGeneration: true,
      },
    })

    return NextResponse.json(projectFixtures)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/fixtures')
  }
}

/**
 * POST /api/projects/[id]/fixtures
 * Creates a new fixture for a project.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const validatedData = createFixtureSchema.parse(body)

    const [fixture] = await db
      .insert(fixtures)
      .values({
        projectId: id,
        createdById: user.id,
        name: validatedData.name,
        description: validatedData.description,
        templateId: validatedData.templateId,
      })
      .returning()

    return NextResponse.json(fixture, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/fixtures')
  }
}
