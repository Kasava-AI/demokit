/**
 * Templates API Route (OSS)
 *
 * Manages demo templates for a project.
 * OSS version: No organization membership checks (single-user mode).
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { createTemplateSchema } from '@/lib/api/schemas'
import { projects, templates } from '@db'
import { eq } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }
type TemplateCategory = 'demo' | 'happyPath' | 'edgeCase' | 'onboarding' | 'migration' | 'recovery' | 'growth' | 'decline' | 'comparison' | 'training'

/**
 * GET /api/projects/[id]/templates
 * Returns all templates for a project.
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

    const projectTemplates = await db.query.templates.findMany({
      where: eq(templates.projectId, id),
      orderBy: (t, { desc }) => [desc(t.relevanceScore), desc(t.createdAt)],
    })

    return NextResponse.json(projectTemplates)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/templates')
  }
}

/**
 * POST /api/projects/[id]/templates
 * Creates a new template for a project.
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
    const validatedData = createTemplateSchema.parse(body)

    const insertValues = {
      projectId: id,
      name: validatedData.name,
      description: validatedData.description,
      category: validatedData.category as TemplateCategory | undefined,
      narrative: validatedData.narrative,
      instructions: validatedData.instructions,
      preview: validatedData.preview,
      isDefault: validatedData.isDefault ?? false,
    }
    const [template] = await db
      .insert(templates)
      .values(insertValues)
      .returning()

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/templates')
  }
}
