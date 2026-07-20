import { describe, it, expect, vi } from 'vitest'
import { createDemoStore } from './store'
import { buildProjectionMap } from './projections'
import type { EndpointMapping, RequestContext } from '../types'
import { isDemoResponse } from '../interceptor'
import { createSessionState } from '../session'
import type { DemoData } from '../services/codegen/types'

const seed = (): DemoData => ({
  users: [
    { id: 'u1', name: 'Alice', status: 'active', createdAt: '2026-01-02', amount: 10 },
    { id: 'u2', name: 'Bob', status: 'inactive', createdAt: '2026-01-01', amount: 30 },
    { id: 'u3', name: 'Cara', status: 'active', createdAt: '2026-01-03', amount: 20 },
  ],
})

function ctx(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    url: 'http://localhost/api/users',
    method: 'GET',
    params: {},
    searchParams: new URLSearchParams(),
    headers: new Headers(),
    session: createSessionState(),
    ...overrides,
  }
}

const run = async (handler: unknown, context: RequestContext) =>
  typeof handler === 'function' ? await handler(context) : handler

describe('collection projections', () => {
  const mapping: EndpointMapping = {
    method: 'GET',
    pattern: '/api/users',
    sourceModel: 'users',
    responseType: 'collection',
    queryParamConfig: {
      filters: { status: 'status' },
      sortParam: 'sort',
      pagination: { style: 'offset', defaultLimit: 2 },
      envelope: 'data-total-page',
    },
  }

  it('filters, sorts, paginates, and envelopes', async () => {
    const store = createDemoStore({ data: seed() })
    const map = buildProjectionMap([mapping], store)
    const handler = map['GET /api/users']!

    const filtered = (await run(handler, ctx({ searchParams: new URLSearchParams('status=active') }))) as {
      data: Array<{ id: string }>
      total: number
    }
    expect(filtered.total).toBe(2)
    expect(filtered.data.map((r) => r.id)).toEqual(['u1', 'u3'])

    const sorted = (await run(handler, ctx({ searchParams: new URLSearchParams('sort=-createdAt') }))) as {
      data: Array<{ id: string }>
    }
    expect(sorted.data.map((r) => r.id)).toEqual(['u3', 'u1']) // limit 2 of desc order

    const paged = (await run(handler, ctx({ searchParams: new URLSearchParams('limit=1&offset=1') }))) as {
      data: Array<{ id: string }>
      total: number
    }
    expect(paged.total).toBe(3)
    expect(paged.data).toHaveLength(1)
  })

  it('clamps negative limit/offset so no negative-index slicing occurs', async () => {
    const store = createDemoStore({ data: seed() })
    const map = buildProjectionMap([mapping], store)
    const handler = map['GET /api/users']!

    const result = (await run(handler, ctx({ searchParams: new URLSearchParams('limit=-5&offset=-1') }))) as {
      data: Array<{ id: string }>
      total: number
    }
    expect(result.total).toBe(3)
    expect(result.data.length).toBeGreaterThanOrEqual(1)
    // Negative offset/limit clamp to 0/1 — rows come from the start of the
    // array, never from `.slice()` treating them as from-the-end indices.
    expect(result.data.map((r) => r.id)).toEqual(['u1'])
  })

  it('returns a bare array without queryParamConfig', async () => {
    const store = createDemoStore({ data: seed() })
    const map = buildProjectionMap(
      [{ method: 'GET', pattern: '/api/users', sourceModel: 'users', responseType: 'collection' }],
      store
    )
    const result = await run(map['GET /api/users']!, ctx())
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(3)
  })
})

describe('single / CRUD projections', () => {
  const mappings: EndpointMapping[] = [
    { method: 'GET', pattern: '/api/users/:id', sourceModel: 'users', responseType: 'single', lookupField: 'id', lookupParam: 'id' },
    { method: 'POST', pattern: '/api/users', sourceModel: 'users', responseType: 'create' },
    { method: 'PATCH', pattern: '/api/users/:id', sourceModel: 'users', responseType: 'update', lookupParam: 'id' },
    { method: 'DELETE', pattern: '/api/users/:id', sourceModel: 'users', responseType: 'delete', lookupParam: 'id' },
  ]

  it('single returns the row or throws 404', async () => {
    const store = createDemoStore({ data: seed() })
    const map = buildProjectionMap(mappings, store)
    const found = (await run(map['GET /api/users/:id']!, ctx({ params: { id: 'u1' } }))) as { name: string }
    expect(found.name).toBe('Alice')
    await expect(run(map['GET /api/users/:id']!, ctx({ params: { id: 'zz' } }))).rejects.toMatchObject({ status: 404 })
  })

  it('create mutates the store and returns 201; update patches; delete returns 204', async () => {
    const store = createDemoStore({ data: seed() })
    const map = buildProjectionMap(mappings, store)

    const created = await run(map['POST /api/users']!, ctx({ method: 'POST', body: { name: 'Dana' } }))
    expect(isDemoResponse(created) && created.status === 201).toBe(true)
    expect(store.model('users').all()).toHaveLength(4)

    const updated = (await run(map['PATCH /api/users/:id']!, ctx({ method: 'PATCH', params: { id: 'u1' }, body: { name: 'Alicia' } }))) as {
      name: string
    }
    expect(updated.name).toBe('Alicia')

    const deleted = await run(map['DELETE /api/users/:id']!, ctx({ method: 'DELETE', params: { id: 'u2' } }))
    expect(isDemoResponse(deleted) && deleted.status === 204).toBe(true)
    expect(store.model('users').find('u2')).toBeUndefined()
  })
})

describe('aggregate projections', () => {
  const store = () => createDemoStore({ data: seed() })

  it('count / sum / avg / groupBy', async () => {
    const make = (aggregateConfig: EndpointMapping['aggregateConfig']) =>
      buildProjectionMap(
        [{ method: 'GET', pattern: '/api/stats', sourceModel: 'users', responseType: 'aggregate', aggregateConfig }],
        store()
      )['GET /api/stats']!

    expect(await run(make({ function: 'count' }), ctx())).toEqual({ count: 3 })
    expect(await run(make({ function: 'sum', field: 'amount' }), ctx())).toEqual({ sum: 60 })
    expect(await run(make({ function: 'avg', field: 'amount' }), ctx())).toEqual({ avg: 20 })
    expect(await run(make({ function: 'groupBy', groupBy: 'status' }), ctx())).toEqual({
      groups: [
        { key: 'active', count: 2 },
        { key: 'inactive', count: 1 },
      ],
    })
    expect(await run(make({ function: 'sum', field: 'amount', groupBy: 'status' }), ctx())).toEqual({
      groups: [
        { key: 'active', sum: 30 },
        { key: 'inactive', sum: 30 },
      ],
    })
  })

  it('warns once when a sum aggregate field is absent from every row, and returns {sum: 0}', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const map = buildProjectionMap(
        [
          {
            method: 'GET',
            pattern: '/api/stats-missing-field',
            sourceModel: 'users',
            responseType: 'aggregate',
            aggregateConfig: { function: 'sum', field: 'nope' },
          },
        ],
        store()
      )
      const handler = map['GET /api/stats-missing-field']!

      expect(await run(handler, ctx())).toEqual({ sum: 0 })
      expect(warn).toHaveBeenCalledTimes(1)

      // Second invocation on the same mapping: no repeat warning.
      expect(await run(handler, ctx())).toEqual({ sum: 0 })
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('transform projections', () => {
  it('invokes the registered transform with a TransformContext', async () => {
    const store = createDemoStore({ data: seed() })
    const map = buildProjectionMap(
      [{ method: 'GET', pattern: '/api/billing', sourceModel: 'users', responseType: 'transform', transformName: 'billing-summary' }],
      store,
      { 'billing-summary': ({ store: s }) => ({ total: s.model('users').all().length }) }
    )
    expect(await run(map['GET /api/billing']!, ctx())).toEqual({ total: 3 })
  })

  it('warns and skips unregistered transforms so the mutation policy applies', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const store = createDemoStore({ data: seed() })
      const map = buildProjectionMap(
        [{ method: 'GET', pattern: '/api/billing', sourceModel: 'users', responseType: 'transform', transformName: 'nope' }],
        store
      )
      expect(map['GET /api/billing']).toBeUndefined()
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('warns and skips legacy custom mappings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const store = createDemoStore({ data: seed() })
      const map = buildProjectionMap(
        [{ method: 'GET', pattern: '/api/x', sourceModel: 'users', responseType: 'custom' }],
        store
      )
      expect(map['GET /api/x']).toBeUndefined()
    } finally {
      warn.mockRestore()
    }
  })
})
