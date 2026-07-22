import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'

const { createDemoInterceptor, fetchCloudFixtures, createCoverageReporter } = vi.hoisted(() => ({
  createDemoInterceptor: vi.fn(),
  fetchCloudFixtures: vi.fn(),
  createCoverageReporter: vi.fn(),
}))
vi.mock('@demokit-ai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@demokit-ai/core')>()),
  createDemoInterceptor: (...a: unknown[]) => createDemoInterceptor(...a),
  fetchCloudFixtures: (...a: unknown[]) => fetchCloudFixtures(...a),
  createCoverageReporter: (...a: unknown[]) => createCoverageReporter(...a),
}))

// A dedicated spy on the mock *factory* itself (not just the exported
// `createMswTransport` fn) — vitest evaluates `vi.mock` factories lazily on
// first import, so an un-imported dynamic module leaves `mswModuleFactorySpy`
// uncalled. That's the strongest possible signal that
// `import('@demokit-ai/msw-transport')` never ran, which is what assertion
// (b) below needs to prove (not merely that nobody called the returned fn).
const { createMswTransport, mswModuleFactorySpy } = vi.hoisted(() => ({
  createMswTransport: vi.fn(),
  mswModuleFactorySpy: vi.fn(),
}))
vi.mock('@demokit-ai/msw-transport', () => {
  mswModuleFactorySpy()
  return {
    createMswTransport: (...a: unknown[]) => createMswTransport(...a),
  }
})

import { DemoKitProvider, useDemoMode } from '../index'
import { DEFAULT_STORAGE_KEY, DEFAULT_API_URL } from '@demokit-ai/core'

/** Minimal valid CloudFixtureResponse — no models/relationships, so createDemoRuntime returns null and the legacy createRemoteFixtures(response, fixtures) path is used. */
function cloudResponse() {
  return { data: {}, mappings: [], version: '1' }
}

function interceptorStub() {
  return {
    enable: vi.fn(), disable: vi.fn().mockReturnValue(true), toggle: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(true), isPublicDemo: vi.fn().mockReturnValue(false),
    setFixtures: vi.fn(), addFixture: vi.fn(), removeFixture: vi.fn(),
    resetSession: vi.fn(), getSession: vi.fn(), destroy: vi.fn(),
  }
}

function mswTransportStub() {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    setDeps: vi.fn(),
  }
}

function reporterStub() {
  return {
    record: vi.fn(),
    attachShape: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  }
}

beforeEach(() => {
  localStorage.clear()
  createDemoInterceptor.mockReset().mockImplementation(() => interceptorStub())
  createMswTransport.mockReset().mockImplementation(() => mswTransportStub())
  fetchCloudFixtures.mockReset()
  createCoverageReporter.mockReset().mockImplementation(() => reporterStub())
  mswModuleFactorySpy.mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('provider transport option', () => {
  it('(a) transport="msw" + demo-on constructs the msw transport, never the interceptor', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    render(
      <DemoKitProvider transport="msw" fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(createDemoInterceptor).not.toHaveBeenCalled()
  })

  it('(b) demo-off constructs neither transport — the msw module is never imported', async () => {
    render(
      <DemoKitProvider transport="msw" fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await act(async () => {})
    expect(mswModuleFactorySpy).not.toHaveBeenCalled()
    expect(createMswTransport).not.toHaveBeenCalled()
    expect(createDemoInterceptor).not.toHaveBeenCalled()
  })

  it('(c) start() rejection renders demokit-unavailable and calls stop at most once', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    const stop = vi.fn()
    createMswTransport.mockImplementation(() => ({
      start: vi.fn().mockRejectedValue(new Error('worker failed to start')),
      stop,
      setDeps: vi.fn(),
    }))
    render(
      <DemoKitProvider transport="msw" fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(screen.getByTestId('demokit-unavailable')).toBeInTheDocument())
    expect(stop.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('(d) toggle-off calls setDeps(null)', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    const setDeps = vi.fn()
    createMswTransport.mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      setDeps,
    }))

    function ToggleButton() {
      const { toggle } = useDemoMode()
      return <button onClick={() => toggle()}>toggle</button>
    }

    render(
      <DemoKitProvider transport="msw" fixtures={{}}><ToggleButton /></DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    setDeps.mockClear()

    await act(async () => { screen.getByText('toggle').click() })
    expect(setDeps).toHaveBeenCalledWith(null)
  })

  it('(e) transport="fetch" (default) never touches the msw factory', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    render(
      <DemoKitProvider fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
    expect(mswModuleFactorySpy).not.toHaveBeenCalled()
    expect(createMswTransport).not.toHaveBeenCalled()
  })

  it('(f) failed start: enable() leaves isDemoMode false and persists nothing (review Finding 1)', async () => {
    // No persisted state — demoWanted is false at mount, so nothing
    // auto-constructs; the only path to construction is the explicit
    // enable() call below.
    createMswTransport.mockImplementation(() => ({
      start: vi.fn().mockRejectedValue(new Error('worker failed to start')),
      stop: vi.fn(),
      setDeps: vi.fn(),
    }))

    function Probe() {
      const { enable, isDemoMode } = useDemoMode()
      return (
        <div>
          <button onClick={() => enable()}>enable</button>
          <div data-testid="demo-mode">{String(isDemoMode)}</div>
        </div>
      )
    }

    render(<DemoKitProvider transport="msw" fixtures={{}}><Probe /></DemoKitProvider>)
    await act(async () => { screen.getByText('enable').click() })
    await waitFor(() => expect(screen.getByTestId('demokit-unavailable')).toBeInTheDocument())

    expect(screen.getByTestId('demo-mode').textContent).toBe('false')
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull()
  })

  it('(g) unmount while start() is pending stops the in-flight instance (review Finding 2)', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    const stop = vi.fn()
    let resolveStart: () => void = () => {}
    createMswTransport.mockImplementation(() => ({
      start: vi.fn(() => new Promise<void>((resolve) => { resolveStart = resolve })),
      stop,
      setDeps: vi.fn(),
    }))

    const { unmount } = render(
      <DemoKitProvider transport="msw" fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(stop).not.toHaveBeenCalled()

    unmount()
    expect(stop).toHaveBeenCalledTimes(1)

    // Resolving start() after unmount must not throw, double-stop, or touch
    // state on the torn-down provider.
    await act(async () => { resolveStart() })
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('(h) changing transport after mount is ignored and warns once (review Finding 3)', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    function Wrapper({ transport }: { transport: 'fetch' | 'msw' }) {
      return (
        <DemoKitProvider transport={transport} fixtures={{}}><div>app</div></DemoKitProvider>
      )
    }

    const { rerender } = render(<Wrapper transport="fetch" />)
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())

    rerender(<Wrapper transport="msw" />)
    await act(async () => {})
    rerender(<Wrapper transport="msw" />)
    await act(async () => {})

    // The prop is fixed at mount ('fetch') — a later flip to 'msw' must
    // never import the msw module (no second, competing transport).
    expect(mswModuleFactorySpy).not.toHaveBeenCalled()
    expect(createMswTransport).not.toHaveBeenCalled()
    // Warned exactly once, even though the prop stayed changed across two
    // re-renders.
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain("transport` is fixed for the provider's lifetime")

    warnSpy.mockRestore()
  })

  it('(i) mswOptions are forwarded straight to createMswTransport (review Finding 4)', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    const options = { workerUrl: '/custom/mockServiceWorker.js', startTimeoutMs: 1234 }

    render(
      <DemoKitProvider transport="msw" mswOptions={options} fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(createMswTransport).toHaveBeenCalledWith(options)
  })

  it('(j) buildDeps threads controlPlaneOrigin from source.apiUrl into the msw transport (final review F1)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    const setDeps = vi.fn()
    createMswTransport.mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      setDeps,
    }))

    render(
      <DemoKitProvider transport="msw" source={{ apiKey: 'dk_live_test', apiUrl: 'https://cp.example.com/api' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(setDeps).toHaveBeenCalledWith(
      expect.objectContaining({ controlPlaneOrigin: 'https://cp.example.com/api' })
    )
  })

  it('(k) buildDeps threads controlPlaneOrigin from source.apiUrl into the interceptor config (final review F1)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    render(
      <DemoKitProvider source={{ apiKey: 'dk_live_test', apiUrl: 'https://cp.example.com/api' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
    expect(createDemoInterceptor).toHaveBeenCalledWith(
      expect.objectContaining({ controlPlaneOrigin: 'https://cp.example.com/api' })
    )
  })

  it('(l) controlPlaneOrigin falls back to DEFAULT_API_URL when source.apiUrl is omitted', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    render(
      <DemoKitProvider source={{ apiKey: 'dk_live_test' }}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
    expect(createDemoInterceptor).toHaveBeenCalledWith(
      expect.objectContaining({ controlPlaneOrigin: DEFAULT_API_URL })
    )
  })

  it('(m) a preview URL (?demo-preview=tok) bootstraps the transport with no persisted state (final review F2)', async () => {
    // No localStorage.setItem — demoWanted must come entirely from the
    // preview-augmented detection the mount gate now shares with the
    // constructors, not from persisted state.
    window.history.pushState({}, '', '/?demo-preview=preview-tok')
    try {
      render(<DemoKitProvider fixtures={{}}><div>app</div></DemoKitProvider>)
      await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
      // The augmented detection must reach the interceptor's own config too,
      // so its internal enabled/isPublicDemo computation matches what the
      // mount gate saw (same effectiveDetection, single source of truth).
      expect(createDemoInterceptor).toHaveBeenCalledWith(
        expect.objectContaining({
          detection: expect.objectContaining({ queryParams: expect.arrayContaining(['demo-preview']) }),
        })
      )
    } finally {
      window.history.pushState({}, '', '/')
    }
  })

  it('(n) refetch() under msw stops the previous instance before constructing the replacement (final review F3)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    const firstStop = vi.fn()
    const firstSetDeps = vi.fn()
    createMswTransport
      .mockImplementationOnce(() => ({ start: vi.fn().mockResolvedValue(undefined), stop: firstStop, setDeps: firstSetDeps }))
      .mockImplementationOnce(() => ({ start: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), setDeps: vi.fn() }))

    function RefetchButton() {
      const { refetch } = useDemoMode()
      return <button onClick={() => refetch()}>refetch</button>
    }

    render(
      <DemoKitProvider transport="msw" source={{ apiKey: 'dk_live_test' }}><RefetchButton /></DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(firstStop).not.toHaveBeenCalled()

    await act(async () => { screen.getByText('refetch').click() })
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledTimes(2))

    // Old instance stopped/discarded (deps nulled first) — and that
    // teardown happened BEFORE the replacement was constructed, never
    // leaving two live instances.
    expect(firstSetDeps).toHaveBeenCalledWith(null)
    expect(firstStop).toHaveBeenCalledOnce()
    expect(firstStop.mock.invocationCallOrder[0]).toBeLessThan(
      createMswTransport.mock.invocationCallOrder[1]
    )
  })
})

// Phase 5 Task 4: shape observation wiring. Policy identity is the point —
// shapes flow ONLY when the coverage reporter exists (remote mode,
// reportCoverage !== false, no preview token) AND observeShapes !== false,
// and both transports must honor the exact same gate.
describe('shape observation wiring (Phase 5 Task 4)', () => {
  it('(o) msw: a bypassed JSON response attaches a shape to the unmatched_request event, merge-only (F1: no double-count)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    const reporter = reporterStub()
    createCoverageReporter.mockImplementation(() => reporter)

    let capturedOptions: { onBypassResponse?: (info: { request: Request; response: Response }) => void } = {}
    createMswTransport.mockImplementation((options: typeof capturedOptions) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    render(
      <DemoKitProvider transport="msw" source={{ apiKey: 'dk_live_test', apiUrl: 'https://cp.example.com/api' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(capturedOptions.onBypassResponse).toBeInstanceOf(Function)

    const request = new Request('http://localhost/api/widgets')
    const response = new Response(JSON.stringify({ id: 'w1', name: 'Widget' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    capturedOptions.onBypassResponse!({ request, response })

    // F1 fix: the shape hook calls the merge-only `attachShape`, never the
    // counting `record()` — `record()` stays reserved for
    // `onUnmatchedRequest`'s own call so a single request's count isn't
    // doubled by also observing a shape for it.
    await waitFor(() => expect(reporter.attachShape).toHaveBeenCalledOnce())
    expect(reporter.attachShape).toHaveBeenCalledWith(
      'GET',
      '/api/widgets',
      expect.objectContaining({ t: 'object' })
    )
    expect(reporter.record).not.toHaveBeenCalled()
  })

  it('(p) msw: observeShapes=false constructs the transport without an onBypassResponse hook', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    let capturedOptions: Record<string, unknown> = {}
    createMswTransport.mockImplementation((options: Record<string, unknown>) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    render(
      <DemoKitProvider transport="msw" observeShapes={false} source={{ apiKey: 'dk_live_test' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(capturedOptions.onBypassResponse).toBeUndefined()
  })

  it('(q) msw: a preview session constructs the transport without an onBypassResponse hook (no reporter)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    let capturedOptions: Record<string, unknown> = {}
    createMswTransport.mockImplementation((options: Record<string, unknown>) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    render(
      <DemoKitProvider transport="msw" source={{ apiKey: 'dk_live_test', previewToken: 'preview-tok' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(capturedOptions.onBypassResponse).toBeUndefined()
  })

  it('(r) msw: local-fixtures-only mode (no source, hence no reporter) never wires the hook, regardless of observeShapes', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    let capturedOptions: Record<string, unknown> = {}
    createMswTransport.mockImplementation((options: Record<string, unknown>) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    render(
      <DemoKitProvider transport="msw" fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(capturedOptions.onBypassResponse).toBeUndefined()
  })

  it('(s) msw: a bypassed response from the control-plane origin is never recorded', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    const reporter = reporterStub()
    createCoverageReporter.mockImplementation(() => reporter)

    let capturedOptions: { onBypassResponse?: (info: { request: Request; response: Response }) => void } = {}
    createMswTransport.mockImplementation((options: typeof capturedOptions) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    render(
      <DemoKitProvider transport="msw" source={{ apiKey: 'dk_live_test', apiUrl: 'https://cp.example.com/api' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())

    const controlPlaneRequest = new Request('https://cp.example.com/api/coverage', { method: 'POST' })
    const controlPlaneResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    const normalRequest = new Request('http://localhost/api/widgets')
    const normalResponse = new Response(JSON.stringify({ id: 'w1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

    // Fire the control-plane bypass first, then a normal one — waiting for
    // the normal one to land proves timing isn't the reason the
    // control-plane one is absent, and the final call-count assertion below
    // proves the control-plane one never recorded at all.
    capturedOptions.onBypassResponse!({ request: controlPlaneRequest, response: controlPlaneResponse })
    capturedOptions.onBypassResponse!({ request: normalRequest, response: normalResponse })

    await waitFor(() =>
      expect(reporter.attachShape).toHaveBeenCalledWith('GET', '/api/widgets', expect.anything())
    )
    expect(reporter.attachShape).toHaveBeenCalledTimes(1)
  })

  it('(t) fetch: interceptor config carries observeShapes: true + onPassthroughShape wired to the reporter', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    render(
      <DemoKitProvider source={{ apiKey: 'dk_live_test' }}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
    expect(createDemoInterceptor).toHaveBeenCalledWith(
      expect.objectContaining({ observeShapes: true, onPassthroughShape: expect.any(Function) })
    )
  })

  it('(u) fetch: invoking the wired onPassthroughShape callback attaches the shape merge-only, never via record() (F1)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    const reporter = reporterStub()
    createCoverageReporter.mockImplementation(() => reporter)

    render(
      <DemoKitProvider source={{ apiKey: 'dk_live_test' }}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())

    const config = createDemoInterceptor.mock.calls[0]![0] as {
      onPassthroughShape: (info: { method: string; pathname: string; shape: unknown }) => void
    }
    config.onPassthroughShape({ method: 'GET', pathname: '/api/widgets', shape: { t: 'object', keys: {} } })

    expect(reporter.attachShape).toHaveBeenCalledWith('GET', '/api/widgets', { t: 'object', keys: {} })
    expect(reporter.record).not.toHaveBeenCalled()
  })

  it('(v) fetch: observeShapes=false yields observeShapes: false in the interceptor config', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    render(
      <DemoKitProvider observeShapes={false} source={{ apiKey: 'dk_live_test' }}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
    expect(createDemoInterceptor).toHaveBeenCalledWith(
      expect.objectContaining({ observeShapes: false })
    )
  })

  it('(w) fetch: a preview session yields observeShapes: false in the interceptor config (no reporter)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    render(
      <DemoKitProvider source={{ apiKey: 'dk_live_test', previewToken: 'preview-tok' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
    expect(createDemoInterceptor).toHaveBeenCalledWith(
      expect.objectContaining({ observeShapes: false })
    )
  })

  it('(x) fetch: local-fixtures-only mode (no source, hence no reporter) yields observeShapes: false regardless of the observeShapes prop', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    render(
      <DemoKitProvider fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
    expect(createDemoInterceptor).toHaveBeenCalledWith(
      expect.objectContaining({ observeShapes: false })
    )
  })

  it('(y) msw: after enable then disable, bypassed responses are no longer recorded (review Finding 1 — disabled-state leak)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    const reporter = reporterStub()
    createCoverageReporter.mockImplementation(() => reporter)

    let capturedOptions: { onBypassResponse?: (info: { request: Request; response: Response }) => void } = {}
    createMswTransport.mockImplementation((options: typeof capturedOptions) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    function ToggleButton() {
      const { toggle } = useDemoMode()
      return <button onClick={() => toggle()}>toggle</button>
    }

    render(
      <DemoKitProvider transport="msw" source={{ apiKey: 'dk_live_test' }}>
        <ToggleButton />
      </DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(capturedOptions.onBypassResponse).toBeInstanceOf(Function)

    const bypassTo = (path: string) => ({
      request: new Request(`http://localhost${path}`),
      response: new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    })

    // Sanity: while still enabled, a bypass IS observed and recorded — this
    // proves the guard below actually turns observation off, rather than it
    // having never been wired in the first place.
    capturedOptions.onBypassResponse!(bypassTo('/api/before'))
    await waitFor(() => expect(reporter.attachShape).toHaveBeenCalledWith('GET', '/api/before', expect.anything()))

    // Toggle demo mode off. The worker/observer stays alive across this
    // (only stop() on unmount/refetch detaches it) — the hook itself must
    // bail once mswEnabledRef.current flips false, exactly as the review's
    // `enable → disable → bypassed request → NO record, NO derivation` case
    // demands.
    await act(async () => { screen.getByText('toggle').click() })
    capturedOptions.onBypassResponse!(bypassTo('/api/while-disabled'))

    // Toggle back on and fire a third, distinctly-pathed bypass — waiting
    // for THIS one to land proves enough time has passed for the
    // while-disabled derivation to have completed too, had it (incorrectly)
    // been allowed to run — it's not a synchronous assertion racing an
    // in-flight async derivation.
    await act(async () => { screen.getByText('toggle').click() })
    capturedOptions.onBypassResponse!(bypassTo('/api/after'))
    await waitFor(() => expect(reporter.attachShape).toHaveBeenCalledWith('GET', '/api/after', expect.anything()))

    // Exactly two recordings total (before + after) — the while-disabled
    // one never happened.
    expect(reporter.attachShape).toHaveBeenCalledTimes(2)
    expect(reporter.attachShape).not.toHaveBeenCalledWith(
      'GET',
      '/api/while-disabled',
      expect.anything()
    )
  })

  it('(z) msw: a passthrough-policy mutation bypass is never recorded — only safe methods are (review Finding 2 — safe-method gate)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    const reporter = reporterStub()
    createCoverageReporter.mockImplementation(() => reporter)

    let capturedOptions: { onBypassResponse?: (info: { request: Request; response: Response }) => void } = {}
    createMswTransport.mockImplementation((options: typeof capturedOptions) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    render(
      <DemoKitProvider transport="msw" unmatchedMutations="passthrough" source={{ apiKey: 'dk_live_test' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())

    const mutationRequest = new Request('http://localhost/api/widgets', { method: 'POST' })
    const mutationResponse = new Response(JSON.stringify({ id: 'w1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    const safeRequest = new Request('http://localhost/api/widgets')
    const safeResponse = new Response(JSON.stringify({ id: 'w1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

    // Fire the mutation bypass first, then a safe-method one — waiting for
    // the safe one to land proves timing isn't why the mutation is absent,
    // and the final call-count assertion proves the mutation never recorded.
    capturedOptions.onBypassResponse!({ request: mutationRequest, response: mutationResponse })
    capturedOptions.onBypassResponse!({ request: safeRequest, response: safeResponse })

    await waitFor(() => expect(reporter.attachShape).toHaveBeenCalledWith('GET', expect.anything(), expect.anything()))
    expect(reporter.attachShape).toHaveBeenCalledTimes(1)
  })

  it('(aa) msw: reportCoverage=false constructs the transport without an onBypassResponse hook (no reporter)', async () => {
    fetchCloudFixtures.mockResolvedValue(cloudResponse())
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    let capturedOptions: Record<string, unknown> = {}
    createMswTransport.mockImplementation((options: Record<string, unknown>) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    render(
      <DemoKitProvider transport="msw" reportCoverage={false} source={{ apiKey: 'dk_live_test' }}>
        <div>app</div>
      </DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(capturedOptions.onBypassResponse).toBeUndefined()
  })

  it('(bb) msw: local-fixtures-only mode with observeShapes={false} explicitly still never wires the hook (extends (r)\'s "regardless" claim)', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')

    let capturedOptions: Record<string, unknown> = {}
    createMswTransport.mockImplementation((options: Record<string, unknown>) => {
      capturedOptions = options ?? {}
      return mswTransportStub()
    })

    render(
      <DemoKitProvider transport="msw" observeShapes={false} fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(createMswTransport).toHaveBeenCalledOnce())
    expect(capturedOptions.onBypassResponse).toBeUndefined()
  })
})
