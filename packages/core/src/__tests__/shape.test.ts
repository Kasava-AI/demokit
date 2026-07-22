import { describe, it, expect } from 'vitest'
import {
  deriveShape,
  maybeDeriveShapeFromResponse,
  SHAPE_MAX_DEPTH,
  SHAPE_MAX_KEYS,
  SHAPE_MAX_BYTES,
  type ObservedShape,
  type ShapeNode,
} from '../shape'

describe('deriveShape - constants', () => {
  it('exposes the documented caps', () => {
    expect(SHAPE_MAX_DEPTH).toBe(4)
    expect(SHAPE_MAX_KEYS).toBe(40)
    expect(SHAPE_MAX_BYTES).toBe(4096)
  })
})

describe('deriveShape - primitives', () => {
  it('derives string', () => {
    expect(deriveShape('hello')).toEqual({ t: 'string' })
  })

  it('derives integer number', () => {
    expect(deriveShape(42)).toEqual({ t: 'number' })
  })

  it('derives float number', () => {
    expect(deriveShape(3.14159)).toEqual({ t: 'number' })
  })

  it('derives boolean true', () => {
    expect(deriveShape(true)).toEqual({ t: 'boolean' })
  })

  it('derives boolean false', () => {
    expect(deriveShape(false)).toEqual({ t: 'boolean' })
  })

  it('derives null', () => {
    expect(deriveShape(null)).toEqual({ t: 'null' })
  })
})

describe('deriveShape - undefined/function -> null', () => {
  it('returns null for undefined', () => {
    expect(deriveShape(undefined)).toBeNull()
  })

  it('returns null for a function', () => {
    expect(deriveShape(() => 'nope')).toBeNull()
  })

  it('drops object keys whose value is unrepresentable, keeping sibling keys', () => {
    const value = {
      name: 'Ben',
      skip: undefined,
      handler: () => 'nope',
      kept: 1,
    }
    expect(deriveShape(value)).toEqual({
      t: 'object',
      keys: {
        name: { t: 'string' },
        kept: { t: 'number' },
      },
    })
  })
})

describe('deriveShape - nested object/array', () => {
  it('derives a nested object with array and object properties', () => {
    const value = {
      name: 'Ben',
      age: 34,
      active: true,
      tags: ['a', 'b'],
      address: { city: 'SF', zip: 94107 },
    }
    expect(deriveShape(value)).toEqual({
      t: 'object',
      keys: {
        name: { t: 'string' },
        age: { t: 'number' },
        active: { t: 'boolean' },
        tags: { t: 'array', items: { t: 'string' } },
        address: {
          t: 'object',
          keys: { city: { t: 'string' }, zip: { t: 'number' } },
        },
      },
    })
  })

  it('derives array items from the first element only', () => {
    const value = [{ id: 1 }, { id: 2, extra: 'ignored-shape-wise' }]
    expect(deriveShape(value)).toEqual({
      t: 'array',
      items: { t: 'object', keys: { id: { t: 'number' } } },
    })
  })
})

describe('deriveShape - empty array', () => {
  it('has no items field for an empty array', () => {
    const shape = deriveShape([])
    expect(shape).toEqual({ t: 'array' })
    expect(shape && 'items' in shape).toBe(false)
  })
})

describe('deriveShape - depth collapse', () => {
  function nestObject(depth: number, leaf: unknown): unknown {
    let node = leaf
    for (let i = 0; i < depth; i++) node = { child: node }
    return node
  }

  function nestArray(depth: number, leaf: unknown): unknown {
    let node = leaf
    for (let i = 0; i < depth; i++) node = [node]
    return node
  }

  it('collapses an object beyond SHAPE_MAX_DEPTH to a bare object marked truncated', () => {
    const value = nestObject(SHAPE_MAX_DEPTH + 1, 'sentinel-leaf-value')
    const shape = deriveShape(value)
    expect(shape).not.toBeNull()

    // Walk exactly SHAPE_MAX_DEPTH ".keys.child" hops from the root; the node
    // reached there was built at depth === SHAPE_MAX_DEPTH and must collapse.
    let node: ShapeNode | null | undefined = shape
    for (let i = 0; i < SHAPE_MAX_DEPTH; i++) {
      if (node?.t !== 'object') throw new Error('expected object shape')
      node = node.keys.child
    }
    // truncated: true here signals "real keys existed but were never looked
    // at" — distinct from a genuinely empty object, which must NOT set it
    // (see the sibling test below). Without this, Task 5's drift classifier
    // would read collapsed nodes as missing_key false positives.
    expect(node).toEqual({ t: 'object', keys: {}, truncated: true })
  })

  it('does NOT mark a genuinely empty object as truncated', () => {
    expect(deriveShape({})).toEqual({ t: 'object', keys: {} })
  })

  it('collapses an array beyond SHAPE_MAX_DEPTH to a bare array (no items)', () => {
    const value = nestArray(SHAPE_MAX_DEPTH + 1, 999)
    const shape = deriveShape(value)
    expect(shape).not.toBeNull()

    let node: ShapeNode | null | undefined = shape
    for (let i = 0; i < SHAPE_MAX_DEPTH; i++) {
      if (node?.t !== 'array') throw new Error('expected array shape')
      node = node.items
    }
    expect(node).toEqual({ t: 'array' })
  })
})

describe('deriveShape - key truncation', () => {
  it('keeps the first SHAPE_MAX_KEYS keys in insertion order and sets truncated', () => {
    const value: Record<string, number> = {}
    for (let i = 0; i < SHAPE_MAX_KEYS + 5; i++) value[`key${i}`] = i

    const shape = deriveShape(value)
    expect(shape).not.toBeNull()
    if (shape?.t !== 'object') throw new Error('expected object shape')

    expect(shape.truncated).toBe(true)
    const keptKeys = Object.keys(shape.keys)
    expect(keptKeys).toHaveLength(SHAPE_MAX_KEYS)
    expect(keptKeys).toEqual(Array.from({ length: SHAPE_MAX_KEYS }, (_, i) => `key${i}`))
  })

  it('does not set truncated when key count is exactly at the cap', () => {
    const value: Record<string, number> = {}
    for (let i = 0; i < SHAPE_MAX_KEYS; i++) value[`key${i}`] = i

    const shape = deriveShape(value)
    expect(shape).not.toBeNull()
    if (shape?.t !== 'object') throw new Error('expected object shape')
    expect(shape.truncated).toBeUndefined()
    expect(Object.keys(shape.keys)).toHaveLength(SHAPE_MAX_KEYS)
  })
})

describe('deriveShape - oversized shape', () => {
  it('returns null when the serialized shape exceeds SHAPE_MAX_BYTES', () => {
    // Exactly SHAPE_MAX_KEYS keys (so truncation isn't in play) but with very
    // long key names, so the serialized shape itself blows the byte budget.
    const value: Record<string, string> = {}
    for (let i = 0; i < SHAPE_MAX_KEYS; i++) {
      value[`k${i}_${'x'.repeat(150)}`] = 'value-does-not-matter'
    }
    expect(deriveShape(value)).toBeNull()
  })
})

describe('deriveShape - privacy (spec §8)', () => {
  it('never includes any value fragment in the serialized shape', () => {
    const SENTINEL_STRING = 'ZQXJ7-SENTINEL-DO-NOT-LEAK-9182'
    const SENTINEL_NUMBER = 8675309424242
    const fixture = {
      id: SENTINEL_NUMBER,
      name: SENTINEL_STRING,
      active: true,
      tags: [`${SENTINEL_STRING}-tag`],
      address: {
        city: `${SENTINEL_STRING}-city`,
        zip: SENTINEL_NUMBER + 1,
      },
    }

    const shape = deriveShape(fixture)
    expect(shape).not.toBeNull()

    const serialized = JSON.stringify(shape)
    expect(serialized).not.toContain(SENTINEL_STRING)
    expect(serialized).not.toContain(String(SENTINEL_NUMBER))
    expect(serialized).not.toContain(String(SENTINEL_NUMBER + 1))

    // Key names ARE allowed (spec §8: key names + primitive-type tags only).
    expect(serialized).toContain('"id"')
    expect(serialized).toContain('"name"')
    expect(serialized).toContain('"tags"')
    expect(serialized).toContain('"address"')
  })
})

describe('deriveShape - __proto__ own-property handling', () => {
  it('shapes a literal __proto__ own property without polluting the accumulator', () => {
    // JSON.parse's own-property "__proto__" is a real data property (not the
    // Object.prototype accessor) — this is exactly what real JSON.parse
    // output looks like when a response body has a "__proto__" field.
    const value = JSON.parse('{"__proto__": {"x": 1}, "a": "s"}') as Record<string, unknown>
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype) // sanity: not actually polluted going in

    const shape = deriveShape(value)
    expect(shape).not.toBeNull()
    if (shape?.t !== 'object') throw new Error('expected object shape')

    // The key must show up in the shape...
    expect(shape.keys.__proto__).toEqual({ t: 'object', keys: { x: { t: 'number' } } })
    expect(shape.keys.a).toEqual({ t: 'string' })
    expect(Object.keys(shape.keys).sort()).toEqual(['__proto__', 'a'])

    // ...and must not have polluted anything: the accumulator has no
    // prototype at all (Object.create(null)), so JSON.stringify (which only
    // looks at own enumerable properties) round-trips it cleanly.
    expect(Object.getPrototypeOf(shape.keys)).toBeNull()
    const serialized = JSON.stringify(shape)
    expect(serialized).toContain('"__proto__"')

    // Note: a non-computed `{ __proto__: ... }` object-literal key sets the
    // literal's *prototype* rather than creating an own property (a distinct
    // gotcha from the accumulator bug above) — a COMPUTED key (`['__proto__']`)
    // is required to build a genuine own "__proto__" property to compare
    // against, matching what JSON.parse(serialized) actually yields.
    const roundTripped = JSON.parse(serialized)
    const expectedKeys = {
      a: { t: 'string' },
      ['__proto__']: { t: 'object', keys: { x: { t: 'number' } } },
    }
    expect(roundTripped).toEqual({ t: 'object', keys: expectedKeys })
    expect(Object.keys(roundTripped.keys).sort()).toEqual(['__proto__', 'a'])
  })
})

describe('deriveShape - throw-safety', () => {
  it('returns null instead of throwing when a property getter throws', () => {
    const value: Record<string, unknown> = { ok: 'fine' }
    Object.defineProperty(value, 'bad', {
      enumerable: true,
      get(): unknown {
        throw new Error('boom')
      },
    })

    expect(() => deriveShape(value)).not.toThrow()
    expect(deriveShape(value)).toBeNull()
  })
})

describe('ObservedShape', () => {
  it('shapes as {method, path, shape}', () => {
    const observed: ObservedShape = {
      method: 'GET',
      path: '/api/users',
      shape: { t: 'string' },
    }
    expect(observed).toEqual({
      method: 'GET',
      path: '/api/users',
      shape: { t: 'string' },
    })
  })
})

// Shared guard reused by the fetch interceptor's passthrough hook (this task)
// and the msw transport (Task 4): the only other place allowed to touch a
// live Response body under spec §8.
describe('maybeDeriveShapeFromResponse', () => {
  function jsonResponse(body: unknown, opts: { status?: number; withLength?: boolean } = {}): Response {
    const { status = 200, withLength = true } = opts
    const text = JSON.stringify(body)
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (withLength) headers['content-length'] = String(text.length)
    return new Response(text, { status, headers })
  }

  it('derives a shape for a JSON 2xx response without consuming the original body', async () => {
    const res = jsonResponse({ id: '1', name: 'Ada', active: true })

    const shape = await maybeDeriveShapeFromResponse(res)

    expect(shape).toEqual({
      t: 'object',
      keys: { id: { t: 'string' }, name: { t: 'string' }, active: { t: 'boolean' } },
    })
    // The original response must still be fully readable (clone-then-parse).
    expect(res.bodyUsed).toBe(false)
    await expect(res.json()).resolves.toEqual({ id: '1', name: 'Ada', active: true })
  })

  it('derives a shape when content-length is absent (only gated when present)', async () => {
    const res = jsonResponse({ ok: true }, { withLength: false })

    const shape = await maybeDeriveShapeFromResponse(res)

    expect(shape).toEqual({ t: 'object', keys: { ok: { t: 'boolean' } } })
  })

  it('returns null for a non-JSON content-type', async () => {
    const res = new Response('plain text', { status: 200, headers: { 'content-type': 'text/plain' } })

    await expect(maybeDeriveShapeFromResponse(res)).resolves.toBeNull()
    expect(res.bodyUsed).toBe(false)
  })

  it('returns null for a non-2xx status', async () => {
    const res = jsonResponse({ error: 'nope' }, { status: 404 })

    await expect(maybeDeriveShapeFromResponse(res)).resolves.toBeNull()
    expect(res.bodyUsed).toBe(false)
  })

  it('returns null when content-length exceeds 1 MiB, without reading the body', async () => {
    const res = new Response(JSON.stringify({ small: true }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-length': String(2 * 1024 * 1024) },
    })

    await expect(maybeDeriveShapeFromResponse(res)).resolves.toBeNull()
    expect(res.bodyUsed).toBe(false)
  })

  it('returns null for a malformed JSON body instead of throwing', async () => {
    const res = new Response('{not json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

    await expect(maybeDeriveShapeFromResponse(res)).resolves.toBeNull()
  })

  it('returns null instead of throwing when reading headers throws', async () => {
    const hostile = {
      ok: true,
      headers: {
        get(): string {
          throw new Error('boom')
        },
      },
      clone() {
        return hostile
      },
    } as unknown as Response

    await expect(maybeDeriveShapeFromResponse(hostile)).resolves.toBeNull()
  })
})
