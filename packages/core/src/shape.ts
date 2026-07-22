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
/** Response body size budget for shape observation (declared content-length only; see maybeDeriveShapeFromResponse). */
export const SHAPE_MAX_RESPONSE_BYTES = 1024 * 1024

/**
 * Derive a values-free shape descriptor for `value`.
 *
 * Returns null when the value can't yield a useful shape (undefined,
 * function) or when the serialized result exceeds SHAPE_MAX_BYTES.
 *
 * NEVER records values — type tags and key names only.
 */
export function deriveShape(value: unknown): ShapeNode | null {
  try {
    const node = buildShapeNode(value, 0)
    if (node === null) return null

    const serialized = JSON.stringify(node)
    if (serialized.length > SHAPE_MAX_BYTES) return null

    return node
  } catch {
    // Defense in depth: a throwing getter on the observed value (or any
    // other unexpected failure while walking it) must never escape and
    // break the host app. Treat it the same as "no useful shape."
    return null
  }
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
    // Collapsed depth-capped objects are marked `truncated: true` too — not
    // because keys were clipped, but so a collapsed node (real keys exist
    // but were never looked at) stays distinguishable from a genuinely empty
    // object. Task 5's drift classifier would otherwise read `keys: {}` at
    // depth >= SHAPE_MAX_DEPTH as "missing_key" for anything nested there.
    if (depth >= SHAPE_MAX_DEPTH) return { t: 'object', keys: {}, truncated: true }
    const obj = value as Record<string, unknown>
    const allKeys = Object.keys(obj)
    const truncated = allKeys.length > SHAPE_MAX_KEYS
    const consideredKeys = allKeys.slice(0, SHAPE_MAX_KEYS)

    // Object.create(null): a literal own-property named "__proto__" (as
    // JSON.parse produces — a real data property, not the accessor) must
    // become a real key in the shape rather than silently reassigning this
    // accumulator's [[Prototype]] via Object.prototype's __proto__ setter.
    const keys: Record<string, ShapeNode> = Object.create(null)
    for (const key of consideredKeys) {
      const childShape = buildShapeNode(obj[key], depth + 1)
      if (childShape !== null) keys[key] = childShape
    }

    return truncated ? { t: 'object', keys, truncated: true } : { t: 'object', keys }
  }

  // undefined, function, symbol, bigint, NaN, etc. — no representable shape.
  return null
}

/**
 * Guarded shape derivation for a live `Response` — the only other seam
 * (besides `deriveShape` itself) allowed to touch a response body under
 * spec §8's privacy constraint. Shared by the fetch interceptor's
 * passthrough shape hook (Task 2) and the msw transport (Task 4), so both
 * transports apply identical guards.
 *
 * Guards, in order: 2xx status, `content-type: application/json`,
 * declared `content-length` <= 1 MiB (only when the header is present —
 * absent is not treated as oversized), then clones the response (so the
 * caller's original body stream is never disturbed) and parses the clone.
 *
 * Every step is try/caught: a malformed body, a hostile Response-like
 * object, or any other failure while reading it yields `null` rather than
 * throwing. This must never be able to break the passthrough response path
 * it observes.
 */
export async function maybeDeriveShapeFromResponse(response: Response): Promise<ShapeNode | null> {
  try {
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) return null

    const contentLength = response.headers.get('content-length')
    if (contentLength !== null) {
      const length = Number(contentLength)
      if (Number.isFinite(length) && length > SHAPE_MAX_RESPONSE_BYTES) return null
    }

    const text = await response.clone().text()
    const parsed = JSON.parse(text)
    return deriveShape(parsed)
  } catch {
    // Defense in depth: shape observation is best-effort telemetry and must
    // never surface a failure into the passthrough response path.
    return null
  }
}
