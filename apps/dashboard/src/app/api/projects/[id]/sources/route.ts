/**
 * Sources API Route (OSS)
 *
 * Manages project sources (GitHub repos, uploaded files, etc.).
 * OSS version: No organization membership checks (single-user mode).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, badRequest, handleError } from '@/lib/api/utils'
import { createSourceSchema } from '@/lib/api/schemas'
import { projects, projectSources } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/projects/[id]/sources
 * Returns all sources for a project.
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

    const sources = await db.query.projectSources.findMany({
      where: eq(projectSources.projectId, id),
      orderBy: (s, { asc }) => [asc(s.createdAt)],
    })

    return NextResponse.json(sources)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/sources')
  }
}

/**
 * POST /api/projects/[id]/sources
 * Creates a new source for a project.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createSourceSchema.parse(body)

    // Validate that we have either url or content
    if (!validatedData.url && !validatedData.content) {
      return badRequest('Either url or content is required')
    }

    // Check if source of this type already exists
    const existingSource = await db.query.projectSources.findFirst({
      where: and(
        eq(projectSources.projectId, id),
        eq(projectSources.type, validatedData.type)
      ),
    })

    if (existingSource) {
      return badRequest(`A ${validatedData.type} source already exists for this project`)
    }

    // Create the source
    const [source] = await db
      .insert(projectSources)
      .values({
        projectId: id,
        type: validatedData.type,
        url: validatedData.url,
        content: validatedData.content,
        fetchStatus: validatedData.url ? 'pending' : 'completed',
      })
      .returning()

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/sources')
  }
}
