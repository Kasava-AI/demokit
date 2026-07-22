/**
 * Shape-drift detection (spec §9.4): the SDK observes response SHAPES on
 * demo-mode misses so the cloud can diff them against the synced schema IR.
 *
 * `deriveShape` is the single function allowed to touch response bodies for
 * this feature. It produces a values-free descriptor under spec §8's
 * absolute privacy constraint: key names and primitive-type tags only —
 * NEVER values. No string content, no numeric magnitude, no boolean value,
 * nothing that could reconstruct or fingerprint the original payload.
 */
import { isString, isNumber, isBoolean, isArray, isObject } from './services/codegen/validation/checks'

export type ShapeNode =
  | { t: 'string' }
  | { t: 'number' }
  | { t: 'boolean' }
  | { t: 'null' }
  | { t: 'array'; items?: ShapeNode } // first element only
  | { t: 'object'; keys: Record<string, ShapeNode>; truncated?: true }

export interface ObservedShape {
  method: string
  path: string
  shape: ShapeNode
}

/** Object/array nesting levels kept before collapsing to a bare node. */
export const SHAPE_MAX_DEPTH = 4
/** Object keys kept (insertion order) before setting `truncated: true`. */
export const SHAPE_MAX_KEYS = 40
/** Serialized shape byte (JSON.stringify length) budget; over this -> null. */
export const SHAPE_MAX_BYTES = 4096

/**
 * Derive a values-free shape descriptor for `value`.
 *
 * Returns null when the value can't yield a useful shape (undefined,
 * function) or when the serialized result exceeds SHAPE_MAX_BYTES.
 *
 * NEVER records values — type tags and key names only.
 */
export function deriveShape(value: unknown): ShapeNode | null {
  const node = buildShapeNode(value, 0)
  if (node === null) return null

  const serialized = JSON.stringify(node)
  if (serialized.length > SHAPE_MAX_BYTES) return null

  return node
}

/**
 * Build a ShapeNode for `value` at nesting `depth` (root = 0). Returns null
 * when the value has no representable shape (undefined, function, symbol,
 * bigint, NaN, ...) — callers drop the corresponding key/item rather than
 * inventing a placeholder tag not in the ShapeNode union.
 */
function buildShapeNode(value: unknown, depth: number): ShapeNode | null {
  if (value === null) return { t: 'null' }
  if (isString(value)) return { t: 'string' }
  if (isNumber(value)) return { t: 'number' }
  if (isBoolean(value)) return { t: 'boolean' }

  if (isArray(value)) {
    if (depth >= SHAPE_MAX_DEPTH) return { t: 'array' }
    const arr = value as unknown[]
    if (arr.length === 0) return { t: 'array' }
    const itemShape = buildShapeNode(arr[0], depth + 1)
    return itemShape === null ? { t: 'array' } : { t: 'array', items: itemShape }
  }

  if (isObject(value)) {
    if (depth >= SHAPE_MAX_DEPTH) return { t: 'object', keys: {} }
    const obj = value as Record<string, unknown>
    const allKeys = Object.keys(obj)
    const truncated = allKeys.length > SHAPE_MAX_KEYS
    const consideredKeys = allKeys.slice(0, SHAPE_MAX_KEYS)

    const keys: Record<string, ShapeNode> = {}
    for (const key of consideredKeys) {
      const childShape = buildShapeNode(obj[key], depth + 1)
      if (childShape !== null) keys[key] = childShape
    }

    return truncated ? { t: 'object', keys, truncated: true } : { t: 'object', keys }
  }

  // undefined, function, symbol, bigint, NaN, etc. — no representable shape.
  return null
}
