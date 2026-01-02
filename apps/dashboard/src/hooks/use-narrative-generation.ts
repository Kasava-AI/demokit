/**
 * Narrative Generation Hook
 *
 * Hook for L3 (narrative-driven) AI-powered demo data generation.
 * Calls the /api/projects/[id]/generate endpoint and handles the response.
 *
 * For L1/L2 generation, use the useGeneration hook in the project page components.
 */

'use client'

import { useState, useCallback } from 'react'
import type { DemoNarrative, DemoData, ValidationResult, GenerationMetadata } from '@demokit-ai/core'
import type { DemokitSchema } from '@demokit-ai/core'

// ============================================================================
// Types
// ============================================================================

export interface NarrativeGenerationState {
  status: 'idle' | 'generating' | 'success' | 'error'
  data?: DemoData
  fixtures?: string
  validation?: ValidationResult
  metadata?: GenerationMetadata
  error?: string
}

export interface UseNarrativeGenerationOptions {
  projectId: string
  schema?: DemokitSchema
  counts?: Record<string, number>
}

export interface UseNarrativeGenerationReturn {
  state: NarrativeGenerationState
  generate: (narrative: DemoNarrative) => Promise<void>
  reset: () => void
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for AI-powered narrative generation
 *
 * @param options - Configuration options
 * @returns Generation state and control functions
 *
 * @example
 * ```tsx
 * const { state, generate, reset } = useNarrativeGeneration({
 *   projectId: 'proj_123',
 *   schema: mySchema,
 *   counts: { User: 10, Order: 50 },
 * })
 *
 * // Trigger generation
 * await generate({
 *   scenario: 'E-commerce demo with holiday rush',
 *   keyPoints: ['High order volume', 'One delayed shipment'],
 * })
 *
 * // Check result
 * if (state.status === 'success') {
 *   console.log('Generated:', state.data)
 * }
 * ```
 */
export function useNarrativeGeneration({
  projectId,
  schema,
  counts,
}: UseNarrativeGenerationOptions): UseNarrativeGenerationReturn {
  const [state, setState] = useState<NarrativeGenerationState>({
    status: 'idle',
  })

  const generate = useCallback(
    async (narrative: DemoNarrative) => {
      if (!schema) {
        setState({
          status: 'error',
          error: 'No schema available. Please upload an OpenAPI spec first.',
        })
        return
      }

      setState({ status: 'generating' })

      try {
        const response = await fetch(`/api/projects/${projectId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema,
            narrative: {
              scenario: narrative.scenario,
              keyPoints: narrative.keyPoints,
            },
            counts,
            stream: false, // TODO: Enable streaming when AI SDK deps are added
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Generation failed: ${response.status}`)
        }

        const result = await response.json()

        setState({
          status: 'success',
          data: result.data,
          fixtures: result.fixtures,
          validation: result.validation,
          metadata: result.metadata,
        })
      } catch (error) {
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Generation failed',
        })
      }
    },
    [projectId, schema, counts]
  )

  const reset = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  return { state, generate, reset }
}
