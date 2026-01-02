/**
 * AI Generation API Route (OSS)
 *
 * Handles L3 (narrative-driven) demo data generation.
 * Uses @demokit-ai/ai with Mastra agents for AI-powered generation.
 *
 * OSS version: No billing/quotes, uses ANTHROPIC_API_KEY from environment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { unauthorized, notFound, handleError } from '@/lib/api/utils'
import { projects, appIdentity, features, userJourneys, entityMaps } from '@db'
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
  const { schema, narrative, counts } = body

  // Validate required fields
  if (!schema || !narrative) {
    return NextResponse.json(
      { error: 'Missing required fields: schema and narrative' },
      { status: 400 }
    )
  }

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

    return NextResponse.json(result)
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
