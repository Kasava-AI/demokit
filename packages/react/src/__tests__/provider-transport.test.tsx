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
})
