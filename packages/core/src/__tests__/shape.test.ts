import { describe, it, expect } from 'vitest'
import {
  deriveShape,
  SHAPE_MAX_DEPTH,
  SHAPE_MAX_KEYS,
  SHAPE_MAX_BYTES,
  type ObservedShape,
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

  it('collapses an object beyond SHAPE_MAX_DEPTH to a bare object (no keys)', () => {
    const value = nestObject(SHAPE_MAX_DEPTH + 1, 'sentinel-leaf-value')
    const shape = deriveShape(value)
    expect(shape).not.toBeNull()

    // Walk exactly SHAPE_MAX_DEPTH ".keys.child" hops from the root; the node
    // reached there was built at depth === SHAPE_MAX_DEPTH and must collapse.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = shape
    for (let i = 0; i < SHAPE_MAX_DEPTH; i++) {
      expect(node.t).toBe('object')
      node = node.keys.child
    }
    expect(node).toEqual({ t: 'object', keys: {} })
  })

  it('collapses an array beyond SHAPE_MAX_DEPTH to a bare array (no items)', () => {
    const value = nestArray(SHAPE_MAX_DEPTH + 1, 999)
    const shape = deriveShape(value)
    expect(shape).not.toBeNull()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = shape
    for (let i = 0; i < SHAPE_MAX_DEPTH; i++) {
      expect(node.t).toBe('array')
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
