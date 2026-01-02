import { useState, useCallback, useRef, useEffect } from 'react'
import type { IntelligenceProgress, IntelligencePhase, AppIntelligence } from '@intelligence'
import { useSaveIntelligence } from './use-intelligence'

export type StreamIntelligenceStatus = 'idle' | 'streaming' | 'saving' | 'complete' | 'error'

export interface StreamIntelligenceState {
  status: StreamIntelligenceStatus
  phase: IntelligencePhase
  progress: number
  message: string
  error: string | null
  intelligence: AppIntelligence | null
}

export interface StreamIntelligenceInput {
  /** Raw OpenAPI schema content (either this or schema required) */
  schemaContent?: string
  /** Pre-parsed DemokitSchema object (either this or schemaContent required) */
  schema?: Record<string, unknown>
  websiteUrl?: string
  helpCenterUrl?: string
  readmeContent?: string
  documentationUrls?: string[]
}

export interface UseStreamIntelligenceOptions {
  /**
   * Project ID to save intelligence to. If not provided, intelligence
   * won't be saved automatically (useful for project creation flow).
   */
  projectId?: string
  /**
   * Called when intelligence generation completes successfully.
   */
  onComplete?: (intelligence: AppIntelligence) => void
  /**
   * Called when an error occurs.
   */
  onError?: (error: string) => void
}

const initialState: StreamIntelligenceState = {
  status: 'idle',
  phase: 'parsing_schema',
  progress: 0,
  message: '',
  error: null,
  intelligence: null,
}

/**
 * Hook to stream intelligence generation with real-time progress updates.
 * Can optionally save the result to a project.
 */
export function useStreamIntelligence(options: UseStreamIntelligenceOptions = {}) {
  const { projectId, onComplete, onError } = options
  const saveIntelligence = useSaveIntelligence()
  const [state, setState] = useState<StreamIntelligenceState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const start = useCallback(async (input: StreamIntelligenceInput) => {
    if (!input.schemaContent && !input.schema) {
      const error = 'No schema content or schema object provided'
      setState((prev) => ({ ...prev, status: 'error', error }))
      onError?.(error)
      return null
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setState({
      ...initialState,
      status: 'streaming',
      message: 'Starting intelligence gathering...',
    })

    try {
      // Use project-specific endpoint if projectId provided, otherwise use general endpoint
      const endpoint = projectId
        ? `/api/projects/${projectId}/intelligence/stream`
        : '/api/intelligence/stream'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaContent: input.schemaContent || undefined,
          schema: input.schema || undefined,
          websiteUrl: input.websiteUrl || undefined,
          helpCenterUrl: input.helpCenterUrl || undefined,
          readmeContent: input.readmeContent || undefined,
          documentationUrls: input.documentationUrls || undefined,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let intelligence: AppIntelligence | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6))

              if (eventData.type === 'progress') {
                const progressData = eventData.data as IntelligenceProgress
                setState((prev) => ({
                  ...prev,
                  phase: progressData.phase,
                  progress: progressData.progress,
                  message: progressData.message,
                }))
              } else if (eventData.type === 'complete') {
                intelligence = eventData.data as AppIntelligence
              } else if (eventData.type === 'error') {
                throw new Error(eventData.data.message)
              }
            } catch (parseError) {
              // If it's a JSON parse error from incomplete data, continue
              // If it's an actual error, re-throw
              if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
                throw parseError
              }
            }
          }
        }
      }

      if (!intelligence) {
        throw new Error('No intelligence data received')
      }

      // Save to project if projectId provided
      if (projectId) {
        setState((prev) => ({
          ...prev,
          status: 'saving',
          message: 'Saving intelligence...',
        }))

        // Transform AppIntelligence to the API's SaveIntelligenceInput format
        await saveIntelligence.mutateAsync({
          projectId,
          data: {
            appIdentity: {
              name: intelligence.appName,
              description: intelligence.appDescription,
              domain: intelligence.domain,
              industry: intelligence.industry,
              confidence: intelligence.overallConfidence,
            },
            features: intelligence.features.map((f) => ({
              name: f.name,
              description: f.description,
              category: f.category,
              relatedModels: f.relatedModels,
              relatedEndpoints: f.relatedEndpoints,
              confidence: f.confidence,
            })),
            journeys: intelligence.journeys.map((j) => ({
              name: j.name,
              description: j.description,
              persona: j.persona,
              steps: j.steps?.map((s) => ({
                order: s.order,
                action: s.action,
                description: s.outcome, // Map outcome to description
                endpoint: s.endpointsCalled?.[0], // Map first endpoint
                model: s.modelsAffected?.[0], // Map first model
              })),
              relatedFeatures: j.featuresUsed, // Map featuresUsed to relatedFeatures
              confidence: j.confidence,
            })),
            templates: intelligence.templates.map((t) => ({
              name: t.name,
              description: t.description,
              category: t.category,
              narrative: t.narrative,
              relevanceScore: t.relevanceScore,
            })),
          },
        })
      }

      setState({
        status: 'complete',
        phase: 'complete',
        progress: 100,
        message: 'Intelligence gathering complete!',
        error: null,
        intelligence,
      })

      onComplete?.(intelligence)
      return intelligence
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setState(initialState)
        return null
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to gather intelligence'
      setState((prev) => ({
        ...prev,
        status: 'error',
        phase: 'failed',
        error: errorMessage,
      }))
      onError?.(errorMessage)
      return null
    } finally {
      abortControllerRef.current = null
    }
  }, [projectId, saveIntelligence, onComplete, onError])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState(initialState)
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    ...state,
    start,
    cancel,
    reset,
    isStreaming: state.status === 'streaming' || state.status === 'saving',
  }
}
