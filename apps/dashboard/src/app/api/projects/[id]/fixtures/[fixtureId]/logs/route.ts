/**
 * Fixture Logs API Route (OSS)
 *
 * SSE endpoint for real-time API call logs.
 */

import { getAuthenticatedUser } from '@/lib/api/auth'
import { getDb } from '@/lib/api/db'
import { notFound } from '@/lib/api/utils'
import { fixtures, projects, apiCallLogs } from '@db'
import { eq, and, desc, gt } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string; fixtureId: string }> }

/**
 * GET /api/projects/[id]/fixtures/[fixtureId]/logs
 *
 * SSE endpoint for real-time API call logs.
 * Streams log entries as they occur.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id, fixtureId } = await params
  await getAuthenticatedUser()

  const db = getDb()

  // Verify project exists
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  })

  if (!project) {
    return notFound('Project')
  }

  // Verify fixture exists
  const fixture = await db.query.fixtures.findFirst({
    where: and(eq(fixtures.id, fixtureId), eq(fixtures.projectId, id)),
  })

  if (!fixture) {
    return notFound('Fixture')
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  let lastLogId: string | null = null
  let isAborted = false

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial batch of logs (last 50)
      try {
        const initialLogs = await db.query.apiCallLogs.findMany({
          where: eq(apiCallLogs.fixtureId, fixtureId),
          orderBy: [desc(apiCallLogs.timestamp)],
          limit: 50,
        })

        // Reverse to show oldest first, then newest
        const orderedLogs = initialLogs.reverse()

        if (orderedLogs.length > 0) {
          lastLogId = orderedLogs[orderedLogs.length - 1].id
        }

        // Send initial logs
        const initMessage = JSON.stringify({
          type: 'initial',
          logs: orderedLogs.reverse(), // Newest first for display
        })
        controller.enqueue(encoder.encode(`data: ${initMessage}\n\n`))
      } catch (error) {
        console.error('Failed to fetch initial logs:', error)
      }

      // Poll for new logs every 2 seconds
      const pollInterval = setInterval(async () => {
        if (isAborted) {
          clearInterval(pollInterval)
          return
        }

        try {
          const newLogs = await db.query.apiCallLogs.findMany({
            where: and(
              eq(apiCallLogs.fixtureId, fixtureId),
              lastLogId ? gt(apiCallLogs.id, lastLogId) : undefined
            ),
            orderBy: [desc(apiCallLogs.timestamp)],
            limit: 20,
          })

          for (const log of newLogs.reverse()) {
            const logMessage = JSON.stringify({
              type: 'log',
              log,
            })
            controller.enqueue(encoder.encode(`data: ${logMessage}\n\n`))
            lastLogId = log.id
          }
        } catch (error) {
          console.error('Failed to poll for new logs:', error)
        }
      }, 2000)

      // Handle abort signal
      request.signal.addEventListener('abort', () => {
        isAborted = true
        clearInterval(pollInterval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
