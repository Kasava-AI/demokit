/**
 * Schema Parse API Route (OSS)
 *
 * POST /api/projects/:id/schema/parse
 * Parse schema files from uploaded content.
 *
 * Note: GitHub integration is not available in OSS mode.
 * Files must be provided directly in the request.
 * OSS version: No organization membership checks (single-user mode).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, badRequest, handleError } from '@/lib/api/utils'
import { parseSchema, parseSchemaMultiFormat } from '@demokit-ai/core'
import type { CodebaseFile, ParseResult, SchemaFormat } from '@demokit-ai/core'
import { projects } from '@db'
import { eq } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

const parseRequestSchema = z.object({
  // Files to parse - provided directly
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    ),

  // Parsing options
  options: z
    .object({
      format: z.enum(['auto', 'typescript', 'zod', 'drizzle', 'prisma']).optional(),
      name: z.string().optional(),
      version: z.string().optional(),
      detectRelationships: z.boolean().optional(),
      inferRelationships: z.boolean().optional(),
      multiFormat: z.boolean().optional(),
    })
    .optional(),
})

/**
 * POST /api/projects/:id/schema/parse
 * Parse uploaded files.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params
    const user = await getAuthenticatedUser()
    if (!user) {
      return unauthorized()
    }

    const db = getDb()

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) {
      return notFound('Project')
    }

    const body = await request.json()
    const validation = parseRequestSchema.safeParse(body)

    if (!validation.success) {
      return badRequest('Validation error', validation.error.issues)
    }

    const { files: providedFiles, options } = validation.data

    if (!providedFiles || providedFiles.length === 0) {
      return badRequest('Files are required')
    }

    const files: CodebaseFile[] = providedFiles

    // Parse the schema
    let result: ParseResult

    if (options?.multiFormat) {
      result = parseSchemaMultiFormat(files, {
        name: options?.name,
        version: options?.version,
        detectRelationships: options?.detectRelationships,
        inferRelationships: options?.inferRelationships,
      })
    } else {
      result = parseSchema(files, {
        format: options?.format === 'auto' ? undefined : (options?.format as SchemaFormat),
        name: options?.name,
        version: options?.version,
        detectRelationships: options?.detectRelationships,
        inferRelationships: options?.inferRelationships,
      })
    }

    // Build response with summary
    const models = Object.entries(result.schema.models).map(([name, model]) => ({
      name,
      propertyCount: Object.keys(model.properties || {}).length,
      required: model.required || [],
      type: model.type,
    }))

    return NextResponse.json({
      schema: result.schema,
      format: result.format,
      warnings: result.warnings,
      parsedFiles: result.parsedFiles,
      models,
      relationships: result.schema.relationships,
    })
  } catch (error) {
    return handleError(error, 'POST /api/projects/:id/schema/parse')
  }
}
