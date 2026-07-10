'use client'

/**
 * useWizardPipeline — the "make it real" step of the wizard.
 *
 * Runs: create project → save intelligence (honoring the user's template
 * selection) → generate L2 (relationship-valid) data locally for each
 * selected template → persist as fixtures → set the first one active.
 *
 * Only project creation is fatal; intelligence saving and per-template
 * generation degrade gracefully so the user always ends with a project.
 */

import { useState, useCallback } from 'react'
import { generateDemoData } from '@demokit-ai/core'
import type { FeatureCategory } from '@intelligence'
import { useCreateProject, useSetActiveFixture } from '@/hooks/use-projects'
import { useSaveIntelligence } from '@/hooks/use-intelligence'
import { useCreateFixture, useCreateGeneration } from '@/hooks/use-fixtures'
import type { ProjectData, GeneratedFixtureSummary, WizardResult } from './types'

export type PipelinePhase = 'idle' | 'creating' | 'saving' | 'generating' | 'error'

export interface PipelineState {
  phase: PipelinePhase
  /** Name of the template currently generating (for progress copy) */
  generatingTemplate: string | null
  /** 1-based index of the template currently generating */
  generatingIndex: number
  totalToGenerate: number
  error: string | null
}

const idleState: PipelineState = {
  phase: 'idle',
  generatingTemplate: null,
  generatingIndex: 0,
  totalToGenerate: 0,
  error: null,
}

export function useWizardPipeline() {
  const [state, setState] = useState<PipelineState>(idleState)

  const createProjectMutation = useCreateProject()
  const saveIntelligenceMutation = useSaveIntelligence()
  const createFixtureMutation = useCreateFixture()
  const createGenerationMutation = useCreateGeneration()
  const setActiveFixtureMutation = useSetActiveFixture()

  const run = useCallback(
    async (data: ProjectData, organizationId: string): Promise<WizardResult | null> => {
      setState({ ...idleState, phase: 'creating' })

      let projectId: string
      try {
        const project = await createProjectMutation.mutateAsync({
          name: data.name.trim(),
          description: data.description.trim() || undefined,
          schema: data.schema as Record<string, unknown> | undefined,
          organizationId,
        })
        projectId = project.id
      } catch (err) {
        setState({
          ...idleState,
          phase: 'error',
          error: err instanceof Error ? err.message : 'Failed to create project',
        })
        return null
      }

      // Save intelligence with the user's template selection — selected
      // templates become the project defaults. Non-fatal on failure.
      if (data.intelligence) {
        setState((prev) => ({ ...prev, phase: 'saving' }))
        const intelligence = data.intelligence
        try {
          await saveIntelligenceMutation.mutateAsync({
            projectId,
            data: {
              appIdentity: {
                // Prefer what the user confirmed over the raw analysis
                name: data.name.trim() || intelligence.appName,
                description: data.description.trim() || intelligence.appDescription,
                domain: intelligence.domain,
                industry: intelligence.industry,
                confidence: intelligence.overallConfidence,
              },
              features: intelligence.features.map((f) => ({
                name: f.name,
                description: f.description,
                category: f.category as FeatureCategory | undefined,
                relatedModels: f.relatedModels,
                relatedEndpoints: f.relatedEndpoints,
                confidence: f.confidence,
              })),
              journeys: intelligence.journeys.map((j) => ({
                name: j.name,
                description: j.description,
                persona: j.persona,
                steps: j.steps?.map((s, idx) => ({
                  order: s.order ?? idx + 1,
                  action: s.action,
                  description: s.outcome,
                  endpoint: s.endpointsCalled?.[0],
                  model: s.modelsAffected?.[0],
                })),
                relatedFeatures: j.featuresUsed,
                confidence: j.confidence,
              })),
              templates: intelligence.templates.map((t) => ({
                name: t.name,
                description: t.description,
                category: t.category,
                narrative: {
                  scenario: t.narrative.scenario,
                  keyPoints: t.narrative.keyPoints,
                },
                instructions: {
                  recordCounts: t.suggestedCounts,
                },
                relevanceScore: t.relevanceScore,
                isDefault: data.selectedTemplateIds.includes(t.id),
              })),
            },
          })
        } catch (err) {
          // Project exists — intelligence can be regenerated from its page
          console.error('Failed to save intelligence:', err)
        }
      }

      // Generate relationship-valid data locally for each selected template
      // and persist as fixtures. Per-template failures skip, not abort.
      const generated: GeneratedFixtureSummary[] = []
      const selectedTemplates =
        data.schema && data.intelligence
          ? data.intelligence.templates.filter((t) => data.selectedTemplateIds.includes(t.id))
          : []

      for (const [index, template] of selectedTemplates.entries()) {
        setState((prev) => ({
          ...prev,
          phase: 'generating',
          generatingTemplate: template.name,
          generatingIndex: index + 1,
          totalToGenerate: selectedTemplates.length,
        }))

        try {
          const result = generateDemoData(data.schema!, {
            level: 'relationship-valid',
            counts: template.suggestedCounts,
            format: 'typescript',
            validate: true,
            seed: Date.now(),
          })

          const fixture = await createFixtureMutation.mutateAsync({
            projectId,
            data: {
              name: template.name,
              description: template.description,
            },
          })

          await createGenerationMutation.mutateAsync({
            projectId,
            fixtureId: fixture.id,
            data: {
              label: template.name,
              level: 'relationship-valid',
              data: result.data as Record<string, unknown[]>,
              code: result.fixtures,
              validationValid: result.validation.valid,
              validationErrorCount: result.validation.errors.length,
              validationWarningCount: result.validation.warnings.length,
              recordCount: result.metadata.totalRecords,
              recordsByModel: result.metadata.recordsByModel,
              inputParameters: {
                scenario: template.narrative.scenario,
                keyPoints: template.narrative.keyPoints,
                counts: template.suggestedCounts,
              },
              durationMs: result.metadata.durationMs,
            },
          })

          generated.push({
            fixtureId: fixture.id,
            fixtureName: fixture.name,
            totalRecords: result.metadata.totalRecords,
            recordsByModel: result.metadata.recordsByModel,
            code: result.fixtures,
          })
        } catch (err) {
          console.error(`Failed to generate fixture for "${template.name}":`, err)
        }
      }

      // Make the first generated fixture the project's active fixture so the
      // project page (and the SDK) picks it up immediately. Non-fatal.
      if (generated.length > 0) {
        try {
          await setActiveFixtureMutation.mutateAsync({
            projectId,
            fixtureId: generated[0].fixtureId,
          })
        } catch (err) {
          console.error('Failed to set active fixture:', err)
        }
      }

      setState(idleState)
      return { projectId, fixtures: generated }
    },
    [
      createProjectMutation,
      saveIntelligenceMutation,
      createFixtureMutation,
      createGenerationMutation,
      setActiveFixtureMutation,
    ]
  )

  const isRunning = state.phase !== 'idle' && state.phase !== 'error'

  return { ...state, run, isRunning }
}
