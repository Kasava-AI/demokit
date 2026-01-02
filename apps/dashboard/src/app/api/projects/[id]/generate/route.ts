/**
 * AI Generation API Route (OSS)
 *
 * Handles L3 (narrative-driven) demo data generation.
 * Uses @demokit-ai/ai with Mastra agents for AI-powered generation.
 *
 * OSS version: No billing/quotes, uses ANTHROPIC_API_KEY from environment.
 *
 * Automatically saves the generated fixture to the database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { projects, appIdentity, features, userJourneys, entityMaps, fixtures, fixtureGenerations } from '@db'
import { eq } from 'drizzle-orm'
import { generateNarrativeData, createNarrative, type SourceIntelligence } from '@demokit-ai/ai'
import { inferAppContext } from '@demokit-ai/core'
import type { DemokitSchema } from '@demokit-ai/core'

interface GenerateRequestBody {
  schema: DemokitSchema
  narrative: {
    scenario: string
    keyPoints: string[]
  }
  counts?: Record<string, number>
  stream?: boolean
  fixtureId?: string
  /** Optional fixture name. If not provided, a default name is generated. */
  fixtureName?: string
  /** Optional template ID to associate with the fixture */
  templateId?: string
}

/**
 * Generate a default fixture name based on the narrative scenario.
 */
function generateFixtureName(scenario: string): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10)
  const timeStr = date.toTimeString().slice(0, 5).replace(':', '')

  // Extract first few words from scenario for a meaningful name
  const scenarioWords = scenario.trim().split(/\s+/).slice(0, 4).join(' ')
  if (scenarioWords.length > 0) {
    return `${scenarioWords} (${dateStr})`
  }

  return `Fixture ${dateStr}-${timeStr}`
}

/**
 * Fetch source intelligence for a project.
 */
async function fetchSourceIntelligence(projectId: string): Promise<SourceIntelligence> {
  const db = getDb()

  const [identity, projectFeatures, projectJourneys, projectEntityMaps] = await Promise.all([
    db.query.appIdentity.findFirst({
      where: eq(appIdentity.projectId, projectId),
    }),
    db.query.features.findMany({
      where: eq(features.projectId, projectId),
      orderBy: (f, { desc }) => [desc(f.confidence)],
      limit: 15,
    }),
    db.query.userJourneys.findMany({
      where: eq(userJourneys.projectId, projectId),
      orderBy: (j, { desc }) => [desc(j.confidence)],
      limit: 10,
    }),
    db.query.entityMaps.findMany({
      where: eq(entityMaps.projectId, projectId),
    }),
  ])

  return {
    appIdentity: identity ? {
      name: identity.name,
      description: identity.description,
      domain: identity.domain,
      industry: identity.industry,
      targetAudience: identity.targetAudience,
      valueProposition: identity.valueProposition,
      competitiveAdvantages: identity.competitiveAdvantages,
    } : undefined,
    features: projectFeatures.map(f => ({
      name: f.name,
      description: f.description,
      category: f.category,
    })),
    journeys: projectJourneys.map(j => ({
      name: j.name,
      description: j.description,
      persona: j.persona,
    })),
    entityMaps: projectEntityMaps.map(e => ({
      modelName: e.modelName,
      displayName: e.displayName,
      purpose: e.purpose,
    })),
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Parse request body
  const body: GenerateRequestBody = await req.json()
  const { schema, narrative, counts, fixtureName, templateId } = body

  // Validate required fields
  if (!schema || !narrative) {
    return NextResponse.json(
      { error: 'Missing required fields: schema and narrative' },
      { status: 400 }
    )
  }

  const startTime = Date.now()

  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'AI generation not configured',
          details: 'ANTHROPIC_API_KEY environment variable is required for L3 generation',
        },
        { status: 503 }
      )
    }

    // Fetch source intelligence
    const sourceIntelligence = await fetchSourceIntelligence(projectId)

    // Infer app context from schema
    const appContext = inferAppContext(schema)

    // Create narrative object
    const demoNarrative = createNarrative(
      narrative.scenario,
      narrative.keyPoints
    )

    // Generate the narrative data
    const result = await generateNarrativeData({
      schema,
      appContext,
      narrative: demoNarrative,
      counts,
      format: 'typescript',
      sourceIntelligence,
    })

    const durationMs = Date.now() - startTime

    // Use validation from the result (already computed by generateNarrativeData)
    const validation = result.validation

    // Use metadata from the result
    const { totalRecords, recordsByModel, tokensUsed } = result.metadata

    // Create the fixture in the database
    const name = fixtureName || generateFixtureName(narrative.scenario)

    const [fixture] = await db
      .insert(fixtures)
      .values({
        projectId,
        createdById: user.id,
        name,
        description: narrative.scenario,
        templateId: templateId || null,
      })
      .returning()

    // Create the generation record
    const [generation] = await db
      .insert(fixtureGenerations)
      .values({
        fixtureId: fixture.id,
        level: 'narrative-driven',
        data: result.data as Record<string, unknown[]>,
        code: result.fixtures || null,
        validationValid: validation?.valid ?? false,
        validationErrorCount: validation?.errors?.length ?? 0,
        validationWarningCount: validation?.warnings?.length ?? 0,
        validationErrors: validation?.errors?.map((e) => ({
          type: e.type,
          model: e.model,
          field: e.field,
          message: e.message,
        })),
        recordCount: totalRecords,
        recordsByModel,
        inputParameters: { narrative, counts },
        status: 'completed',
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs,
        tokensUsed,
      })
      .returning()

    // Update fixture with active generation
    await db
      .update(fixtures)
      .set({
        activeGenerationId: generation.id,
        updatedAt: new Date(),
      })
      .where(eq(fixtures.id, fixture.id))

    console.log('[Generate API] Fixture saved:', {
      fixtureId: fixture.id,
      generationId: generation.id,
      recordCount: totalRecords,
      durationMs,
    })

    // Return result with fixture info
    return NextResponse.json({
      ...result,
      fixtureId: fixture.id,
      generationId: generation.id,
      fixtureName: name,
      validation: validation
        ? {
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
            stats: {
              totalRecords,
              recordsByModel,
              durationMs,
            },
          }
        : null,
    })
  } catch (error) {
    console.error('[Generate API] Error:', error)

    const message = error instanceof Error ? error.message : 'Generation failed'

    if (message.includes('ANTHROPIC_API_KEY') || message.includes('API key')) {
      return NextResponse.json(
        {
          error: 'AI generation not configured',
          details: 'ANTHROPIC_API_KEY environment variable is required for L3 generation',
        },
        { status: 503 }
      )
    }

    return handleError(error, 'POST /api/projects/[id]/generate')
  }
}
