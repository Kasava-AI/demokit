import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createSessionState, type ResolveDeps } from '@demokit-ai/core'
import { createMswRequestHandler } from '../handler'

function deps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    fixtures: {}, baseUrl: 'http://localhost', warnOnCatchAll: false,
    unmatchedMutations: 'block', session: createSessionState(), ...overrides,
  }
}

let currentDeps: ResolveDeps | null = null
const server = setupServer(
  // Registered before the catch-all: MSW resolves handlers in array order and
  // the first predicate match whose resolver returns any Response (including
  // the passthrough() 302 marker) is terminal, so the specific fallback must
  // come first for passthrough() to have somewhere real to land in node.
  http.get('http://localhost/api/real', () => HttpResponse.json({ from: 'network' })),
  createMswRequestHandler(() => currentDeps)
)
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => { currentDeps = null })
afterAll(() => server.close())

describe('createMswRequestHandler', () => {
  it('serves matched fixtures through the shared resolver', async () => {
    currentDeps = deps({ fixtures: { 'GET /api/users/:id': ({ params }) => ({ id: params.id }) } })
    const res = await fetch('http://localhost/api/users/9')
    expect(res.headers.get('X-DemoKit-Mock')).toBe('true')
    await expect(res.json()).resolves.toEqual({ id: '9' })
  })

  it('passes unmatched safe requests through to the network', async () => {
    currentDeps = deps()
    const res = await fetch('http://localhost/api/real')
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
    const res = await fetch('http://localhost/api/real')
    await expect(res.json()).resolves.toEqual({ from: 'network' })
  })
})
