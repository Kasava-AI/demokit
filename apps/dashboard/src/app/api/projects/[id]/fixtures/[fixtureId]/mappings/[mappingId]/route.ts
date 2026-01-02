/**
 * Endpoint Mapping API Route (OSS)
 *
 * GET/PUT/DELETE operations for a single endpoint mapping.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, handleError } from '@/lib/api/utils'
import { updateEndpointMappingSchema } from '@/lib/api/schemas'
import { projects, fixtures, endpointMappings } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = {
  params: Promise<{ id: string; fixtureId: string; mappingId: string }>
}

/**
 * GET /api/projects/[id]/fixtures/[fixtureId]/mappings/[mappingId]
 * Returns a single endpoint mapping.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId, mappingId } = await params
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

    const mapping = await db.query.endpointMappings.findFirst({
      where: and(
        eq(endpointMappings.id, mappingId),
        eq(endpointMappings.fixtureId, fixtureId)
      ),
    })

    if (!mapping) {
      return notFound('Endpoint mapping')
    }

    return NextResponse.json(mapping)
  } catch (error) {
    return handleError(
      error,
      'GET /api/projects/[id]/fixtures/[fixtureId]/mappings/[mappingId]'
    )
  }
}

/**
 * PUT /api/projects/[id]/fixtures/[fixtureId]/mappings/[mappingId]
 * Updates an endpoint mapping.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId, mappingId } = await params
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

    const existingMapping = await db.query.endpointMappings.findFirst({
      where: and(
        eq(endpointMappings.id, mappingId),
        eq(endpointMappings.fixtureId, fixtureId)
      ),
    })

    if (!existingMapping) {
      return notFound('Endpoint mapping')
    }

    const body = await request.json()
    const validatedData = updateEndpointMappingSchema.parse(body)

    const [updatedMapping] = await db
      .update(endpointMappings)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(endpointMappings.id, mappingId))
      .returning()

    return NextResponse.json(updatedMapping)
  } catch (error) {
    return handleError(
      error,
      'PUT /api/projects/[id]/fixtures/[fixtureId]/mappings/[mappingId]'
    )
  }
}

/**
 * DELETE /api/projects/[id]/fixtures/[fixtureId]/mappings/[mappingId]
 * Deletes an endpoint mapping.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, fixtureId, mappingId } = await params
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

    const existingMapping = await db.query.endpointMappings.findFirst({
      where: and(
        eq(endpointMappings.id, mappingId),
        eq(endpointMappings.fixtureId, fixtureId)
      ),
    })

    if (!existingMapping) {
      return notFound('Endpoint mapping')
    }

    await db.delete(endpointMappings).where(eq(endpointMappings.id, mappingId))

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(
      error,
      'DELETE /api/projects/[id]/fixtures/[fixtureId]/mappings/[mappingId]'
    )
  }
}
