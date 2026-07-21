import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { createServer, type Server } from 'node:http'
import { createSessionState, type ResolveDeps } from '@demokit-ai/core'
import { createMswRequestHandler } from '../handler'

function deps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    fixtures: {}, baseUrl: 'http://localhost', warnOnCatchAll: false,
    unmatchedMutations: 'block', session: createSessionState(), ...overrides,
  }
}

let currentDeps: ResolveDeps | null = null
const server = setupServer(createMswRequestHandler(() => currentDeps))

// MSW's passthrough() performs a genuine outbound request — a second mock
// handler can never "catch" it, because MSW resolves handlers in array order
// and the first predicate match whose resolver returns any Response
// (including the passthrough() marker) is terminal. So the passthrough tests
// below need a real listener to land on, not another mock handler.
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

describe('createMswRequestHandler', () => {
  it('serves matched fixtures through the shared resolver', async () => {
    currentDeps = deps({ fixtures: { 'GET /api/users/:id': ({ params }) => ({ id: params.id }) } })
    const res = await fetch('http://localhost/api/users/9')
    expect(res.headers.get('X-DemoKit-Mock')).toBe('true')
    await expect(res.json()).resolves.toEqual({ id: '9' })
  })

  it('passes unmatched safe requests through to the network', async () => {
    currentDeps = deps({ baseUrl: realServerUrl })
    const res = await fetch(`${realServerUrl}/api/real`)
    await expect(res.json()).resolves.toEqual({ from: 'network' })
  })

  it('blocks unmatched mutations with the 409 policy body', async () => {
    const onMutationBlocked = vi.fn()
    currentDeps = deps({ onMutationBlocked })
    const res = await fetch('http://localhost/api/real', { method: 'POST' })
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({ demokit: 'blocked' })
    expect(onMutationBlocked).toHaveBeenCalledOnce()
  })

  it('parses request bodies identically to the fetch transport', async () => {
    currentDeps = deps({ fixtures: { 'POST /api/echo': ({ body }) => body } })
    const res = await fetch('http://localhost/api/echo', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ a: 1 }),
    })
    await expect(res.json()).resolves.toEqual({ a: 1 })
  })

  it('is inert (passthrough) when deps are null', async () => {
    currentDeps = null
    const res = await fetch(`${realServerUrl}/api/real`)
    await expect(res.json()).resolves.toEqual({ from: 'network' })
  })
})
