/**
 * Demo Variants API Route (OSS)
 *
 * GET/POST operations for demo variants.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, handleError } from '@/lib/api/utils'
import { createDemoVariantSchema } from '@/lib/api/schemas'
import { projects, demos, demoVariants } from '@db'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string; demoId: string }> }

/**
 * GET /api/projects/[id]/demos/[demoId]/variants
 * Returns all variants for a demo.
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

    // Verify demo exists
    const demo = await db.query.demos.findFirst({
      where: and(eq(demos.id, demoId), eq(demos.projectId, id)),
    })

    if (!demo) {
      return notFound('Demo')
    }

    const variants = await db.query.demoVariants.findMany({
      where: eq(demoVariants.demoId, demoId),
      orderBy: (v, { asc }) => [asc(v.createdAt)],
      with: {
        fixtures: {
          with: {
            activeGeneration: true,
          },
        },
      },
    })

    return NextResponse.json(variants)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/demos/[demoId]/variants')
  }
}

/**
 * POST /api/projects/[id]/demos/[demoId]/variants
 * Creates a new variant for a demo.
 */
export async function POST(request: Request, { params }: RouteParams) {
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

    // Verify demo exists
    const demo = await db.query.demos.findFirst({
      where: and(eq(demos.id, demoId), eq(demos.projectId, id)),
    })

    if (!demo) {
      return notFound('Demo')
    }

    const body = await request.json()
    const validatedData = createDemoVariantSchema.parse(body)

    // Check if slug is unique within demo
    const existingVariant = await db.query.demoVariants.findFirst({
      where: and(
        eq(demoVariants.demoId, demoId),
        eq(demoVariants.slug, validatedData.slug)
      ),
    })

    if (existingVariant) {
      return NextResponse.json(
        { error: 'A variant with this slug already exists' },
        { status: 409 }
      )
    }

    // If this is the first variant or marked as default, handle default logic
    const existingVariants = await db.query.demoVariants.findMany({
      where: eq(demoVariants.demoId, demoId),
    })

    const isFirst = existingVariants.length === 0
    const shouldBeDefault = isFirst || validatedData.isDefault

    // If setting as default, unset other defaults
    if (shouldBeDefault && existingVariants.length > 0) {
      await db
        .update(demoVariants)
        .set({ isDefault: false })
        .where(eq(demoVariants.demoId, demoId))
    }

    const [variant] = await db
      .insert(demoVariants)
      .values({
        demoId,
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        isDefault: shouldBeDefault,
        generationParams: validatedData.generationParams,
      })
      .returning()

    // If first variant, set as demo's default
    if (isFirst) {
      await db
        .update(demos)
        .set({ defaultVariantId: variant.id })
        .where(eq(demos.id, demoId))
    }

    return NextResponse.json(variant, { status: 201 })
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/demos/[demoId]/variants')
  }
}
