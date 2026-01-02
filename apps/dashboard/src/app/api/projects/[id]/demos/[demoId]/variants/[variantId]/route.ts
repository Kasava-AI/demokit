/**
 * Demo Variant API Route (OSS)
 *
 * GET/PUT/DELETE operations for a single variant.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound, handleError } from '@/lib/api/utils'
import { updateDemoVariantSchema } from '@/lib/api/schemas'
import { projects, demos, demoVariants, fixtures } from '@db'
import { eq, and, ne } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string; demoId: string; variantId: string }> }

/**
 * GET /api/projects/[id]/demos/[demoId]/variants/[variantId]
 * Returns a specific variant with its fixtures.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, demoId, variantId } = await params
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

    const variant = await db.query.demoVariants.findFirst({
      where: and(eq(demoVariants.id, variantId), eq(demoVariants.demoId, demoId)),
      with: {
        fixtures: {
          with: {
            activeGeneration: true,
          },
        },
      },
    })

    if (!variant) {
      return notFound('Variant')
    }

    return NextResponse.json(variant)
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/demos/[demoId]/variants/[variantId]')
  }
}

/**
 * PUT /api/projects/[id]/demos/[demoId]/variants/[variantId]
 * Updates a variant.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, demoId, variantId } = await params
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

    const existingVariant = await db.query.demoVariants.findFirst({
      where: and(eq(demoVariants.id, variantId), eq(demoVariants.demoId, demoId)),
    })

    if (!existingVariant) {
      return notFound('Variant')
    }

    const body = await request.json()
    const validatedData = updateDemoVariantSchema.parse(body)

    // Check if slug is unique within demo (if changing slug)
    if (validatedData.slug && validatedData.slug !== existingVariant.slug) {
      const slugConflict = await db.query.demoVariants.findFirst({
        where: and(
          eq(demoVariants.demoId, demoId),
          eq(demoVariants.slug, validatedData.slug)
        ),
      })

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A variant with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Handle default logic
    if (validatedData.isDefault === true) {
      // Unset other defaults
      await db
        .update(demoVariants)
        .set({ isDefault: false })
        .where(eq(demoVariants.demoId, demoId))
    }

    const [updatedVariant] = await db
      .update(demoVariants)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(demoVariants.id, variantId))
      .returning()

    // If set as default, update demo's defaultVariantId
    if (validatedData.isDefault === true) {
      await db
        .update(demos)
        .set({ defaultVariantId: variantId })
        .where(eq(demos.id, demoId))
    }

    return NextResponse.json(updatedVariant)
  } catch (error) {
    return handleError(error, 'PUT /api/projects/[id]/demos/[demoId]/variants/[variantId]')
  }
}

/**
 * DELETE /api/projects/[id]/demos/[demoId]/variants/[variantId]
 * Deletes a variant and its associated fixtures.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, demoId, variantId } = await params
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

    const existingVariant = await db.query.demoVariants.findFirst({
      where: and(eq(demoVariants.id, variantId), eq(demoVariants.demoId, demoId)),
    })

    if (!existingVariant) {
      return notFound('Variant')
    }

    // Check if this is the default variant
    if (demo.defaultVariantId === variantId) {
      // Find another variant to make default
      const otherVariant = await db.query.demoVariants.findFirst({
        where: and(
          eq(demoVariants.demoId, demoId),
          ne(demoVariants.id, variantId)
        ),
      })

      await db
        .update(demos)
        .set({ defaultVariantId: otherVariant?.id ?? null })
        .where(eq(demos.id, demoId))
    }

    // Unlink fixtures from this variant
    await db
      .update(fixtures)
      .set({ variantId: null })
      .where(eq(fixtures.variantId, variantId))

    // Delete the variant
    await db.delete(demoVariants).where(eq(demoVariants.id, variantId))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error, 'DELETE /api/projects/[id]/demos/[demoId]/variants/[variantId]')
  }
}
