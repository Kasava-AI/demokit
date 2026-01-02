/**
 * Projects API Route (OSS)
 *
 * Simple single-user mode - no organization membership checks.
 * All projects are accessible to the local user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, handleError } from '@/lib/api/utils'
import { createProjectSchema } from '@/lib/api/schemas'
import { projects } from '@db'
import { desc } from 'drizzle-orm'

/**
 * GET /api/projects
 * Returns all projects.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Get all projects (OSS mode - single user, no org filtering)
    const allProjects = await db.query.projects.findMany({
      orderBy: (p) => [desc(p.createdAt)],
    })

    return NextResponse.json(allProjects)
  } catch (error) {
    return handleError(error, 'GET /api/projects')
  }
}

/**
 * POST /api/projects
 * Creates a new project.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    // Create the project (OSS mode - no organization required)
    const [project] = await db
      .insert(projects)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        schema: validatedData.schema,
        status: 'pending',
      })
      .returning()

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects')
  }
}
