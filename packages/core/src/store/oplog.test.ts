import { describe, it, expect, vi } from 'vitest'
import { createDemoStore } from './store'
import { attachOpLogPersistence } from './oplog'
import type { DemoData } from '../services/codegen/types'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  }
}

const seed = (): DemoData => ({ users: [{ id: 'u1', name: 'Alice' }] })

describe('attachOpLogPersistence', () => {
  it('persists ops and replays them on a fresh store', () => {
    const storage = memoryStorage()
    const a = createDemoStore({ data: seed() })
    attachOpLogPersistence({ store: a, key: 'k', version: 'v1', storage })
    a.model('users').create({ id: 'u2', name: 'Bob' })

    const b = createDemoStore({ data: seed() })
    attachOpLogPersistence({ store: b, key: 'k', version: 'v1', storage })
    expect(b.model('users').all()).toHaveLength(2)
    expect(b.seq()).toBe(1)
  })

  it('discards the log when the dataset version changes', () => {
    const storage = memoryStorage()
    const a = createDemoStore({ data: seed() })
    attachOpLogPersistence({ store: a, key: 'k', version: 'v1', storage })
    a.model('users').create({ id: 'u2', name: 'Bob' })

    const b = createDemoStore({ data: seed() })
    attachOpLogPersistence({ store: b, key: 'k', version: 'v2', storage })
    expect(b.model('users').all()).toHaveLength(1)
    expect(storage.getItem('k')).toBeNull()
  })

  it('snapshots and truncates on op-count overflow, and restores from snapshot', () => {
    const storage = memoryStorage()
    const a = createDemoStore({ data: seed() })
    attachOpLogPersistence({ store: a, key: 'k', version: 'v1', storage, maxOps: 3 })
    for (let i = 0; i < 5; i++) a.model('users').create({ id: `x${i}`, name: `N${i}` })

    const payload = JSON.parse(storage.getItem('k')!)
    expect(payload.snapshot).toBeTruthy()
    expect(payload.ops.length).toBeLessThan(3)

    const b = createDemoStore({ data: seed() })
    attachOpLogPersistence({ store: b, key: 'k', version: 'v1', storage, maxOps: 3 })
    expect(b.model('users').all()).toHaveLength(6)
  })

  it('clear() wipes storage; destroy() stops persisting', () => {
    const storage = memoryStorage()
    const store = createDemoStore({ data: seed() })
    const persistence = attachOpLogPersistence({ store, key: 'k', version: 'v1', storage })
    store.model('users').create({ id: 'u2', name: 'Bob' })
    persistence.clear()
    expect(storage.getItem('k')).toBeNull()
    persistence.destroy()
    store.model('users').create({ id: 'u3', name: 'Cara' })
    expect(storage.getItem('k')).toBeNull()
  })

  it('is a no-op without throwing when storage is unavailable', () => {
    const store = createDemoStore({ data: seed() })
    const persistence = attachOpLogPersistence({ store, key: 'k', version: 'v1' })
    expect(() => store.model('users').create({ id: 'u2', name: 'Bob' })).not.toThrow()
    persistence.destroy()
  })

  it('applies newer ops from a storage event (tab sync)', () => {
    const storage = memoryStorage()
    const listeners: Array<(e: { key: string | null; newValue: string | null }) => void> = []
    const win = {
      addEventListener: (type: string, fn: never) => {
        if (type === 'storage') listeners.push(fn as never)
      },
      removeEventListener: vi.fn(),
      localStorage: storage,
    }
    vi.stubGlobal('window', win)
    try {
      const store = createDemoStore({ data: seed() })
      attachOpLogPersistence({ store, key: 'k', version: 'v1', storage })
      const incoming = JSON.stringify({
        version: 'v1',
        seq: 1,
        ops: [{ seq: 1, model: 'users', op: 'create', id: 'u2', attrs: { id: 'u2', name: 'Bob' } }],
      })
      for (const fn of listeners) fn({ key: 'k', newValue: incoming })
      expect(store.model('users').all()).toHaveLength(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
