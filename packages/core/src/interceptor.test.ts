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

describe('passthrough shape observation (spec §9.4)', () => {
  function jsonResponse(body: unknown, opts: { status?: number; withLength?: boolean } = {}): Response {
    const { status = 200, withLength = true } = opts
    const text = JSON.stringify(body)
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (withLength) headers['content-length'] = String(text.length)
    return new Response(text, { status, headers })
  }

  /** Poll until `assertion` stops throwing, or fail after real time passes (the shape hook is fire-and-forget). */
  async function waitFor(assertion: () => void): Promise<void> {
    const deadline = Date.now() + 1000
    for (;;) {
      try {
        assertion()
        return
      } catch (error) {
        if (Date.now() > deadline) throw error
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
    }
  }

  it('fires onPassthroughShape for an unmatched GET returning JSON 2xx, and the caller still gets the body intact', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ id: '1', name: 'Ada' })) as unknown as typeof fetch
    const onPassthroughShape = vi.fn()
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: true, onPassthroughShape })

    const res = await fetch('/api/unknown')

    expect(await res.json()).toEqual({ id: '1', name: 'Ada' })
    await waitFor(() => expect(onPassthroughShape).toHaveBeenCalledOnce())
    expect(onPassthroughShape).toHaveBeenCalledWith({
      method: 'GET',
      pathname: '/api/unknown',
      shape: { t: 'object', keys: { id: { t: 'string' }, name: { t: 'string' } } },
    })
  })

  it('does not fire onPassthroughShape for a non-JSON passthrough response', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response('plain text', { status: 200, headers: { 'content-type': 'text/plain' } })
    ) as unknown as typeof fetch
    const onPassthroughShape = vi.fn()
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: true, onPassthroughShape })

    await fetch('/api/unknown')
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(onPassthroughShape).not.toHaveBeenCalled()
  })

  it('does not fire onPassthroughShape for a 4xx passthrough response', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ error: 'nope' }, { status: 404 })) as unknown as typeof fetch
    const onPassthroughShape = vi.fn()
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: true, onPassthroughShape })

    await fetch('/api/unknown')
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(onPassthroughShape).not.toHaveBeenCalled()
  })

  it('does not fire onPassthroughShape when content-length exceeds 1 MiB', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ small: true }), {
          status: 200,
          headers: { 'content-type': 'application/json', 'content-length': String(2 * 1024 * 1024) },
        })
    ) as unknown as typeof fetch
    const onPassthroughShape = vi.fn()
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: true, onPassthroughShape })

    await fetch('/api/unknown')
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(onPassthroughShape).not.toHaveBeenCalled()
  })

  it('does not fire onPassthroughShape when observeShapes is false', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ id: '1' })) as unknown as typeof fetch
    const onPassthroughShape = vi.fn()
    interceptor = createDemoInterceptor({
      fixtures: {},
      initialEnabled: true,
      observeShapes: false,
      onPassthroughShape,
    })

    await fetch('/api/unknown')
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(onPassthroughShape).not.toHaveBeenCalled()
  })

  it('does not fire onPassthroughShape for a control-plane passthrough request (the negative case)', async () => {
    const spy = vi.fn(async () => jsonResponse({ ok: true }))
    globalThis.fetch = spy as unknown as typeof fetch
    const onPassthroughShape = vi.fn()
    const onUnmatchedRequest = vi.fn()
    interceptor = createDemoInterceptor({
      fixtures: {},
      initialEnabled: true,
      controlPlaneOrigin: 'https://api.demokit.cloud/api',
      onPassthroughShape,
      onUnmatchedRequest,
    })

    // Same origin as controlPlaneOrigin: bypasses matching silently, before
    // onUnmatchedRequest ever fires — the shape hook must never see it,
    // distinguishing it from an ordinary unmatched-safe passthrough.
    await fetch('https://api.demokit.cloud/api/coverage')
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(spy).toHaveBeenCalledOnce()
    expect(onUnmatchedRequest).not.toHaveBeenCalled()
    expect(onPassthroughShape).not.toHaveBeenCalled()
  })

  it('never lets a shape-hook failure escape — the response is still returned intact with no unhandled rejection', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ id: '1' })) as unknown as typeof fetch
    const onUnhandledRejection = vi.fn()
    process.on('unhandledRejection', onUnhandledRejection)
    const onPassthroughShape = vi.fn(() => {
      throw new Error('boom from onPassthroughShape')
    })
    interceptor = createDemoInterceptor({ fixtures: {}, initialEnabled: true, onPassthroughShape })

    try {
      const res = await fetch('/api/unknown')
      expect(await res.json()).toEqual({ id: '1' })
      await waitFor(() => expect(onPassthroughShape).toHaveBeenCalledOnce())
      // Give any (incorrectly) unswallowed rejection a chance to surface.
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(onUnhandledRejection).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', onUnhandledRejection)
    }
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
