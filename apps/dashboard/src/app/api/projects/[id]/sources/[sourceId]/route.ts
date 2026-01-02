/**
 * Project Source API Route (OSS)
 *
 * GET/PUT/DELETE operations for a single source.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, badRequest, handleError } from '@/lib/api/utils'
import { updateSourceSchema } from '@/lib/api/schemas'
import { projects, projectSources, features, userJourneys } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string; sourceId: string }> }

/**
 * GET /api/projects/[id]/sources/[sourceId]
 * Returns a single source.
 *
 * Query params:
 * - include=contributions - Include linked features/journeys
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, sourceId } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    // Check if we should include contributions
    const url = new URL(request.url)
    const includeContributions = url.searchParams.get('include') === 'contributions'

    // Fetch source - conditional query based on whether we need contributions
    if (includeContributions) {
      const sourceWithContributions = await db.query.projectSources.findFirst({
        where: and(
          eq(projectSources.id, sourceId),
          eq(projectSources.projectId, id)
        ),
        with: { contributions: true },
      })

      if (!sourceWithContributions) {
        return notFound('Source')
      }

      // Enrich contributions with entity names
      if (sourceWithContributions.contributions && sourceWithContributions.contributions.length > 0) {
        const contributionsWithNames = await Promise.all(
          sourceWithContributions.contributions.map(async (c) => {
            let entityName = ''
            if (c.entityType === 'feature') {
              const feature = await db.query.features.findFirst({
                where: eq(features.id, c.entityId),
                columns: { name: true },
              })
              entityName = feature?.name || 'Unknown Feature'
            } else if (c.entityType === 'journey') {
              const journey = await db.query.userJourneys.findFirst({
                where: eq(userJourneys.id, c.entityId),
                columns: { name: true },
              })
              entityName = journey?.name || 'Unknown Journey'
            }
            return { ...c, entityName }
          })
        )

        return NextResponse.json({
          ...sourceWithContributions,
          contributions: contributionsWithNames,
        })
      }

      return NextResponse.json(sourceWithContributions)
    }

    // Simple query without contributions
    const source = await db.query.projectSources.findFirst({
      where: and(
        eq(projectSources.id, sourceId),
        eq(projectSources.projectId, id)
      ),
    })

    if (!source) {
      return notFound('Source')
    }

    return NextResponse.json(source)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/sources/[sourceId]')
  }
}

/**
 * PUT /api/projects/[id]/sources/[sourceId]
 * Updates a source.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, sourceId } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    // Verify source exists and belongs to project
    const existingSource = await db.query.projectSources.findFirst({
      where: and(
        eq(projectSources.id, sourceId),
        eq(projectSources.projectId, id)
      ),
    })

    if (!existingSource) {
      return notFound('Source')
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateSourceSchema.parse(body)

    // Validate that we have either url or content after update
    const newUrl = validatedData.url !== undefined ? validatedData.url : existingSource.url
    const newContent = validatedData.content !== undefined ? validatedData.content : existingSource.content

    if (!newUrl && !newContent) {
      return badRequest('Either url or content is required')
    }

    // Determine if we need to reset fetch status (URL changed)
    const urlChanged = validatedData.url !== undefined && validatedData.url !== existingSource.url
    const fetchStatusUpdate = urlChanged ? { fetchStatus: 'pending', fetchError: null, lastFetchedAt: null } : {}

    // Update the source
    const [updatedSource] = await db
      .update(projectSources)
      .set({
        ...validatedData,
        ...fetchStatusUpdate,
        updatedAt: new Date(),
      } as any)
      .where(eq(projectSources.id, sourceId))
      .returning()

    return NextResponse.json(updatedSource)
  } catch (error) {
    return handleError(error, 'PUT /api/projects/[id]/sources/[sourceId]')
  }
}

/**
 * DELETE /api/projects/[id]/sources/[sourceId]
 * Deletes a source.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, sourceId } = await params
    await getAuthenticatedUser()

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return notFound('Project')
    }

    // Verify source exists and belongs to project
    const existingSource = await db.query.projectSources.findFirst({
      where: and(
        eq(projectSources.id, sourceId),
        eq(projectSources.projectId, id)
      ),
    })

    if (!existingSource) {
      return notFound('Source')
    }

    // Delete the source
    await db.delete(projectSources).where(eq(projectSources.id, sourceId))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, 'DELETE /api/projects/[id]/sources/[sourceId]')
  }
}
