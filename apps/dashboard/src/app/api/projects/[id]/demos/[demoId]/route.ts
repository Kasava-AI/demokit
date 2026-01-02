/**
 * Demo API Route (OSS)
 *
 * GET/PUT/DELETE operations for a single demo.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, handleError } from '@/lib/api/utils'
import { updateDemoSchema } from '@/lib/api/schemas'
import { projects, demos } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string; demoId: string }> }

/**
 * GET /api/projects/[id]/demos/[demoId]
 * Returns a specific demo with its variants.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, demoId } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    const demo = await db.query.demos.findFirst({
      where: and(eq(demos.id, demoId), eq(demos.projectId, id)),
      with: {
        baseJourney: true,
        variants: {
          orderBy: (v: any, { asc }: { asc: Function }) => [asc(v.createdAt)],
          with: {
            fixtures: {
              with: {
                activeGeneration: true,
              },
            },
          },
        },
        defaultVariant: true,
      },
    })

    if (!demo) {
      return notFound('Demo')
    }

    return NextResponse.json(demo)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/demos/[demoId]')
  }
}

/**
 * PUT /api/projects/[id]/demos/[demoId]
 * Updates a demo.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, demoId } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    // Check demo exists
    const existingDemo = await db.query.demos.findFirst({
      where: and(eq(demos.id, demoId), eq(demos.projectId, id)),
    })

    if (!existingDemo) {
      return notFound('Demo')
    }

    const body = await request.json()
    const validatedData = updateDemoSchema.parse(body)

    // Check slug uniqueness if changing
    if (validatedData.slug && validatedData.slug !== existingDemo.slug) {
      const slugConflict = await db.query.demos.findFirst({
        where: and(eq(demos.projectId, id), eq(demos.slug, validatedData.slug)),
      })

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A demo with this slug already exists' },
          { status: 409 }
        )
      }
    }

    const [updated] = await db
      .update(demos)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(demos.id, demoId))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    return handleError(error, 'PUT /api/projects/[id]/demos/[demoId]')
  }
}

/**
 * DELETE /api/projects/[id]/demos/[demoId]
 * Deletes a demo and its variants.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, demoId } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    // Check demo exists
    const existingDemo = await db.query.demos.findFirst({
      where: and(eq(demos.id, demoId), eq(demos.projectId, id)),
    })

    if (!existingDemo) {
      return notFound('Demo')
    }

    // Delete (cascades to variants via FK)
    await db.delete(demos).where(eq(demos.id, demoId))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, 'DELETE /api/projects/[id]/demos/[demoId]')
  }
}
