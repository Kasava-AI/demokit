/**
 * Schema diff severity classification.
 *
 * Wraps `diffSchemas` (models + properties) and a direct endpoint set-diff
 * (`diffSchemas` does not cover endpoints — see `merge/schema-merger.ts`) to
 * label every change as breaking or additive, per spec §9.1. Consumed by the
 * CI GitHub App to drive PR comments and draft fills.
 *
 * v1 has no rename detection: a renamed model/property/endpoint shows up as
 * a removal (breaking) plus an addition (additive), not a single "renamed"
 * change. That's called out in each affected `detail` string isn't needed
 * beyond this note, since the two entries are self-explanatory on their own.
 */

import type { DemokitSchema, Endpoint, PropertyDef } from '../types'
import { diffSchemas, type PropertyDiff } from './schema-merger'

/**
 * Whether a classified change breaks existing consumers or is safe to adopt
 * without action.
 */
export type ChangeSeverity = 'breaking' | 'additive'

/**
 * The kind of change detected between two schema versions.
 */
export type ChangeKind =
  | 'model_removed'
  | 'model_added'
  | 'property_removed'
  | 'property_type_changed'
  | 'property_required_added'
  | 'property_added'
  | 'endpoint_removed'
  | 'endpoint_added'

/**
 * A single classified schema change.
 *
 * `detail` is a human sentence with backticked identifiers, safe to use
 * verbatim as a PR-comment line (e.g. `` `UserResponse.plan` type changed:
 * string → number ``).
 */
export interface ClassifiedChange {
  severity: ChangeSeverity
  kind: ChangeKind
  model?: string
  property?: string
  endpoint?: string
  detail: string
}

/**
 * Result of classifying the diff between two schema versions.
 *
 * `changes` is breaking-first, then additive; within each group, changes
 * appear in diff-encounter order (models, then properties, then endpoints).
 */
export interface ClassifiedDiff {
  changes: ClassifiedChange[]
  breaking: ClassifiedChange[]
  additive: ClassifiedChange[]
  hasBreaking: boolean
  hasAdditive: boolean
}

/**
 * Classify the diff between two schema versions as breaking vs additive
 * changes (spec §9.1).
 *
 * Breaking: model removed, property removed, property type changed,
 * property newly required, endpoint removed.
 * Additive: new model, new property on an existing model (required or not
 * — v1 does not distinguish), new endpoint.
 *
 * @param base - The prior schema version.
 * @param updated - The new schema version.
 */
export function classifySchemaDiff(base: DemokitSchema, updated: DemokitSchema): ClassifiedDiff {
  const diff = diffSchemas(base, updated)
  const changes: ClassifiedChange[] = []

  // Models removed (breaking) / added (additive).
  for (const item of diff.removed) {
    if (item.type === 'model') {
      changes.push({
        severity: 'breaking',
        kind: 'model_removed',
        model: item.name,
        detail: `\`${item.name}\` model removed`,
      })
    }
  }

  for (const item of diff.added) {
    if (item.type === 'model') {
      changes.push({
        severity: 'additive',
        kind: 'model_added',
        model: item.name,
        detail: `\`${item.name}\` model added`,
      })
    }
  }

  // Modified models: walk their property diffs.
  for (const item of diff.modified) {
    if (item.type !== 'model') continue

    const modelName = item.name
    const { propDiffs } = item.details as { propDiffs: PropertyDiff[] }

    for (const propDiff of propDiffs) {
      changes.push(...classifyPropertyDiff(modelName, propDiff))
    }
  }

  // Endpoints: diffSchemas doesn't diff these, so do a direct set-diff keyed
  // on method + path.
  const baseEndpoints = new Map(base.endpoints.map((e) => [endpointKey(e), e]))
  const updatedEndpoints = new Map(updated.endpoints.map((e) => [endpointKey(e), e]))

  for (const key of baseEndpoints.keys()) {
    if (!updatedEndpoints.has(key)) {
      changes.push({
        severity: 'breaking',
        kind: 'endpoint_removed',
        endpoint: key,
        detail: `\`${key}\` endpoint removed`,
      })
    }
  }

  for (const key of updatedEndpoints.keys()) {
    if (!baseEndpoints.has(key)) {
      changes.push({
        severity: 'additive',
        kind: 'endpoint_added',
        endpoint: key,
        detail: `\`${key}\` endpoint added`,
      })
    }
  }

  const breaking = changes.filter((c) => c.severity === 'breaking')
  const additive = changes.filter((c) => c.severity === 'additive')

  return {
    changes: [...breaking, ...additive],
    breaking,
    additive,
    hasBreaking: breaking.length > 0,
    hasAdditive: additive.length > 0,
  }
}

/**
 * Classify a single property diff into zero or more classified changes.
 *
 * A "modified" property diff can independently trip a type change and a
 * newly-required flip; both are emitted when both are true.
 */
function classifyPropertyDiff(modelName: string, propDiff: PropertyDiff): ClassifiedChange[] {
  const { name: propertyName, change } = propDiff

  if (change === 'removed') {
    return [
      {
        severity: 'breaking',
        kind: 'property_removed',
        model: modelName,
        property: propertyName,
        detail: `\`${modelName}.${propertyName}\` property removed`,
      },
    ]
  }

  if (change === 'added') {
    return [
      {
        severity: 'additive',
        kind: 'property_added',
        model: modelName,
        property: propertyName,
        detail: `\`${modelName}.${propertyName}\` property added`,
      },
    ]
  }

  // change === 'modified'
  const oldValue = propDiff.oldValue
  const newValue = propDiff.newValue
  if (!oldValue || !newValue) return []

  const result: ClassifiedChange[] = []

  if (oldValue.type !== newValue.type) {
    result.push({
      severity: 'breaking',
      kind: 'property_type_changed',
      model: modelName,
      property: propertyName,
      detail: `\`${modelName}.${propertyName}\` type changed: ${oldValue.type} → ${newValue.type}`,
    })
  }

  if (becameRequired(oldValue, newValue)) {
    result.push({
      severity: 'breaking',
      kind: 'property_required_added',
      model: modelName,
      property: propertyName,
      detail: `\`${modelName}.${propertyName}\` is now required`,
    })
  }

  return result
}

/** True when a property was not required before and is required now. */
function becameRequired(oldValue: PropertyDef, newValue: PropertyDef): boolean {
  return !oldValue.required && Boolean(newValue.required)
}

/** Stable key for an endpoint: method + path. */
function endpointKey(endpoint: Endpoint): string {
  return `${endpoint.method} ${endpoint.path}`
}
