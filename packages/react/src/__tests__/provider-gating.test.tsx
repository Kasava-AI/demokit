import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'

const { createDemoInterceptor, fetchCloudFixtures } = vi.hoisted(() => ({
  createDemoInterceptor: vi.fn(),
  fetchCloudFixtures: vi.fn(),
}))
vi.mock('@demokit-ai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@demokit-ai/core')>()),
  createDemoInterceptor: (...a: unknown[]) => createDemoInterceptor(...a),
  fetchCloudFixtures: (...a: unknown[]) => fetchCloudFixtures(...a),
}))

import { DemoKitProvider, useDemoKit } from '../index'
import { DEFAULT_STORAGE_KEY } from '@demokit-ai/core'

function interceptorStub() {
  return {
    enable: vi.fn(), disable: vi.fn().mockReturnValue(true), toggle: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(true), isPublicDemo: vi.fn().mockReturnValue(false),
    setFixtures: vi.fn(), addFixture: vi.fn(), removeFixture: vi.fn(),
    resetSession: vi.fn(), getSession: vi.fn(), destroy: vi.fn(),
  }
}

beforeEach(() => {
  localStorage.clear()
  createDemoInterceptor.mockReset().mockImplementation(() => interceptorStub())
  fetchCloudFixtures.mockReset()
})
afterEach(() => vi.restoreAllMocks())

describe('demo-gated construction', () => {
  it('constructs nothing when demo mode is off', async () => {
    render(<DemoKitProvider fixtures={{}}><div>app</div></DemoKitProvider>)
    expect(screen.getByText('app')).toBeInTheDocument()
    await act(async () => {})
    expect(createDemoInterceptor).not.toHaveBeenCalled()
    expect(fetchCloudFixtures).not.toHaveBeenCalled()
  })

  it('constructs the interceptor on mount when persisted demo state is on', async () => {
    // Use the real DEFAULT_STORAGE_KEY ('demokit-mode') — the provider's own
    // default `storageKey` prop, and the same key the interceptor persists to.
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    render(<DemoKitProvider fixtures={{}}><div>app</div></DemoKitProvider>)
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
  })

  it('bootstraps lazily when enable() is called', async () => {
    function EnableButton() {
      const { enable } = useDemoKit()
      return <button onClick={() => enable()}>go</button>
    }
    render(<DemoKitProvider fixtures={{}}><EnableButton /></DemoKitProvider>)
    expect(createDemoInterceptor).not.toHaveBeenCalled()
    await act(async () => { screen.getByText('go').click() })
    await waitFor(() => expect(createDemoInterceptor).toHaveBeenCalledOnce())
  })

  it('reports unavailable when cloud bootstrap fails with no cache', async () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, 'true')
    fetchCloudFixtures.mockRejectedValue(new Error('offline'))
    render(
      <DemoKitProvider source={{ apiKey: 'dk_test' }} fixtures={{}}><div>app</div></DemoKitProvider>
    )
    await waitFor(() => expect(screen.getByTestId('demokit-unavailable')).toBeInTheDocument())
    expect(createDemoInterceptor).not.toHaveBeenCalled()
  })
})
