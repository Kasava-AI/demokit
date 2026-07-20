import { describe, it, expect } from 'vitest'
import { createDemoStore } from './store'
import { StoreError } from './types'
import type { DataModel, Relationship } from '../services/schema/types'
import type { DemoData } from '../services/codegen/types'

const models: Record<string, DataModel> = {
  users: {
    name: 'users',
    type: 'object',
    properties: {
      id: { name: 'id', type: 'string', required: true },
      name: { name: 'name', type: 'string', required: true },
      role: { name: 'role', type: 'string', enum: ['admin', 'member'] },
    },
    required: ['id', 'name'],
  },
  posts: {
    name: 'posts',
    type: 'object',
    properties: {
      id: { name: 'id', type: 'string', required: true },
      title: { name: 'title', type: 'string', required: true },
      userId: { name: 'userId', type: 'string', required: true },
      views: { name: 'views', type: 'integer' },
    },
    required: ['id', 'title', 'userId'],
  },
  comments: {
    name: 'comments',
    type: 'object',
    properties: {
      id: { name: 'id', type: 'string', required: true },
      postId: { name: 'postId', type: 'string' },
      text: { name: 'text', type: 'string' },
    },
    required: ['id'],
  },
}

const relationships: Relationship[] = [
  {
    from: { model: 'posts', field: 'userId' },
    to: { model: 'users', field: 'id' },
    type: 'many-to-one',
    required: true,
    detectedBy: 'naming-convention',
  },
  {
    from: { model: 'comments', field: 'postId' },
    to: { model: 'posts', field: 'id' },
    type: 'many-to-one',
    required: false,
    detectedBy: 'naming-convention',
  },
]

const seed = (): DemoData => ({
  users: [
    { id: 'u1', name: 'Alice', role: 'admin' },
    { id: 'u2', name: 'Bob', role: 'member' },
  ],
  posts: [
    { id: 'p1', title: 'Hello', userId: 'u1', views: 10 },
    { id: 'p2', title: 'World', userId: 'u2', views: 5 },
  ],
  comments: [{ id: 'c1', postId: 'p1', text: 'Nice' }],
})

const make = () => createDemoStore({ data: seed(), models, relationships })

describe('reads', () => {
  it('all() returns copies of rows', () => {
    const store = make()
    const rows = store.model('users').all()
    expect(rows).toHaveLength(2)
    ;(rows[0] as { name: string }).name = 'mutated'
    expect(store.model('users').all()[0]!.name).toBe('Alice')
  })

  it('find() matches by String() comparison', () => {
    const store = make()
    expect(store.model('users').find('u1')?.name).toBe('Alice')
    expect(store.model('users').find('missing')).toBeUndefined()
  })

  it('where() accepts object and function predicates', () => {
    const store = make()
    expect(store.model('posts').where({ userId: 'u1' })).toHaveLength(1)
    expect(store.model('posts').where((r) => (r.views as number) > 4)).toHaveLength(2)
  })

  it('where() object predicate String-coerces both sides', () => {
    const store = make()
    store.model('users').create({ id: '1', name: 'Carol' })
    store.model('posts').create({ id: 'p3', title: 'Numeric userId', userId: '1' })
    const matches = store.model('posts').where({ userId: 1 })
    expect(matches).toHaveLength(1)
    expect(matches[0]!.id).toBe('p3')
  })
})

describe('create', () => {
  it('creates with generated id and defaults, and validates FKs', () => {
    const store = make()
    const row = store.model('posts').create({ title: 'New', userId: 'u1' })
    expect(row.id).toBeTruthy()
    expect(store.model('posts').all()).toHaveLength(3)
  })

  it('rejects a create whose FK does not resolve', () => {
    const store = make()
    expect(() => store.model('posts').create({ title: 'X', userId: 'nope' })).toThrowError(StoreError)
  })

  it('fills defaults for missing required non-FK fields, rejects missing required FKs', () => {
    const store = make()
    const filled = store.model('posts').create({ userId: 'u1' }) // no title -> default ''
    expect(filled.title).toBe('')
    try {
      store.model('posts').create({ title: 'X' }) // no userId (required FK) -> reject
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(StoreError)
      expect((e as StoreError).status).toBe(422)
    }
  })

  it('rejects enum violations and wrong primitive types', () => {
    const store = make()
    expect(() => store.model('users').create({ name: 'C', role: 'superuser' })).toThrowError(StoreError)
    expect(() => store.model('users').create({ name: 42 as unknown as string })).toThrowError(StoreError)
  })

  it('throws 404 for an unknown model when models metadata is present', () => {
    const store = make()
    try {
      store.model('ghosts').create({})
      expect.unreachable()
    } catch (e) {
      expect((e as StoreError).status).toBe(404)
    }
  })
})

describe('update', () => {
  it('applies a validated patch', () => {
    const store = make()
    const row = store.model('users').update('u1', { name: 'Alicia' })
    expect(row.name).toBe('Alicia')
  })

  it('404s on a missing row and rejects id changes', () => {
    const store = make()
    try {
      store.model('users').update('missing', { name: 'X' })
      expect.unreachable()
    } catch (e) {
      expect((e as StoreError).status).toBe(404)
    }
    expect(() => store.model('users').update('u1', { id: 'u9' })).toThrowError(StoreError)
  })
})

describe('delete', () => {
  it('cascades required dependents and nulls-out optional ones', () => {
    const store = make()
    store.model('users').delete('u1')
    // posts.userId -> users is required: p1 cascades away
    expect(store.model('posts').find('p1')).toBeUndefined()
    // comments.postId -> posts is optional: c1 survives with postId nulled
    expect(store.model('comments').find('c1')?.postId).toBeNull()
  })

  it('404s on a missing row', () => {
    const store = make()
    expect(() => store.model('users').delete('missing')).toThrowError(StoreError)
  })
})

describe('ops, snapshot, reset, replay', () => {
  it('emits sequenced ops for user mutations only', () => {
    const store = make()
    const seen: string[] = []
    store.onOp((op) => seen.push(`${op.seq}:${op.op}:${op.model}`))
    const created = store.model('users').create({ name: 'C' })
    store.model('users').update(String(created.id), { name: 'C2' })
    store.model('users').delete(String(created.id))
    expect(seen).toEqual(['1:create:users', '2:update:users', '3:delete:users'])
    expect(store.seq()).toBe(3)
  })

  it('cascade deletes emit only the user-initiated op', () => {
    const store = make()
    const seen: string[] = []
    store.onOp((op) => seen.push(`${op.op}:${op.model}:${op.id}`))
    store.model('users').delete('u1')
    expect(seen).toEqual(['delete:users:u1'])
  })

  it('reset() restores the published dataset', () => {
    const store = make()
    store.model('users').delete('u2')
    store.reset()
    expect(store.model('users').all()).toHaveLength(2)
    expect(store.seq()).toBe(0)
  })

  it('applyOpLog replays deterministically without re-emitting', () => {
    const a = make()
    const ops: import('./types').StoreOp[] = []
    a.onOp((op) => ops.push(op))
    const row = a.model('posts').create({ title: 'Replayed', userId: 'u2' })
    a.model('posts').update(String(row.id), { views: 99 })

    const b = make()
    const reEmitted: unknown[] = []
    b.onOp((op) => reEmitted.push(op))
    b.applyOpLog(ops)
    expect(reEmitted).toHaveLength(0)
    expect(b.model('posts').find(String(row.id))?.views).toBe(99)
    expect(b.seq()).toBe(2)
  })

  it('loadSnapshot replaces state and seq', () => {
    const store = make()
    store.loadSnapshot({ users: [{ id: 'z', name: 'Only' }] }, 7)
    expect(store.model('users').all()).toHaveLength(1)
    expect(store.seq()).toBe(7)
  })
})

describe('permissive mode (no models metadata)', () => {
  it('mutates without validation when models/relationships are absent', () => {
    const store = createDemoStore({ data: { things: [{ id: 't1' }] } })
    const row = store.model('things').create({ whatever: true })
    expect(row.id).toBeTruthy()
    store.model('newmodel').create({ x: 1 }) // unknown model is fine without metadata
    expect(store.model('newmodel').all()).toHaveLength(1)
  })
})

describe('defensive copying (op-log isolation)', () => {
  it('mutating returned row does not corrupt emitted op attrs', () => {
    const store = make()
    const emitted: import('./types').StoreOp[] = []
    store.onOp((op) => emitted.push(op))
    const row = store.model('users').create({ name: 'Original' })
    const originalName = row.name
    ;(row as { name: string }).name = 'Mutated'
    expect(emitted[0]?.attrs?.name).toBe(originalName)
    expect(row.name).toBe('Mutated')
  })

  it('mutating patch object does not corrupt emitted op attrs', () => {
    const store = make()
    const emitted: import('./types').StoreOp[] = []
    store.onOp((op) => emitted.push(op))
    const patch = { name: 'Original' }
    store.model('users').update('u1', patch)
    patch.name = 'Mutated'
    expect(emitted[0]?.attrs?.name).toBe('Original')
    expect(patch.name).toBe('Mutated')
  })

  it('calling all() on unknown model does not pollute snapshot()', () => {
    const store = make()
    store.model('ghosts').all() // read a non-existent model
    const snapshot = store.snapshot()
    expect(snapshot.ghosts).toBeUndefined()
  })
})
