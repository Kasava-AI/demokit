import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useStreamSourceFetch } from '../use-stream-source-fetch'
import type { ProjectSource } from '@/lib/api-client/sources'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

/**
 * Creates a mock SSE response with the given events
 */
function createMockSSEResponse(events: Array<{ type: string; data: unknown }>) {
  const encoder = new TextEncoder()
  const sseData = events
    .map(event => `data: ${JSON.stringify(event)}\n\n`)
    .join('')

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseData))
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
    },
  })
}

/**
 * Creates a mock source object
 */
function createMockSource(overrides: Partial<ProjectSource> = {}): ProjectSource {
  return {
    id: 'source-123',
    projectId: 'project-123',
    type: 'website',
    url: 'https://example.com',
    content: 'Scraped content',
    extractedContent: null,
    fetchStatus: 'completed',
    fetchError: null,
    lastFetchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Wrapper component with QueryClientProvider
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useStreamSourceFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts with idle status', () => {
      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.phase).toBe('initializing')
      expect(result.current.progress).toBe(0)
      expect(result.current.message).toBe('')
      expect(result.current.error).toBeNull()
      expect(result.current.source).toBeNull()
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('start function', () => {
    it('sets status to streaming when started', async () => {
      const mockSource = createMockSource()
      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'progress', data: { phase: 'initializing', progress: 10, message: 'Starting...' } },
          { type: 'complete', data: { source: mockSource } },
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.start('project-123', 'source-123')
      })

      expect(result.current.status).toBe('streaming')
      expect(result.current.isStreaming).toBe(true)

      await waitFor(() => {
        expect(result.current.status).toBe('complete')
      })
    })

    it('makes POST request to correct URL', async () => {
      const mockSource = createMockSource()
      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'complete', data: { source: mockSource } },
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/project-123/sources/source-123/fetch',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('processes progress events and updates state', async () => {
      const mockSource = createMockSource()
      const progressEvents = [
        { type: 'progress', data: { phase: 'initializing', progress: 10, message: 'Starting...' } },
        { type: 'progress', data: { phase: 'scraping', progress: 30, message: 'Scraping example.com...' } },
        { type: 'progress', data: { phase: 'processing', progress: 70, message: 'Processing content...' } },
        { type: 'progress', data: { phase: 'saving', progress: 90, message: 'Saving...' } },
        { type: 'progress', data: { phase: 'complete', progress: 100, message: 'Done!' } },
        { type: 'complete', data: { source: mockSource } },
      ]

      mockFetch.mockResolvedValue(createMockSSEResponse(progressEvents))

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(result.current.status).toBe('complete')
      expect(result.current.phase).toBe('complete')
      expect(result.current.progress).toBe(100)
      expect(result.current.source).toEqual(mockSource)
    })

    it('calls onComplete callback when successful', async () => {
      const mockSource = createMockSource()
      const onComplete = vi.fn()

      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'complete', data: { source: mockSource } },
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch({ onComplete }), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(onComplete).toHaveBeenCalledWith(mockSource)
    })

    it('returns the source on success', async () => {
      const mockSource = createMockSource()

      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'complete', data: { source: mockSource } },
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      let returnedSource: ProjectSource | null = null
      await act(async () => {
        returnedSource = await result.current.start('project-123', 'source-123')
      })

      expect(returnedSource).toEqual(mockSource)
    })
  })

  describe('error handling', () => {
    it('handles HTTP errors', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(result.current.status).toBe('error')
      expect(result.current.phase).toBe('failed')
      expect(result.current.error).toBe('Not found')
    })

    it('handles SSE error events', async () => {
      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'progress', data: { phase: 'scraping', progress: 30, message: 'Scraping...' } },
          { type: 'error', data: { message: 'Failed to scrape website' } },
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Failed to scrape website')
    })

    it('calls onError callback on failure', async () => {
      const onError = vi.fn()

      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'error', data: { message: 'Connection failed' } },
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch({ onError }), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(onError).toHaveBeenCalledWith('Connection failed')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Network error')
    })

    it('handles missing response body', async () => {
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('No response body')
    })

    it('handles missing source data in complete event', async () => {
      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'progress', data: { phase: 'complete', progress: 100, message: 'Done' } },
          // Missing complete event with source
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('No source data received')
    })
  })

  describe('cancel function', () => {
    it('resets state when cancelled', async () => {
      const mockSource = createMockSource()

      // Create a slow response that we can cancel
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(createMockSSEResponse([
              { type: 'complete', data: { source: mockSource } },
            ]))
          }, 1000)
        })
      })

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.start('project-123', 'source-123')
      })

      // Cancel while streaming
      act(() => {
        result.current.cancel()
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.progress).toBe(0)
    })
  })

  describe('reset function', () => {
    it('resets to initial state', async () => {
      const mockSource = createMockSource()

      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'complete', data: { source: mockSource } },
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.start('project-123', 'source-123')
      })

      expect(result.current.status).toBe('complete')

      act(() => {
        result.current.reset()
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.phase).toBe('initializing')
      expect(result.current.progress).toBe(0)
      expect(result.current.source).toBeNull()
    })
  })

  describe('isStreaming computed property', () => {
    it('returns true only when status is streaming', async () => {
      const mockSource = createMockSource()

      mockFetch.mockResolvedValue(
        createMockSSEResponse([
          { type: 'complete', data: { source: mockSource } },
        ])
      )

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      // Initially not streaming
      expect(result.current.isStreaming).toBe(false)

      let startPromise: Promise<ProjectSource | null>
      act(() => {
        startPromise = result.current.start('project-123', 'source-123')
      })

      // While streaming
      expect(result.current.isStreaming).toBe(true)

      await act(async () => {
        await startPromise
      })

      // After complete
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('concurrent request handling', () => {
    it('cancels previous request when new one starts', async () => {
      const mockSource1 = createMockSource({ id: 'source-1' })
      const mockSource2 = createMockSource({ id: 'source-2' })

      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        const source = callCount === 1 ? mockSource1 : mockSource2
        return Promise.resolve(
          createMockSSEResponse([
            { type: 'complete', data: { source } },
          ])
        )
      })

      const { result } = renderHook(() => useStreamSourceFetch(), {
        wrapper: createWrapper(),
      })

      // Start first request
      act(() => {
        result.current.start('project-123', 'source-1')
      })

      // Start second request immediately (should cancel first)
      await act(async () => {
        await result.current.start('project-123', 'source-2')
      })

      // Should have the second source
      expect(result.current.source?.id).toBe('source-2')
    })
  })
})
