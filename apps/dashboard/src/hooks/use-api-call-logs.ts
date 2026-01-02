import { useState, useEffect, useCallback, useRef } from 'react'

export interface ApiCallLog {
  id: string
  fixtureId: string
  timestamp: string
  ipAddress: string | null
  userAgent: string | null
  responseTimeMs: number | null
  statusCode: number
  errorMessage: string | null
}

interface UseApiCallLogsOptions {
  fixtureId: string
  projectId: string
}

/**
 * Hook for real-time API call logs using Server-Sent Events.
 * Connects to the SSE endpoint and maintains log state.
 */
export function useApiCallLogs({ fixtureId, projectId }: UseApiCallLogsOptions) {
  const [logs, setLogs] = useState<ApiCallLog[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const pausedLogsRef = useRef<ApiCallLog[]>([])

  // Connect to SSE endpoint
  useEffect(() => {
    if (!fixtureId || !projectId) return

    const url = `/api/projects/${projectId}/fixtures/${fixtureId}/logs`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'initial') {
          // Initial batch of logs
          setLogs(data.logs || [])
        } else if (data.type === 'log') {
          // New log entry
          const newLog: ApiCallLog = data.log
          if (isPaused) {
            // Store in buffer while paused
            pausedLogsRef.current = [newLog, ...pausedLogsRef.current]
          } else {
            setLogs((prev) => [newLog, ...prev].slice(0, 100)) // Keep last 100 logs
          }
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      setError(new Error('Connection lost. Attempting to reconnect...'))
      // EventSource will automatically try to reconnect
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [fixtureId, projectId, isPaused])

  // Toggle pause state
  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      if (prev) {
        // Resuming - merge buffered logs
        setLogs((current) => {
          const merged = [...pausedLogsRef.current, ...current]
          pausedLogsRef.current = []
          return merged.slice(0, 100)
        })
      }
      return !prev
    })
  }, [])

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([])
    pausedLogsRef.current = []
  }, [])

  return {
    logs,
    isConnected,
    isPaused,
    error,
    togglePause,
    clearLogs,
  }
}
