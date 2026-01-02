/**
 * Demo Sets API Route (OSS)
 *
 * GET/POST operations for demo sets.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, handleError } from '@/lib/api/utils'
import { createDemoSetSchema } from '@/lib/api/schemas'
import { projects, demoSets } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/projects/[id]/demo-sets
 * Returns all demo sets for a project.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    const sets = await db.query.demoSets.findMany({
      where: eq(demoSets.projectId, id),
      orderBy: (s, { asc }) => [asc(s.name)],
    })

    return NextResponse.json(sets)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/demo-sets')
  }
}

/**
 * POST /api/projects/[id]/demo-sets
 * Creates a new demo set.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    const body = await request.json()
    const validatedData = createDemoSetSchema.parse(body)

    // Check if slug is unique within project
    const existingSet = await db.query.demoSets.findFirst({
      where: and(eq(demoSets.projectId, id), eq(demoSets.slug, validatedData.slug)),
    })

    if (existingSet) {
      return NextResponse.json(
        { error: 'A demo set with this slug already exists' },
        { status: 409 }
      )
    }

    const [demoSet] = await db
      .insert(demoSets)
      .values({
        projectId: id,
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        demos: validatedData.demos ?? [],
        tags: validatedData.tags ?? [],
      })
      .returning()

    return NextResponse.json(demoSet, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/demo-sets')
  }
}
