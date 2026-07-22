import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { createServer, type Server } from 'node:http'
import { createSessionState, type ResolveDeps } from '@demokit-ai/core'
import { createMswRequestHandler } from '../handler'
import { attachBypassObserver } from '../bypass-observer'

function deps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    fixtures: {}, baseUrl: 'http://localhost', warnOnCatchAll: false,
    unmatchedMutations: 'block', session: createSessionState(), ...overrides,
  }
}

let currentDeps: ResolveDeps | null = null
const server = setupServer(createMswRequestHandler(() => currentDeps))

// Same real-network passthrough-target pattern as handler.test.ts (Phase 4's
// vacuity fix): passthrough() performs a genuine outbound request, so a
// second mock handler can never "catch" it — it needs a real listener.
let realServer: Server
let realServerUrl: string

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'bypass' })
  realServer = createServer((req, res) => {
    if (req.url === '/api/real') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ from: 'network' }))
      return
    }
    res.writeHead(404)
    res.end()
  })
  await new Promise<void>((resolve) => realServer.listen(0, '127.0.0.1', () => resolve()))
  const address = realServer.address()
  const port = typeof address === 'object' && address !== null ? address.port : 0
  realServerUrl = `http://127.0.0.1:${port}`
})
afterEach(() => { currentDeps = null })
afterAll(async () => {
  server.close()
  await new Promise<void>((resolve) => realServer.close(() => resolve()))
})

// `setupServer` in Node exposes the identical `LifeCycleEventEmitter` /
// `response:bypass` payload shape that `setupWorker` exposes in the browser
// (msw shares the same core across both) — `createMswTransport`'s worker
// can't run a real Service Worker under Node, so these tests drive the
// exact same observer wiring against the server transport instead, per the
// brief's guidance.
describe('attachBypassObserver (response:bypass hook)', () => {
  it('fires with the real network response for a bypassed request', async () => {
    currentDeps = deps({ baseUrl: realServerUrl })
    const onBypassResponse = vi.fn()
    const observer = attachBypassObserver(server.events, onBypassResponse)
    try {
      const res = await fetch(`${realServerUrl}/api/real`)
      await res.json()
    } finally {
      observer.detach()
    }

    expect(onBypassResponse).toHaveBeenCalledOnce()
    const info = onBypassResponse.mock.calls[0]![0]
    expect(info.request.url).toBe(`${realServerUrl}/api/real`)
    expect(info.response).toBeInstanceOf(Response)
    await expect(info.response.clone().json()).resolves.toEqual({ from: 'network' })
  })

  it('does not fire for a matched (mocked) request', async () => {
    currentDeps = deps({ fixtures: { 'GET /api/users/:id': ({ params }: { params: { id: string } }) => ({ id: params.id }) } })
    const onBypassResponse = vi.fn()
    const observer = attachBypassObserver(server.events, onBypassResponse)
    try {
      const res = await fetch('http://localhost/api/users/9')
      await res.json()
    } finally {
      observer.detach()
    }

    expect(onBypassResponse).not.toHaveBeenCalled()
  })

  it('stops firing once detached', async () => {
    currentDeps = deps({ baseUrl: realServerUrl })
    const onBypassResponse = vi.fn()
    const observer = attachBypassObserver(server.events, onBypassResponse)
    observer.detach()

    const res = await fetch(`${realServerUrl}/api/real`)
    await res.json()

    expect(onBypassResponse).not.toHaveBeenCalled()
  })

  it('contains a throwing callback — the caller still gets its response', async () => {
    currentDeps = deps({ baseUrl: realServerUrl })
    const onBypassResponse = vi.fn(() => {
      throw new Error('boom')
    })
    const observer = attachBypassObserver(server.events, onBypassResponse)
    try {
      const res = await fetch(`${realServerUrl}/api/real`)
      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual({ from: 'network' })
    } finally {
      observer.detach()
    }

    expect(onBypassResponse).toHaveBeenCalledOnce()
  })
})
