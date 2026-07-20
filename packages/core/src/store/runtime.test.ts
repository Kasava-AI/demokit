import { describe, it, expect } from 'vitest'
import { createDemoRuntime } from './runtime'
import type { CloudFixtureResponse } from '../types'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

const response = (): CloudFixtureResponse => ({
  data: { users: [{ id: 'u1', name: 'Alice' }] },
  mappings: [
    { method: 'GET', pattern: '/api/users', sourceModel: 'users', responseType: 'collection' },
    { method: 'POST', pattern: '/api/users', sourceModel: 'users', responseType: 'create' },
  ],
  version: 'gen-1',
  models: {
    users: {
      name: 'users',
      type: 'object',
      properties: { id: { name: 'id', type: 'string' }, name: { name: 'name', type: 'string' } },
    },
  },
  relationships: [],
})

describe('createDemoRuntime', () => {
  it('returns null for legacy payloads without models/relationships', () => {
    const legacy = { ...response(), models: undefined, relationships: undefined }
    expect(createDemoRuntime({ response: legacy })).toBeNull()
  })

  it('builds a store-backed fixture map with persistence', () => {
    const storage = memoryStorage()
    const runtime = createDemoRuntime({ response: response(), storageKey: 'demokit-mode', storage })!
    expect(runtime.fixtures['GET /api/users']).toBeTypeOf('function')
    runtime.store.model('users').create({ name: 'Bob' })
    expect(storage.getItem('demokit-mode:oplog')).toBeTruthy()

    // A second runtime with the same storage replays the op-log
    const again = createDemoRuntime({ response: response(), storageKey: 'demokit-mode', storage })!
    expect(again.store.model('users').all()).toHaveLength(2)
    again.destroy()
    runtime.destroy()
  })

  it('reset() clears the op-log and re-seeds', () => {
    const storage = memoryStorage()
    const runtime = createDemoRuntime({ response: response(), storageKey: 'demokit-mode', storage })!
    runtime.store.model('users').create({ name: 'Bob' })
    runtime.reset()
    expect(runtime.store.model('users').all()).toHaveLength(1)
    expect(storage.getItem('demokit-mode:oplog')).toBeNull()
    runtime.destroy()
  })
})
