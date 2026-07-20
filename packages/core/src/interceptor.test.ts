import { describe, it, expect, vi, afterEach } from 'vitest'
import { createDemoInterceptor } from './interceptor'
import type { DemoInterceptor, UnmatchedMutationContext, RequestContext } from './types'

const realFetch = globalThis.fetch
let interceptor: DemoInterceptor | null = null

/** Install a network stub BEFORE creating the interceptor so it is captured as originalFetch */
function stubNetwork() {
  const spy = vi.fn(
    async () => new Response(JSON.stringify({ real: true }), { status: 200 })
  )
  globalThis.fetch = spy as unknown as typeof fetch
  return spy
}

afterEach(() => {
  interceptor?.destroy()
  interceptor = null
  globalThis.fetch = realFetch
})

describe('unmatched mutation policy', () => {
  it('blocks an unmatched POST with a 409 by default', async () => {
    const spy = stubNetwork()
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: true })

    const res = await fetch('/api/users', { method: 'POST', body: '{}' })

    expect(res.status).toBe(409)
    expect(res.headers.get('X-DemoKit-Mock')).toBe('true')
    const body = await res.json()
    expect(body).toMatchObject({
      demokit: 'blocked',
      reason: 'unmatched-mutation',
      method: 'POST',
      path: '/api/users',
    })
    expect(spy).not.toHaveBeenCalled()
  })

  it('passes unmatched GET / HEAD / OPTIONS through to the network', async () => {
    const spy = stubNetwork()
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: true })

    await fetch('/api/users')
    await fetch('/api/users', { method: 'HEAD' })
    await fetch('/api/users', { method: 'OPTIONS' })

    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('fires onMutationBlocked with url, method, and pathname', async () => {
    stubNetwork()
    const onMutationBlocked = vi.fn()
    interceptor = createDemoInterceptor({
      fixtures: {},
      initialEnabled: true,
      onMutationBlocked,
    })

    await fetch('/api/orders/7', { method: 'DELETE' })

    expect(onMutationBlocked).toHaveBeenCalledOnce()
    const ctx = onMutationBlocked.mock.calls[0]![0] as UnmatchedMutationContext
    expect(ctx.method).toBe('DELETE')
    expect(ctx.pathname).toBe('/api/orders/7')
    expect(ctx.url).toContain('/api/orders/7')
  })

  it("unmatchedMutations: 'passthrough' restores the old behavior", async () => {
    const spy = stubNetwork()
    interceptor = createDemoInterceptor({
      fixtures: {},
      initialEnabled: true,
      unmatchedMutations: 'passthrough',
    })

    await fetch('/api/users', { method: 'POST', body: '{}' })

    expect(spy).toHaveBeenCalledOnce()
  })

  it('supports a function policy deciding per request', async () => {
    const spy = stubNetwork()
    interceptor = createDemoInterceptor({
      fixtures: {},
      initialEnabled: true,
      unmatchedMutations: (ctx) =>
        ctx.pathname === '/api/telemetry' ? 'passthrough' : 'block',
    })

    const blocked = await fetch('/api/users', { method: 'POST', body: '{}' })
    await fetch('/api/telemetry', { method: 'POST', body: '{}' })

    expect(blocked.status).toBe(409)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('still executes matched mutation fixtures (regression)', async () => {
    stubNetwork()
    const onMutationIntercepted = vi.fn()
    interceptor = createDemoInterceptor({
      fixtures: { 'POST /api/users': ({ body }: RequestContext) => ({ id: 'new', ...(body as object) }) },
      initialEnabled: true,
      onMutationIntercepted,
    })

    const res = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'A' }),
      headers: { 'content-type': 'application/json' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'new', name: 'A' })
    expect(onMutationIntercepted).toHaveBeenCalledOnce()
  })

  it('passes everything through when demo mode is disabled (regression)', async () => {
    const spy = stubNetwork()
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: false })

    await fetch('/api/users', { method: 'POST', body: '{}' })

    expect(spy).toHaveBeenCalledOnce()
  })

  it('blocks an unmatched POST made via a Request object', async () => {
    const spy = stubNetwork()
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: true })

    const res = await fetch(new Request('http://localhost/api/users', { method: 'POST' }))

    expect(res.status).toBe(409)
    expect(spy).not.toHaveBeenCalled()
  })
})
