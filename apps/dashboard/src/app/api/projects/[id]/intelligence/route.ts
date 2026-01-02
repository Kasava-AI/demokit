/**
 * Intelligence API Route (OSS)
 *
 * Manages app identity, features, user journeys, and templates for a project.
 * OSS version: No organization membership checks (single-user mode).
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { saveIntelligenceSchema } from '@/lib/api/schemas'
import {
  projects,
  appIdentity,
  features,
  userJourneys,
  templates,
} from '@db'
import { eq } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

type TemplateCategory = 'demo' | 'happyPath' | 'edgeCase' | 'onboarding' | 'migration' | 'recovery' | 'growth' | 'decline' | 'comparison' | 'training'

/**
 * GET /api/projects/[id]/intelligence
 * Returns all intelligence data for a project (appIdentity, features, userJourneys).
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

    // Get all intelligence data in parallel
    const [identity, featuresList, journeysList, templatesList] = await Promise.all([
      db.query.appIdentity.findFirst({
        where: eq(appIdentity.projectId, id),
      }),
      db.query.features.findMany({
        where: eq(features.projectId, id),
        orderBy: (f, { asc }) => [asc(f.createdAt)],
      }),
      db.query.userJourneys.findMany({
        where: eq(userJourneys.projectId, id),
        orderBy: (j, { asc }) => [asc(j.createdAt)],
      }),
      db.query.templates.findMany({
        where: eq(templates.projectId, id),
        orderBy: (t, { desc }) => [desc(t.relevanceScore), desc(t.createdAt)],
      }),
    ])

    return NextResponse.json({
      appIdentity: identity || null,
      features: featuresList,
      journeys: journeysList,
      templates: templatesList,
    })
  } catch (error) {
    return handleError(error, 'GET /api/projects/[id]/intelligence')
  }
}

/**
 * POST /api/projects/[id]/intelligence
 * Saves intelligence data for a project.
 * This is typically called after AI analysis completes.
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
    const validatedData = saveIntelligenceSchema.parse(body)

    // Save app identity (upsert - one per project)
    let savedIdentity = null
    if (validatedData.appIdentity) {
      const existing = await db.query.appIdentity.findFirst({
        where: eq(appIdentity.projectId, id),
      })

      if (existing) {
        const [updated] = await db
          .update(appIdentity)
          .set({
            ...validatedData.appIdentity,
            updatedAt: new Date(),
          })
          .where(eq(appIdentity.projectId, id))
          .returning()
        savedIdentity = updated
      } else {
        const [created] = await db
          .insert(appIdentity)
          .values({
            projectId: id,
            ...validatedData.appIdentity,
          })
          .returning()
        savedIdentity = created
      }
    }

    // Save features (replace all existing)
    let savedFeatures: typeof features.$inferSelect[] = []
    if (validatedData.features && validatedData.features.length > 0) {
      // Delete existing features
      await db.delete(features).where(eq(features.projectId, id))

      // Insert new features
      savedFeatures = await db
        .insert(features)
        .values(
          validatedData.features.map((f) => ({
            projectId: id,
            name: f.name,
            description: f.description,
            category: f.category as string | undefined,
            relatedModels: f.relatedModels,
            relatedEndpoints: f.relatedEndpoints,
            confidence: f.confidence,
          }))
        )
        .returning()
    }

    // Save user journeys (replace all existing)
    let savedJourneys: typeof userJourneys.$inferSelect[] = []
    if (validatedData.journeys && validatedData.journeys.length > 0) {
      // Delete existing journeys
      await db.delete(userJourneys).where(eq(userJourneys.projectId, id))

      // Insert new journeys
      savedJourneys = await db
        .insert(userJourneys)
        .values(
          validatedData.journeys.map((j) => ({
            projectId: id,
            name: j.name,
            description: j.description,
            persona: j.persona,
            steps: j.steps?.map((s) => ({
              ...s,
              description: s.description ?? '',
            })),
            relatedFeatures: j.relatedFeatures,
            confidence: j.confidence,
          }))
        )
        .returning()
    }

    // Save templates (replace all existing)
    let savedTemplates: typeof templates.$inferSelect[] = []
    if (validatedData.templates && validatedData.templates.length > 0) {
      // Delete existing templates
      await db.delete(templates).where(eq(templates.projectId, id))

      // Insert new templates
      savedTemplates = await db
        .insert(templates)
        .values(
          validatedData.templates.map((t) => ({
            projectId: id,
            name: t.name,
            description: t.description,
            category: t.category as TemplateCategory | undefined,
            narrative: t.narrative,
            instructions: t.instructions,
            preview: t.preview,
            relevanceScore: t.relevanceScore,
            isDefault: t.isDefault ?? true,
          }))
        )
        .returning()
    }

    // Update project status to ready
    await db
      .update(projects)
      .set({
        status: 'ready',
        analyzedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))

    return NextResponse.json(
      {
        appIdentity: savedIdentity,
        features: savedFeatures,
        journeys: savedJourneys,
        templates: savedTemplates,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleError(error, 'POST /api/projects/[id]/intelligence')
  }
}
