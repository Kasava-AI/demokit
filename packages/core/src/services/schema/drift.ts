/**
 * Shape-drift classifier (spec §9.4 / Task 5): compares response SHAPES
 * observed by the SDK (Task 1's `ShapeNode`/`ObservedShape`, carried by both
 * transports to the coverage reporter) against the synced `DemokitSchema` IR
 * to surface endpoints and fields that have drifted since the schema was
 * last synced. Pure and read-only — no network, no DB; the dashboard
 * coverage route (Task 6) is the caller.
 */
import { findMatchingPattern } from '../../matcher'
import type { ShapeNode, ObservedShape } from '../../shape'
import { isSchemaRef, extractRefName } from './types'
import type { DataModel, DemokitSchema, Endpoint, PropertyDef, ResponseDef, SchemaRef } from './types'

/** The kind of drift a single finding reports. */
export type DriftKind = 'unknown_endpoint' | 'missing_key' | 'extra_key' | 'type_mismatch'

/**
 * A single classified drift observation. `detail` is a human sentence with
 * backticked identifiers, matching `classifySchemaDiff`'s PR-comment voice
 * (see `merge/classify.ts`) — safe to render verbatim.
 */
export interface DriftFinding {
  kind: DriftKind
  /** HTTP method of the observed request. */
  method: string
  /** Observed request pathname (concrete, not templated). */
  path: string
  /** The matched schema endpoint's declared (templated) path, e.g. `/users/{id}`. Absent for `unknown_endpoint`. */
  endpointPath?: string
  /** The property key this finding is about. Absent for `unknown_endpoint`. */
  key?: string
  /** Declared type, for `type_mismatch`. */
  expected?: string
  /** Observed type, for `type_mismatch`. */
  observed?: string
  detail: string
}

/** Result of diffing a batch of observed shapes against a schema. */
export interface ShapeDriftReport {
  findings: DriftFinding[]
  /** Total observations passed in. */
  observedCount: number
  /** Observations that matched a schema endpoint (regardless of whether a comparable response model was found). */
  matchedCount: number
}

/**
 * Legacy base-path guess, tried last. Lifted from `inferMappingsFromModels`'s
 * `basePath` default in packages/ai/src/lib/schema-to-mappings.ts (~line
 * 457) — that default exists for a different problem (inventing plausible
 * REST paths when there's no schema at all) and is kept here only as a
 * last-resort fallback now that `schema.info.baseUrl` (real, already-parsed
 * data — see `baseUrlPathPrefix`) is tried first.
 */
const DEFAULT_BASE_PATH = '/api'

/**
 * Bound on how many leading path segments the strip fallback (see
 * `findEndpoint`) will remove from an observed pathname. Kept small and
 * fixed so an unrelated path can't "walk into" a short template purely by
 * shedding enough segments — 2 covers the common `/api/v2/...` shape
 * without turning the matcher into an open-ended fuzzy search.
 */
const MAX_BASE_PATH_STRIPS = 2

/**
 * Convert OpenAPI-style `{param}` path placeholders to the `:param` syntax
 * `matchUrl`/`parseUrlPattern` expect. Reimplemented here (rather than
 * importing) to avoid an ai -> core dependency edge; mirrors
 * `normalizePathPattern` in packages/ai/src/lib/schema-to-mappings.ts:~141.
 * @example "/users/{id}" -> "/users/:id"
 */
function toMatcherPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1')
}

/** Build a `"METHOD /pattern"` -> Endpoint map for `findMatchingPattern`. */
function buildPatternMap(endpoints: Endpoint[], prefix: string): Record<string, Endpoint> {
  const patterns: Record<string, Endpoint> = {}
  for (const e of endpoints) {
    patterns[`${e.method} ${prefix}${toMatcherPath(e.path)}`] = e
  }
  return patterns
}

/**
 * Extract the path component of a schema's declared server base URL
 * (`SchemaInfo.baseUrl`, from OpenAPI's `servers[0].url`), if present and
 * parseable. `new URL(url, 'http://_')` accepts both absolute URLs
 * (`https://api.example.com/v1`) and origin-relative ones (`/v1`) the same
 * way. A root or trailing-slash-only path contributes nothing (returns
 * `null`, same as "not present") since it composes to an empty prefix.
 */
function baseUrlPathPrefix(baseUrl: string | undefined): string | null {
  if (!baseUrl) return null
  try {
    const pathname = new URL(baseUrl, 'http://_').pathname.replace(/\/$/, '')
    return pathname || null
  } catch {
    return null
  }
}

/**
 * Ordered, deduped base-path candidates to try when matching an endpoint:
 * the schema's own declared server base path first (real data), then no
 * prefix, then the legacy `/api` guess last.
 */
function basePathCandidates(schema: DemokitSchema): string[] {
  const raw = [baseUrlPathPrefix(schema.info.baseUrl), '', DEFAULT_BASE_PATH]
  const seen = new Set<string>()
  const candidates: string[] = []
  for (const prefix of raw) {
    if (prefix === null || seen.has(prefix)) continue
    seen.add(prefix)
    candidates.push(prefix)
  }
  return candidates
}

/** Try every base-path candidate against `pathname` as given (no segment stripping). */
function matchWithBasePaths(schema: DemokitSchema, method: string, pathname: string): Endpoint | null {
  for (const prefix of basePathCandidates(schema)) {
    const patterns = buildPatternMap(schema.endpoints, prefix)
    const match = findMatchingPattern(patterns, method, pathname)
    if (match) return patterns[match[0]] ?? null
  }
  return null
}

/**
 * Strip `count` leading path segments from `pathname`.
 * @example stripLeadingSegments('/api/v2/users/42', 2) -> '/users/42'
 * Returns `null` if there aren't `count` segments to strip (nothing left to
 * try), which is how the caller knows to stop.
 */
function stripLeadingSegments(pathname: string, count: number): string | null {
  let remainder = pathname
  for (let i = 0; i < count; i++) {
    const match = remainder.match(/^\/[^/]+(\/.*)?$/)
    if (!match?.[1]) return null
    remainder = match[1]
  }
  return remainder
}

/**
 * Find the schema endpoint matching an observed method+path.
 *
 * Layered strategy: try every base-path candidate (§`basePathCandidates`)
 * against the pathname as observed; if none match, strip up to
 * `MAX_BASE_PATH_STRIPS` leading segments off the observed pathname
 * (`/v1/users/42` -> `/users/42`, or two strips for `/api/v2/users/42`) and
 * retry every candidate against each stripped remainder. A strip-match is
 * still a full anchored template match of the remainder — `matchUrl`'s
 * regex is always `^...$`, so this can't partially match. Bounded at 2
 * strips by design: deep enough for the common `/api/v2` shape, shallow
 * enough that an unrelated path can't spuriously align with a short
 * template purely by shedding segments.
 *
 * Swallows pattern-parse errors from malformed endpoint paths rather than
 * letting one bad schema entry abort the whole report.
 */
function findEndpoint(schema: DemokitSchema, method: string, pathname: string): Endpoint | null {
  try {
    const direct = matchWithBasePaths(schema, method, pathname)
    if (direct) return direct

    for (let strips = 1; strips <= MAX_BASE_PATH_STRIPS; strips++) {
      const stripped = stripLeadingSegments(pathname, strips)
      if (stripped === null) break
      const match = matchWithBasePaths(schema, method, stripped)
      if (match) return match
    }

    return null
  } catch {
    return null
  }
}

/** Resolve a `SchemaRef | DataModel` union to a concrete `DataModel`, following `$ref` into `schema.models`. */
function resolveModelRef(schema: DemokitSchema, ref: SchemaRef | DataModel): DataModel | null {
  if (isSchemaRef(ref)) {
    return schema.models[extractRefName(ref.$ref)] ?? null
  }
  return ref
}

/** Pick the 2xx JSON response for an endpoint, preferring `200`, else the lowest other 2xx status declared. */
function resolveJsonResponse(endpoint: Endpoint): ResponseDef | undefined {
  if (endpoint.responses['200']) return endpoint.responses['200']
  const otherTwoXX = Object.keys(endpoint.responses)
    .filter((code) => /^2\d\d$/.test(code))
    .sort()
  const code = otherTwoXX[0]
  return code ? endpoint.responses[code] : undefined
}

/** Resolve the declared response model an endpoint's 2xx `application/json` content, if any. */
function resolveResponseModel(schema: DemokitSchema, endpoint: Endpoint): DataModel | null {
  const response = resolveJsonResponse(endpoint)
  const content = response?.content?.['application/json']
  if (!content) return null
  return resolveModelRef(schema, content)
}

/**
 * Whether a property counts as required. Real OpenAPI-parsed schemas set
 * both `PropertyDef.required` (per-property) and `DataModel.required`
 * (array of names, per parser.ts's `parseSchemaToModel`); hand-built/test
 * schemas commonly only set the per-property flag. Honor either.
 */
function isRequired(model: DataModel, key: string, property: PropertyDef): boolean {
  return property.required === true || Boolean(model.required?.includes(key))
}

/**
 * Whether an observed child shape is compatible with a declared property.
 * `integer` accepts an observed `number` (ShapeNode never distinguishes the
 * two). Observed `null` is accepted for a `null`-typed property, a nullable
 * property, or an optional (non-required) property.
 */
function typesCompatible(model: DataModel, key: string, property: PropertyDef, node: ShapeNode): boolean {
  if (node.t === 'null') {
    return property.type === 'null' || Boolean(property.nullable) || !isRequired(model, key, property)
  }
  if (property.type === node.t) return true
  if (property.type === 'integer' && node.t === 'number') return true
  return false
}

/** Unwrap one array layer from a declared response model, resolving `items`' `$ref` if present. */
function unwrapModel(schema: DemokitSchema, model: DataModel): DataModel | null {
  if (model.type !== 'array') return model
  if (!model.items) return null
  return resolveModelRef(schema, model.items)
}

/** Unwrap one array layer from an observed shape. `undefined` means the observed array was empty (no `items`). */
function unwrapObserved(node: ShapeNode): ShapeNode | undefined {
  if (node.t !== 'array') return node
  return node.items
}

/** Compare one observation's shape against its matched endpoint's declared response model. */
function compareShape(schema: DemokitSchema, obs: ObservedShape, endpoint: Endpoint): DriftFinding[] {
  const declaredModel = resolveResponseModel(schema, endpoint)
  if (!declaredModel) return [] // nothing declared to compare against

  const model = unwrapModel(schema, declaredModel)
  if (!model || model.type !== 'object' || !model.properties) return []

  const node = unwrapObserved(obs.shape)
  if (!node || node.t !== 'object') return [] // includes the "observed empty array" case: nothing to compare

  const endpointPath = endpoint.path
  const findings: DriftFinding[] = []

  // missing_key: declared properties absent from the observation. Skipped
  // entirely for a truncated object (Task 1: depth/key clipping means an
  // absent key here could just be un-observed, not actually missing).
  if (!node.truncated) {
    for (const key of Object.keys(model.properties)) {
      if (!(key in node.keys)) {
        findings.push({
          kind: 'missing_key',
          method: obs.method,
          path: obs.path,
          endpointPath,
          key,
          detail: `\`${key}\` is declared on \`${endpoint.method} ${endpointPath}\` but was not observed`,
        })
      }
    }
  }

  // extra_key / type_mismatch: only ever evaluated against keys actually
  // present in the observation, so these are valid even on a truncated object.
  for (const [key, childNode] of Object.entries(node.keys)) {
    const property = model.properties[key]
    if (!property) {
      findings.push({
        kind: 'extra_key',
        method: obs.method,
        path: obs.path,
        endpointPath,
        key,
        detail: `\`${key}\` was observed on \`${endpoint.method} ${endpointPath}\` but is not declared on the response model`,
      })
      continue
    }

    if (!typesCompatible(model, key, property, childNode)) {
      findings.push({
        kind: 'type_mismatch',
        method: obs.method,
        path: obs.path,
        endpointPath,
        key,
        expected: property.type,
        observed: childNode.t,
        detail: `\`${key}\` on \`${endpoint.method} ${endpointPath}\` expected \`${property.type}\` but observed \`${childNode.t}\``,
      })
    }
  }

  return findings
}

/**
 * Diff a batch of observed response shapes against the synced schema IR.
 * Each observation is matched to a schema endpoint by method + templated
 * path (falling back to a default base path — see `findEndpoint`); an
 * unmatched observation yields a single `unknown_endpoint` finding. A
 * matched observation is compared key-by-key against the endpoint's
 * declared 2xx JSON response model (unwrapping one array layer on either
 * side first, per spec).
 */
export function detectShapeDrift(observed: ObservedShape[], schema: DemokitSchema): ShapeDriftReport {
  const findings: DriftFinding[] = []
  let matchedCount = 0

  for (const obs of observed) {
    const endpoint = findEndpoint(schema, obs.method, obs.path)
    if (!endpoint) {
      findings.push({
        kind: 'unknown_endpoint',
        method: obs.method,
        path: obs.path,
        detail: `\`${obs.method} ${obs.path}\` has no matching endpoint in the schema`,
      })
      continue
    }

    matchedCount += 1
    findings.push(...compareShape(schema, obs, endpoint))
  }

  return { findings, observedCount: observed.length, matchedCount }
}
