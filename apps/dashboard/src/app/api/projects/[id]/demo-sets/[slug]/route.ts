/**
 * Demo Set API Route (OSS)
 *
 * GET/PUT/DELETE operations for a single demo set.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, handleError } from '@/lib/api/utils'
import { updateDemoSetSchema } from '@/lib/api/schemas'
import { projects, demoSets } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string; slug: string }> }

/**
 * GET /api/projects/[id]/demo-sets/[slug]
 * Returns a specific demo set with expanded demo information.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, slug } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    const demoSet = await db.query.demoSets.findFirst({
      where: and(eq(demoSets.projectId, id), eq(demoSets.slug, slug)),
    })

    if (!demoSet) {
      return notFound('Demo Set')
    }

    return NextResponse.json(demoSet)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/demo-sets/[slug]')
  }
}

/**
 * PUT /api/projects/[id]/demo-sets/[slug]
 * Updates a demo set.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, slug } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    const existingSet = await db.query.demoSets.findFirst({
      where: and(eq(demoSets.projectId, id), eq(demoSets.slug, slug)),
    })

    if (!existingSet) {
      return notFound('Demo Set')
    }

    const body = await request.json()
    const validatedData = updateDemoSetSchema.parse(body)

    // Check if new slug is unique within project (if changing slug)
    if (validatedData.slug && validatedData.slug !== slug) {
      const slugConflict = await db.query.demoSets.findFirst({
        where: and(eq(demoSets.projectId, id), eq(demoSets.slug, validatedData.slug)),
      })

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A demo set with this slug already exists' },
          { status: 409 }
        )
      }
    }

    const [updatedSet] = await db
      .update(demoSets)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(eq(demoSets.projectId, id), eq(demoSets.slug, slug)))
      .returning()

    return NextResponse.json(updatedSet)
  } catch (error) {
    return handleError(error, 'PUT /api/projects/[id]/demo-sets/[slug]')
  }
}

/**
 * DELETE /api/projects/[id]/demo-sets/[slug]
 * Deletes a demo set.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, slug } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    const existingSet = await db.query.demoSets.findFirst({
      where: and(eq(demoSets.projectId, id), eq(demoSets.slug, slug)),
    })

    if (!existingSet) {
      return notFound('Demo Set')
    }

    await db
      .delete(demoSets)
      .where(and(eq(demoSets.projectId, id), eq(demoSets.slug, slug)))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, 'DELETE /api/projects/[id]/demo-sets/[slug]')
  }
}
