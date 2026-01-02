/**
 * Hook for streaming source fetch progress
 *
 * Provides real-time updates when fetching/scraping a source URL.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ProjectSource } from '@/lib/api-client/sources'

export type SourceFetchPhase = 'initializing' | 'scraping' | 'processing' | 'saving' | 'complete' | 'failed'
export type SourceFetchStatus = 'idle' | 'streaming' | 'complete' | 'error'

export interface SourceFetchProgress {
  phase: SourceFetchPhase
  progress: number
  message: string
}

export interface StreamSourceFetchState {
  status: SourceFetchStatus
  phase: SourceFetchPhase
  progress: number
  message: string
  error: string | null
  source: ProjectSource | null
}

export interface UseStreamSourceFetchOptions {
  /**
   * Called when fetch completes successfully.
   */
  onComplete?: (source: ProjectSource) => void
  /**
   * Called when an error occurs.
   */
  onError?: (error: string) => void
}

const initialState: StreamSourceFetchState = {
  status: 'idle',
  phase: 'initializing',
  progress: 0,
  message: '',
  error: null,
  source: null,
}

/**
 * Hook to stream source fetch progress with real-time updates.
 */
export function useStreamSourceFetch(options: UseStreamSourceFetchOptions = {}) {
  const { onComplete, onError } = options
  const queryClient = useQueryClient()
  const [state, setState] = useState<StreamSourceFetchState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const start = useCallback(async (projectId: string, sourceId: string) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setState({
      ...initialState,
      status: 'streaming',
      message: 'Starting fetch...',
    })

    try {
      const response = await fetch(
        `/api/projects/${projectId}/sources/${sourceId}/fetch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
        }
      )

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
      let fetchedSource: ProjectSource | null = null

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
                const progressData = eventData.data as SourceFetchProgress
                setState((prev) => ({
                  ...prev,
                  phase: progressData.phase,
                  progress: progressData.progress,
                  message: progressData.message,
                }))
              } else if (eventData.type === 'complete') {
                fetchedSource = eventData.data.source as ProjectSource
              } else if (eventData.type === 'error') {
                throw new Error(eventData.data.message)
              }
            } catch (parseError) {
              // If it's a JSON parse error from incomplete data, continue
              if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
                throw parseError
              }
            }
          }
        }
      }

      if (!fetchedSource) {
        throw new Error('No source data received')
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'sources'],
      })
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      })

      setState({
        status: 'complete',
        phase: 'complete',
        progress: 100,
        message: 'Content fetched successfully!',
        error: null,
        source: fetchedSource,
      })

      onComplete?.(fetchedSource)
      return fetchedSource
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setState(initialState)
        return null
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch source'
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
  }, [queryClient, onComplete, onError])

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
    isStreaming: state.status === 'streaming',
  }
}
