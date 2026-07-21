import { describe, it, expect, vi, afterEach } from 'vitest'
import { createDemoInterceptor, demoResponse } from './interceptor'
import { createSessionState } from './session'
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

describe('status-carrying handler results', () => {
  it('honors demoResponse(body, status) including bodyless 204', async () => {
    stubNetwork()
    interceptor = createDemoInterceptor({
      fixtures: {
        'POST /api/things': () => demoResponse({ id: 'new' }, 201),
        'DELETE /api/things/:id': () => demoResponse(null, 204),
      },
      initialEnabled: true,
    })

    const created = await fetch('/api/things', { method: 'POST' })
    expect(created.status).toBe(201)
    expect(await created.json()).toEqual({ id: 'new' })

    const deleted = await fetch('/api/things/1', { method: 'DELETE' })
    expect(deleted.status).toBe(204)
    expect(await deleted.text()).toBe('')
  })

  it('maps thrown errors with a numeric status onto the mock response', async () => {
    stubNetwork()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    interceptor = createDemoInterceptor({
      fixtures: {
        'POST /api/things': () => {
          const error = new Error('nope') as Error & { status: number }
          error.status = 422
          throw error
        },
      },
      initialEnabled: true,
    })

    const res = await fetch('/api/things', { method: 'POST' })

    expect(res.status).toBe(422)
    const body = (await res.json()) as { message: string }
    expect(body.message).toContain('nope')
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('falls back to 500 when the thrown status is NaN', async () => {
    stubNetwork()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    interceptor = createDemoInterceptor({
      fixtures: {
        'POST /api/things': () => {
          const error = new Error('nope') as Error & { status: number }
          error.status = NaN
          throw error
        },
      },
      initialEnabled: true,
    })

    const res = await fetch('/api/things', { method: 'POST' })

    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe('Fixture handler error')
    expect(consoleErrorSpy).toHaveBeenCalledOnce()
    consoleErrorSpy.mockRestore()
  })

  it('falls back to 500 when the thrown status is out of range (999)', async () => {
    stubNetwork()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    interceptor = createDemoInterceptor({
      fixtures: {
        'POST /api/things': () => {
          const error = new Error('nope') as Error & { status: number }
          error.status = 999
          throw error
        },
      },
      initialEnabled: true,
    })

    const res = await fetch('/api/things', { method: 'POST' })

    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe('Fixture handler error')
    expect(consoleErrorSpy).toHaveBeenCalledOnce()
    consoleErrorSpy.mockRestore()
  })

  it('still logs console.error and returns 500 for a generic throw (regression)', async () => {
    stubNetwork()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    interceptor = createDemoInterceptor({
      fixtures: {
        'POST /api/things': () => {
          throw new Error('boom')
        },
      },
      initialEnabled: true,
    })

    const res = await fetch('/api/things', { method: 'POST' })

    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe('Fixture handler error')
    expect(consoleErrorSpy).toHaveBeenCalledOnce()
    consoleErrorSpy.mockRestore()
  })
})

describe('onSessionReset', () => {
  it('fires when resetSession() is called', () => {
    const onSessionReset = vi.fn()
    interceptor = createDemoInterceptor({ fixtures: {}, onSessionReset })

    interceptor.resetSession()

    expect(onSessionReset).toHaveBeenCalledTimes(1)
  })
})

describe('coverage-health callbacks', () => {
  it('fires onUnmatchedRequest for an unmatched GET and still passes it through', async () => {
    const spy = stubNetwork()
    const onUnmatchedRequest = vi.fn()
    interceptor = createDemoInterceptor({
      fixtures: {},
      initialEnabled: true,
      onUnmatchedRequest,
    })

    await fetch('/api/nope')

    expect(spy).toHaveBeenCalledOnce()
    expect(onUnmatchedRequest).toHaveBeenCalledOnce()
    expect(onUnmatchedRequest).toHaveBeenCalledWith({ method: 'GET', pathname: '/api/nope' })
  })

  it('fires onProjectionError for a >= 500 handler throw but not for a 422', async () => {
    stubNetwork()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onProjectionError = vi.fn()
    interceptor = createDemoInterceptor({
      fixtures: {
        'POST /api/boom': () => {
          throw Object.assign(new Error('boom'), { status: 500 })
        },
        'POST /api/rejected': () => {
          throw Object.assign(new Error('nope'), { status: 422 })
        },
      },
      initialEnabled: true,
      onProjectionError,
    })

    const boomRes = await fetch('/api/boom', { method: 'POST' })
    expect(boomRes.status).toBe(500)
    expect(onProjectionError).toHaveBeenCalledOnce()
    expect(onProjectionError).toHaveBeenCalledWith({ method: 'POST', pathname: '/api/boom', status: 500 })

    const rejectedRes = await fetch('/api/rejected', { method: 'POST' })
    expect(rejectedRes.status).toBe(422)
    expect(onProjectionError).toHaveBeenCalledOnce()

    consoleErrorSpy.mockRestore()
  })
})

describe('session ownership on destroy', () => {
  it('clears a self-created session on destroy', () => {
    interceptor = createDemoInterceptor({ fixtures: {} })
    interceptor.getSession().set('k', 'v')

    interceptor.destroy()

    expect(interceptor.getSession().has('k')).toBe(false)
  })

  it('leaves an injected session intact on destroy', () => {
    const session = createSessionState()
    session.set('k', 'v')
    interceptor = createDemoInterceptor({ fixtures: {}, session })

    interceptor.destroy()

    expect(session.get('k')).toBe('v')
  })
})
