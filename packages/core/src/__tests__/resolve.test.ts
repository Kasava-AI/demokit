import { describe, it, expect, vi } from 'vitest'
import { resolveRequest, createMockResponse, type ResolveDeps } from '../resolve'
import { createSessionState } from '../session'
import { demoResponse } from '../interceptor'

function deps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    fixtures: {},
    baseUrl: 'http://localhost',
    warnOnCatchAll: false,
    unmatchedMutations: 'block',
    session: createSessionState(),
    ...overrides,
  }
}

describe('resolveRequest', () => {
  it('passes through unmatched safe methods and fires onUnmatchedRequest', async () => {
    const onUnmatchedRequest = vi.fn()
    const out = await resolveRequest(deps({ onUnmatchedRequest }), '/api/unknown')
    expect(out).toEqual({ kind: 'passthrough' })
    expect(onUnmatchedRequest).toHaveBeenCalledWith({ method: 'GET', pathname: '/api/unknown' })
  })

  it('blocks unmatched mutations with a 409 and fires onMutationBlocked', async () => {
    const onMutationBlocked = vi.fn()
    const out = await resolveRequest(deps({ onMutationBlocked }), '/api/unknown', { method: 'POST' })
    expect(out.kind).toBe('response')
    const res = (out as { kind: 'response'; response: Response }).response
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({ demokit: 'blocked', method: 'POST', path: '/api/unknown' })
    expect(onMutationBlocked).toHaveBeenCalledOnce()
  })

  it('passes through unmatched mutations under a passthrough policy', async () => {
    const out = await resolveRequest(deps({ unmatchedMutations: 'passthrough' }), '/api/unknown', { method: 'DELETE' })
    expect(out).toEqual({ kind: 'passthrough' })
  })

  it('invokes a matched handler with params, searchParams, and session', async () => {
    const session = createSessionState()
    session.set('k', 'v')
    const handler = vi.fn(({ params, searchParams, session: s }) => ({
      id: params.id, q: searchParams.get('q'), k: s.get('k'),
    }))
    const out = await resolveRequest(
      deps({ fixtures: { 'GET /api/users/:id': handler }, session }),
      '/api/users/42?q=x'
    )
    const res = (out as { kind: 'response'; response: Response }).response
    await expect(res.json()).resolves.toEqual({ id: '42', q: 'x', k: 'v' })
  })

  it('parses a JSON body from a Request input (no init)', async () => {
    const handler = vi.fn(({ body }) => body)
    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada' }),
    })
    const out = await resolveRequest(deps({ fixtures: { 'POST /api/users': handler } }), req)
    const res = (out as { kind: 'response'; response: Response }).response
    await expect(res.json()).resolves.toEqual({ name: 'Ada' })
  })

  it('seeds context headers from a Request input', async () => {
    const handler = vi.fn(({ headers }) => ({ auth: headers.get('authorization') }))
    const req = new Request('http://localhost/api/me', { headers: { authorization: 'Bearer t' } })
    const out = await resolveRequest(deps({ fixtures: { 'GET /api/me': handler } }), req)
    const res = (out as { kind: 'response'; response: Response }).response
    await expect(res.json()).resolves.toEqual({ auth: 'Bearer t' })
  })

  it('tolerates a Request whose body was already consumed before resolution', async () => {
    const handler = vi.fn(({ body }) => ({ body }))
    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada' }),
    })
    await req.text() // disturb the body stream before resolveRequest ever sees it
    const out = await resolveRequest(deps({ fixtures: { 'POST /api/users': handler } }), req)
    const res = (out as { kind: 'response'; response: Response }).response
    expect(res.status).not.toBe(500)
    await expect(res.json()).resolves.toEqual({ body: undefined })
  })

  it('maps demoResponse results to their explicit status', async () => {
    const out = await resolveRequest(
      deps({ fixtures: { 'POST /api/things': () => demoResponse({ id: 'n' }, 201) } }),
      '/api/things', { method: 'POST' }
    )
    expect((out as { kind: 'response'; response: Response }).response.status).toBe(201)
  })

  it('maps status-carrying handler rejections without firing onProjectionError below 500', async () => {
    const onProjectionError = vi.fn()
    const out = await resolveRequest(
      deps({
        onProjectionError,
        fixtures: { 'POST /api/checkout': () => { throw Object.assign(new Error('nope'), { status: 422 }) } },
      }),
      '/api/checkout', { method: 'POST' }
    )
    expect((out as { kind: 'response'; response: Response }).response.status).toBe(422)
    expect(onProjectionError).not.toHaveBeenCalled()
  })

  it('fires onProjectionError for 500-class handler failures', async () => {
    const onProjectionError = vi.fn()
    const out = await resolveRequest(
      deps({ onProjectionError, fixtures: { 'GET /api/boom': () => { throw new Error('kaboom') } } }),
      '/api/boom'
    )
    expect((out as { kind: 'response'; response: Response }).response.status).toBe(500)
    expect(onProjectionError).toHaveBeenCalledWith({ method: 'GET', pathname: '/api/boom', status: 500 })
  })

  it('rewrites paths through pathAliases before matching', async () => {
    const handler = vi.fn(() => ({ ok: true }))
    const out = await resolveRequest(
      deps({ fixtures: { 'GET /api/v2/users': handler }, pathAliases: { '/api/v1': '/api/v2' } }),
      '/api/v1/users'
    )
    expect(out.kind).toBe('response')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('fires onMutationIntercepted for matched non-GET requests', async () => {
    const onMutationIntercepted = vi.fn()
    await resolveRequest(
      deps({ onMutationIntercepted, fixtures: { 'PUT /api/users/:id': () => ({}) } }),
      '/api/users/7', { method: 'PUT' }
    )
    expect(onMutationIntercepted).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT', pattern: 'PUT /api/users/:id', params: { id: '7' } })
    )
  })
})

describe('createMockResponse', () => {
  it('emits a null body for bodyless statuses', async () => {
    const res = createMockResponse({ ignored: true }, 204)
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
  })
  it('stamps the X-DemoKit-Mock header', () => {
    expect(createMockResponse({}).headers.get('X-DemoKit-Mock')).toBe('true')
  })
})
