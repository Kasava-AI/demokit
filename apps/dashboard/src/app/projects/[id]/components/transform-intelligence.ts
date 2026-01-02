/**
 * Transform database project data to intelligence format for components
 */

import type { AppIntelligence, FeatureCategory, TemplateCategory } from '@intelligence'

type ProjectData = {
  name: string
  description?: string | null
  appIdentity?: {
    name?: string | null
    description?: string | null
    domain?: string | null
    [key: string]: unknown // Allow additional fields from database
  } | null
  features: Array<{
    id: string
    name: string
    description?: string | null
    category?: string | null
    relatedModels?: string[] | null
    confidence?: number | null
  }>
  userJourneys: Array<{
    id: string
    name: string
    description?: string | null
    persona?: string | null
    steps?: unknown
    relatedFeatures?: string[] | null
    confidence?: number | null
  }>
  templates: Array<{
    id: string
    name: string
    description?: string | null
    category?: string | null
    narrative?: unknown
    instructions?: unknown
    relevanceScore?: number | null
  }>
  analyzedAt?: string | null
  confidenceScore?: number | null
}

export function transformToIntelligence(project: ProjectData | undefined | null): AppIntelligence | null {
  if (!project) return null

  return {
    appName: project.appIdentity?.name || project.name,
    appDescription: project.appIdentity?.description || project.description || '',
    domain: project.appIdentity?.domain || 'saas',
    sources: [],
    features: project.features.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description || '',
      category: (f.category as FeatureCategory) || 'core',
      relatedModels: f.relatedModels || [],
      confidence: f.confidence || 0.8,
    })),
    journeys: project.userJourneys.map((j) => ({
      id: j.id,
      name: j.name,
      description: j.description || '',
      persona: j.persona || 'User',
      steps: ((j.steps as Array<{ order: number; action: string; outcome?: string; modelsAffected?: string[] }>) || []).map((step) => ({
        order: step.order,
        action: step.action,
        outcome: step.outcome || '', // Provide default for required field
        modelsAffected: step.modelsAffected || [],
      })),
      featuresUsed: j.relatedFeatures || [],
      dataFlow: [],
      confidence: j.confidence || 0.8,
    })),
    entityMaps: [],
    templates: project.templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      category: (t.category as TemplateCategory) || 'demo',
      featuresShowcased: [],
      narrative: {
        scenario: (t.narrative as { scenario?: string; keyPoints?: string[] })?.scenario || '',
        keyPoints: (t.narrative as { scenario?: string; keyPoints?: string[] })?.keyPoints || [],
      },
      suggestedCounts: (t.instructions as { recordCounts?: Record<string, number> })?.recordCounts || {},
      relevanceScore: t.relevanceScore || 0.8,
    })),
    generatedAt: project.analyzedAt || new Date().toISOString(),
    overallConfidence: project.confidenceScore || 0.8,
  }
}
