/**
 * Demos API Route (OSS)
 *
 * Manages demos for a project.
 * OSS version: No organization membership checks (single-user mode).
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { createDemoSchema } from '@/lib/api/schemas'
import { projects, demos } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/projects/[id]/demos
 * Returns all demos for a project.
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

    const projectDemos = await db.query.demos.findMany({
      where: eq(demos.projectId, id),
      orderBy: (d, { desc }) => [desc(d.createdAt)],
      with: {
        baseJourney: true,
        variants: {
          orderBy: (v, { asc }) => [asc(v.createdAt)],
        },
        defaultVariant: true,
      },
    })

    return NextResponse.json(projectDemos)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/demos')
  }
}

/**
 * POST /api/projects/[id]/demos
 * Creates a new demo for a project.
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
    const validatedData = createDemoSchema.parse(body)

    // Check if slug is unique within project
    const existingDemo = await db.query.demos.findFirst({
      where: and(eq(demos.projectId, id), eq(demos.slug, validatedData.slug)),
    })

    if (existingDemo) {
      return NextResponse.json(
        { error: 'A demo with this slug already exists' },
        { status: 409 }
      )
    }

    const [demo] = await db
      .insert(demos)
      .values({
        projectId: id,
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        selectedFeatureIds: validatedData.selectedFeatureIds || [],
        baseJourneyId: validatedData.baseJourneyId,
        customSteps: validatedData.customSteps,
        persona: validatedData.persona,
        goal: validatedData.goal,
        constraints: validatedData.constraints || [],
        storyNotes: validatedData.storyNotes,
        tags: validatedData.tags || [],
        category: validatedData.category,
      })
      .returning()

    return NextResponse.json(demo, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/demos')
  }
}
