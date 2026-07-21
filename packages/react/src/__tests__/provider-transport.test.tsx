import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'

const { createDemoInterceptor } = vi.hoisted(() => ({
  createDemoInterceptor: vi.fn(),
}))
vi.mock('@demokit-ai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@demokit-ai/core')>()),
  createDemoInterceptor: (...a: unknown[]) => createDemoInterceptor(...a),
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
import { DEFAULT_STORAGE_KEY } from '@demokit-ai/core'

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

beforeEach(() => {
  localStorage.clear()
  createDemoInterceptor.mockReset().mockImplementation(() => interceptorStub())
  createMswTransport.mockReset().mockImplementation(() => mswTransportStub())
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
})
