'use client'

import { useState, useCallback, useMemo } from 'react'
import type { DemoNarrative, DemoData, ValidationResult, GenerationLevel, GenerationRulesConfig } from '@demokit-ai/core'
import { generateDemoData, validateData } from '@demokit-ai/core'
import type { DynamicNarrativeTemplate } from '@intelligence'
import type { GenerationState, DemokitSchema } from './types'
import type { GenerationHistoryEntry } from '@/components/history'
import {
  useFixtureGenerations,
  useCreateGeneration,
  useDeleteGeneration,
  useSetActiveGeneration,
  type FixtureGeneration,
} from '@/hooks/use-fixtures'

interface UseGenerationOptions {
  projectId?: string
  fixtureId?: string
  selectedTemplate?: DynamicNarrativeTemplate
  schema?: DemokitSchema
  recordCounts?: Record<string, number>
  /** Custom generation rules from project settings */
  generationRules?: GenerationRulesConfig
}

/**
 * Convert a database FixtureGeneration to a GenerationHistoryEntry for display
 */
function toHistoryEntry(gen: FixtureGeneration): GenerationHistoryEntry {
  return {
    id: gen.id,
    timestamp: gen.createdAt,
    level: gen.level,
    metadata: {
      level: gen.level,
      generatedAt: gen.createdAt,
      totalRecords: gen.recordCount ?? 0,
      recordsByModel: gen.recordsByModel ?? {},
      usedIds: {}, // Not stored in DB, only relevant during generation
      durationMs: gen.durationMs ?? 0,
    },
    validation: {
      valid: gen.validationValid ?? true,
      errorCount: gen.validationErrorCount ?? 0,
      warningCount: gen.validationWarningCount ?? 0,
    },
    label: gen.label ?? undefined,
  }
}

export function useGeneration({ projectId, fixtureId, selectedTemplate, schema, recordCounts, generationRules }: UseGenerationOptions = {}) {
  const [generation, setGeneration] = useState<GenerationState>({
    status: 'idle',
    level: 'relationship-valid', // Default to L2 (relationship-valid) for better data quality
  })
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>()

  // Handler to change generation level
  const setLevel = useCallback((level: GenerationLevel) => {
    setGeneration((prev) => ({ ...prev, level }))
  }, [])

  // Fetch generations from API when fixtureId is available
  const {
    data: dbGenerations,
    isLoading: isLoadingHistory,
  } = useFixtureGenerations(projectId ?? '', fixtureId ?? '', {
    enabled: !!projectId && !!fixtureId,
  })

  // Mutations for persisting generations
  const createGenerationMutation = useCreateGeneration()
  const deleteGenerationMutation = useDeleteGeneration()
  const setActiveGenerationMutation = useSetActiveGeneration()

  // Convert DB generations to history entries for display
  const history = useMemo(() => {
    if (!dbGenerations) return []
    return dbGenerations.map(toHistoryEntry)
  }, [dbGenerations])

  const handleGenerate = useCallback(async (narrativeInput: DemoNarrative) => {
    // Check if schema is available
    if (!schema) {
      setGeneration((prev) => ({
        ...prev,
        status: 'error',
        errors: ['No schema available. Please upload an OpenAPI spec first.'],
      }))
      return
    }

    setGeneration((prev) => ({ ...prev, status: 'generating', attempt: 1 }))

    try {
      let result: {
        data: DemoData
        fixtures?: string
        validation: ValidationResult
        metadata: { level: GenerationLevel; generatedAt: string; totalRecords: number; recordsByModel: Record<string, number>; usedIds: Record<string, string[]>; durationMs: number; tokensUsed?: number }
      }

      // Use L3 (narrative-driven) API for narrative-driven level
      if (generation.level === 'narrative-driven' && projectId) {
        // Call the AI generation API
        const response = await fetch(`/api/projects/${projectId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema,
            narrative: {
              scenario: narrativeInput.scenario,
              keyPoints: narrativeInput.keyPoints,
            },
            counts: recordCounts,
            stream: false,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          // Provide a more helpful error message for API key issues
          if (response.status === 503 && errorData.error?.includes('not configured')) {
            throw new Error('AI generation is not available. The server needs an ANTHROPIC_API_KEY configured. Please contact your administrator or try L2 (Fast) generation instead.')
          }
          throw new Error(errorData.error || `L3 generation failed: ${response.status}`)
        }

        result = await response.json()
      } else {
        // Use L1/L2 generation locally
        // Small delay to show generating state
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Map our generation level to the codegen level
        const codegenLevel: GenerationLevel =
          generation.level === 'schema-valid' ? 'schema-valid' : 'relationship-valid'

        // Generate demo data using the local generator
        // Use Date.now() as seed to ensure different data on each regeneration
        result = generateDemoData(schema, {
          level: codegenLevel,
          counts: recordCounts,
          format: 'typescript',
          validate: true,
          seed: Date.now(),
          customRules: generationRules,
        })
      }

      setGeneration((prev) => ({ ...prev, status: 'validating' }))

      // Small delay to show validating state
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Persist to database if we have a fixture
      if (projectId && fixtureId) {
        const label = selectedTemplate?.name || narrativeInput.scenario.slice(0, 30) || 'Generation'

        try {
          const savedGeneration = await createGenerationMutation.mutateAsync({
            projectId,
            fixtureId,
            data: {
              label,
              level: generation.level,
              data: result.data as Record<string, unknown[]>,
              code: result.fixtures,
              validationValid: result.validation.valid,
              validationErrorCount: result.validation.errors.length,
              validationWarningCount: result.validation.warnings.length,
              validationErrors: result.validation.errors.map((e) => ({
                type: e.type,
                model: e.model,
                field: e.field,
                message: e.message,
              })),
              recordCount: result.metadata.totalRecords,
              recordsByModel: result.metadata.recordsByModel,
              inputParameters: {
                scenario: narrativeInput.scenario,
                keyPoints: narrativeInput.keyPoints,
                counts: recordCounts,
              },
              durationMs: result.metadata.durationMs,
              tokensUsed: result.metadata.tokensUsed,
            },
          })

          setSelectedHistoryId(savedGeneration.id)
        } catch (persistError) {
          // Log but don't fail - generation was still successful
          console.error('Failed to persist generation:', persistError)
        }
      }

      setGeneration({
        status: 'success',
        data: result.data,
        code: result.fixtures,
        validation: result.validation,
        level: generation.level,
      })
    } catch (error) {
      setGeneration((prev) => ({
        ...prev,
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Generation failed'],
      }))
    }
  }, [generation.level, selectedTemplate, schema, recordCounts, generationRules, projectId, fixtureId, createGenerationMutation])

  const handleSelectHistory = useCallback((entry: GenerationHistoryEntry) => {
    setSelectedHistoryId(entry.id)

    // Load the generation data from the database entry
    if (projectId && fixtureId && dbGenerations) {
      const dbGen = dbGenerations.find((g) => g.id === entry.id)
      if (dbGen && dbGen.data) {
        const data = dbGen.data as DemoData

        // Auto-revalidate to get fresh validation stats
        // This ensures we always show accurate type checks and relationship checks
        const validation = schema
          ? validateData(data, { schema, collectWarnings: true })
          : {
              valid: dbGen.validationValid ?? true,
              errors: (dbGen.validationErrors ?? []).map((e) => ({
                type: e.type as 'missing_reference' | 'type_mismatch' | 'format_invalid' | 'constraint_violation' | 'required_missing' | 'enum_invalid' | 'timestamp_order' | 'array_empty' | 'duplicate_id',
                model: e.model,
                field: e.field ?? '',
                message: e.message,
              })),
              warnings: [],
              stats: {
                totalRecords: dbGen.recordCount ?? 0,
                recordsByModel: dbGen.recordsByModel ?? {},
                relationshipsChecked: 0,
                typeChecks: 0,
                durationMs: dbGen.durationMs ?? 0,
              },
            }

        setGeneration({
          status: 'success',
          data,
          code: dbGen.code ?? undefined,
          validation,
          level: dbGen.level,
        })
      }
    }
  }, [projectId, fixtureId, dbGenerations, schema])

  const handleDeleteHistory = useCallback((entryId: string) => {
    if (!projectId || !fixtureId) return

    deleteGenerationMutation.mutate({
      projectId,
      fixtureId,
      generationId: entryId,
    })

    if (selectedHistoryId === entryId) {
      setSelectedHistoryId(undefined)
    }
  }, [projectId, fixtureId, deleteGenerationMutation, selectedHistoryId])

  const handleClearHistory = useCallback(() => {
    // Clear all generations by deleting each one
    if (!projectId || !fixtureId || !dbGenerations) return

    for (const gen of dbGenerations) {
      deleteGenerationMutation.mutate({
        projectId,
        fixtureId,
        generationId: gen.id,
      })
    }
    setSelectedHistoryId(undefined)
  }, [projectId, fixtureId, dbGenerations, deleteGenerationMutation])

  const handleCancelGeneration = useCallback(() => {
    setGeneration((prev) => ({ ...prev, status: 'idle' }))
  }, [])

  const handleRevalidate = useCallback(() => {
    if (!generation.data || !schema) {
      return
    }

    setGeneration((prev) => ({ ...prev, status: 'validating' }))

    // Run validation synchronously (it's fast)
    const validation = validateData(generation.data, {
      schema,
      collectWarnings: true,
    })

    setGeneration((prev) => ({
      ...prev,
      status: 'success',
      validation,
    }))
  }, [generation.data, schema])

  const handleSetActiveGeneration = useCallback((generationId: string) => {
    if (!projectId || !fixtureId) return

    setActiveGenerationMutation.mutate({
      projectId,
      fixtureId,
      generationId,
    })
  }, [projectId, fixtureId, setActiveGenerationMutation])

  return {
    generation,
    history,
    selectedHistoryId,
    isLoadingHistory,
    setLevel,
    handleGenerate,
    handleSelectHistory,
    handleDeleteHistory,
    handleClearHistory,
    handleCancelGeneration,
    handleRevalidate,
    handleSetActiveGeneration,
  }
}
