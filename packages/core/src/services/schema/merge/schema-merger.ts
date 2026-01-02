/**
 * Schema Merger.
 * Merges multiple DemokitSchemas from different sources into a unified schema.
 *
 * Features:
 * - Case-insensitive model name matching
 * - Property merge with source tracking
 * - Relationship priority (explicit > inferred)
 * - Conflict detection and resolution
 * - Endpoint merging from multiple sources
 */

import type {
  DemokitSchema,
  DataModel,
  PropertyDef,
  Relationship,
  Endpoint,
} from '../types'
import type { SchemaFormat } from '../parsers/types'

/**
 * Options for schema merging.
 */
export interface MergeOptions {
  /**
   * How to resolve property conflicts when the same model appears in multiple sources.
   * - 'prefer-explicit': Prefer properties from more explicit sources (e.g., Drizzle over TypeScript)
   * - 'prefer-first': Keep the first value encountered
   * - 'union': Combine all properties, with first taking precedence for conflicts
   */
  conflictResolution?: 'prefer-explicit' | 'prefer-first' | 'union'

  /**
   * Order of precedence for relationships.
   * Earlier formats have higher priority.
   * Default: ['drizzle', 'prisma', 'graphql', 'supabase', 'zod', 'trpc', 'typescript', 'nextjs']
   */
  relationshipPriority?: SchemaFormat[]

  /**
   * Whether to track the source of each field for debugging.
   */
  trackSources?: boolean

  /**
   * Name for the merged schema.
   */
  name?: string

  /**
   * Version for the merged schema.
   */
  version?: string
}

/**
 * A source schema with its format identifier.
 */
export interface SchemaSource {
  format: SchemaFormat
  schema: DemokitSchema
}

/**
 * Result of a merge operation.
 */
export interface MergeResult {
  /**
   * The merged schema.
   */
  schema: DemokitSchema

  /**
   * Conflicts detected during merge.
   */
  conflicts: MergeConflict[]

  /**
   * Source tracking for each model (if enabled).
   */
  sources?: ModelSourceMap

  /**
   * Formats that were merged.
   */
  mergedFormats: SchemaFormat[]
}

/**
 * Describes a merge conflict.
 */
export interface MergeConflict {
  type: 'model' | 'property' | 'relationship'
  modelName: string
  propertyName?: string
  sources: SchemaFormat[]
  resolution: 'kept-first' | 'merged' | 'overwritten'
  details?: string
}

/**
 * Tracks which source provided each model/property.
 */
export interface ModelSourceMap {
  [modelName: string]: {
    primarySource: SchemaFormat
    properties: {
      [propertyName: string]: SchemaFormat
    }
  }
}

/**
 * Default relationship priority order.
 * More explicit sources (with explicit relationships) come first.
 */
const DEFAULT_RELATIONSHIP_PRIORITY: SchemaFormat[] = [
  'drizzle',
  'prisma',
  'graphql',
  'supabase',
  'zod',
  'trpc',
  'typescript',
  'nextjs',
  'openapi',
]

/**
 * Merge multiple schemas into a unified schema.
 *
 * @param sources - Array of schemas with their format identifiers
 * @param options - Merge options
 * @returns Merged schema with conflict information
 */
export function mergeSchemas(
  sources: SchemaSource[],
  options: MergeOptions = {}
): MergeResult {
  const {
    conflictResolution = 'prefer-explicit',
    relationshipPriority = DEFAULT_RELATIONSHIP_PRIORITY,
    trackSources = false,
    name = 'Merged Schema',
    version = '1.0.0',
  } = options

  const mergedModels: Record<string, DataModel> = {}
  const mergedRelationships: Relationship[] = []
  const mergedEndpoints: Endpoint[] = []
  const conflicts: MergeConflict[] = []
  const modelSources: ModelSourceMap = {}
  const mergedFormats: SchemaFormat[] = []

  // Sort sources by relationship priority
  const sortedSources = [...sources].sort((a, b) => {
    const aIndex = relationshipPriority.indexOf(a.format)
    const bIndex = relationshipPriority.indexOf(b.format)
    return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex)
  })

  // Process each source
  for (const source of sortedSources) {
    if (!mergedFormats.includes(source.format)) {
      mergedFormats.push(source.format)
    }

    // Merge models
    for (const [modelName, model] of Object.entries(source.schema.models)) {
      const normalizedName = normalizeModelName(modelName)
      const existingName = findExistingModelName(mergedModels, normalizedName)

      if (existingName) {
        // Model already exists - merge it
        const existingModel = mergedModels[existingName]
        if (existingModel) {
          const { merged, conflict } = mergeModels(
            existingModel,
            model,
            existingName,
            modelSources[existingName]?.primarySource || source.format,
            source.format,
            conflictResolution
          )

          mergedModels[existingName] = merged

          if (conflict) {
            conflicts.push(conflict)
          }

          // Update property sources
          if (trackSources) {
            const existingSource = modelSources[existingName]
            if (existingSource) {
              for (const propName of Object.keys(model.properties || {})) {
                if (!existingSource.properties[propName]) {
                  existingSource.properties[propName] = source.format
                }
              }
            }
          }
        }
      } else {
        // New model
        mergedModels[modelName] = { ...model }

        if (trackSources) {
          modelSources[modelName] = {
            primarySource: source.format,
            properties: Object.keys(model.properties || {}).reduce(
              (acc, propName) => ({ ...acc, [propName]: source.format }),
              {}
            ),
          }
        }
      }
    }

    // Merge relationships
    for (const relationship of source.schema.relationships) {
      const existing = findExistingRelationship(mergedRelationships, relationship)

      if (existing) {
        // Check if new relationship is more authoritative
        const existingPriority = relationshipPriority.indexOf(
          getRelationshipSource(existing)
        )
        const newPriority = relationshipPriority.indexOf(source.format)

        if (newPriority !== -1 && (existingPriority === -1 || newPriority < existingPriority)) {
          // Replace with higher priority relationship
          const index = mergedRelationships.indexOf(existing)
          mergedRelationships[index] = { ...relationship }

          conflicts.push({
            type: 'relationship',
            modelName: relationship.from.model,
            sources: [getRelationshipSource(existing), source.format],
            resolution: 'overwritten',
            details: `Relationship ${relationship.from.model}.${relationship.from.field} -> ${relationship.to.model} overwritten by ${source.format}`,
          })
        }
      } else {
        // New relationship
        mergedRelationships.push({ ...relationship })
      }
    }

    // Merge endpoints
    for (const endpoint of source.schema.endpoints) {
      const existing = mergedEndpoints.find(
        (e) => e.method === endpoint.method && e.path === endpoint.path
      )

      if (!existing) {
        mergedEndpoints.push({ ...endpoint })
      }
    }
  }

  const mergedSchema: DemokitSchema = {
    info: {
      title: name,
      version,
      description: `Schema merged from: ${mergedFormats.join(', ')}`,
    },
    models: mergedModels,
    relationships: mergedRelationships,
    endpoints: mergedEndpoints,
  }

  const result: MergeResult = {
    schema: mergedSchema,
    conflicts,
    mergedFormats,
  }

  if (trackSources) {
    result.sources = modelSources
  }

  return result
}

/**
 * Normalize a model name for case-insensitive matching.
 */
function normalizeModelName(name: string): string {
  return name.toLowerCase()
}

/**
 * Find an existing model name that matches (case-insensitive).
 */
function findExistingModelName(
  models: Record<string, DataModel>,
  normalizedName: string
): string | null {
  for (const existingName of Object.keys(models)) {
    if (normalizeModelName(existingName) === normalizedName) {
      return existingName
    }
  }
  return null
}

/**
 * Merge two models into one.
 */
function mergeModels(
  existing: DataModel,
  incoming: DataModel,
  modelName: string,
  existingSource: SchemaFormat,
  incomingSource: SchemaFormat,
  conflictResolution: 'prefer-explicit' | 'prefer-first' | 'union'
): { merged: DataModel; conflict: MergeConflict | null } {
  let conflict: MergeConflict | null = null

  // Check for property conflicts
  const existingProps = existing.properties || {}
  const incomingProps = incoming.properties || {}
  const conflictingProps = Object.keys(existingProps).filter(
    (k) => k in incomingProps
  )

  if (conflictingProps.length > 0) {
    conflict = {
      type: 'model',
      modelName,
      sources: [existingSource, incomingSource],
      resolution: conflictResolution === 'prefer-first' ? 'kept-first' : 'merged',
      details: `Conflicting properties: ${conflictingProps.join(', ')}`,
    }
  }

  let mergedProps: Record<string, PropertyDef>

  switch (conflictResolution) {
    case 'prefer-first':
      // Keep existing properties, add new ones
      mergedProps = {
        ...incomingProps,
        ...existingProps,
      }
      break

    case 'prefer-explicit':
      // Prefer properties from more explicit sources
      mergedProps = {
        ...existingProps,
        ...incomingProps, // Incoming overwrites if it's more explicit (handled by sort order)
      }
      break

    case 'union':
    default:
      // Merge all properties, existing takes precedence for conflicts
      mergedProps = {
        ...incomingProps,
        ...existingProps,
      }
      break
  }

  const merged: DataModel = {
    ...existing,
    description: existing.description || incoming.description,
    properties: mergedProps,
    required: [
      ...new Set([...(existing.required || []), ...(incoming.required || [])]),
    ],
    // Preserve enum values
    enum: existing.enum || incoming.enum,
  }

  return { merged, conflict }
}

/**
 * Find an existing relationship that matches.
 */
function findExistingRelationship(
  relationships: Relationship[],
  incoming: Relationship
): Relationship | null {
  return (
    relationships.find(
      (r) =>
        normalizeModelName(r.from.model) === normalizeModelName(incoming.from.model) &&
        r.from.field === incoming.from.field &&
        normalizeModelName(r.to.model) === normalizeModelName(incoming.to.model)
    ) || null
  )
}

/**
 * Get the source format of a relationship.
 */
function getRelationshipSource(relationship: Relationship): SchemaFormat {
  // Try to infer from detectedBy
  if (relationship.detectedBy === 'explicit-ref') {
    // Could be drizzle, prisma, graphql
    return 'drizzle' // Default to highest priority
  }
  if (relationship.detectedBy === 'naming-convention') {
    return 'typescript'
  }
  return 'typescript'
}

/**
 * Compare two schemas and return the differences.
 */
export function diffSchemas(
  base: DemokitSchema,
  updated: DemokitSchema
): SchemaDiff {
  const added: SchemaDiffItem[] = []
  const removed: SchemaDiffItem[] = []
  const modified: SchemaDiffItem[] = []

  // Compare models
  const baseModels = new Set(Object.keys(base.models))
  const updatedModels = new Set(Object.keys(updated.models))

  // Find added models
  for (const modelName of updatedModels) {
    if (!baseModels.has(modelName)) {
      added.push({
        type: 'model',
        name: modelName,
        details: updated.models[modelName],
      })
    }
  }

  // Find removed models
  for (const modelName of baseModels) {
    if (!updatedModels.has(modelName)) {
      removed.push({
        type: 'model',
        name: modelName,
        details: base.models[modelName],
      })
    }
  }

  // Find modified models
  for (const modelName of baseModels) {
    if (updatedModels.has(modelName)) {
      const baseModel = base.models[modelName]
      const updatedModel = updated.models[modelName]

      if (baseModel && updatedModel) {
        const propDiffs = diffProperties(
          baseModel.properties || {},
          updatedModel.properties || {}
        )

        if (propDiffs.length > 0) {
          modified.push({
            type: 'model',
            name: modelName,
            details: { propDiffs },
          })
        }
      }
    }
  }

  return { added, removed, modified }
}

/**
 * Diff two sets of properties.
 */
function diffProperties(
  base: Record<string, PropertyDef>,
  updated: Record<string, PropertyDef>
): PropertyDiff[] {
  const diffs: PropertyDiff[] = []
  const baseProps = new Set(Object.keys(base))
  const updatedProps = new Set(Object.keys(updated))

  // Added properties
  for (const propName of updatedProps) {
    if (!baseProps.has(propName)) {
      diffs.push({ name: propName, change: 'added', newValue: updated[propName] })
    }
  }

  // Removed properties
  for (const propName of baseProps) {
    if (!updatedProps.has(propName)) {
      diffs.push({ name: propName, change: 'removed', oldValue: base[propName] })
    }
  }

  // Modified properties
  for (const propName of baseProps) {
    if (updatedProps.has(propName)) {
      const baseProp = base[propName]
      const updatedProp = updated[propName]

      if (baseProp && updatedProp && (
        baseProp.type !== updatedProp.type ||
        baseProp.format !== updatedProp.format ||
        baseProp.required !== updatedProp.required ||
        baseProp.nullable !== updatedProp.nullable
      )) {
        diffs.push({
          name: propName,
          change: 'modified',
          oldValue: baseProp,
          newValue: updatedProp,
        })
      }
    }
  }

  return diffs
}

/**
 * Schema diff result.
 */
export interface SchemaDiff {
  added: SchemaDiffItem[]
  removed: SchemaDiffItem[]
  modified: SchemaDiffItem[]
}

/**
 * A single diff item.
 */
export interface SchemaDiffItem {
  type: 'model' | 'relationship' | 'endpoint'
  name: string
  details: unknown
}

/**
 * Property diff.
 */
export interface PropertyDiff {
  name: string
  change: 'added' | 'removed' | 'modified'
  oldValue?: PropertyDef
  newValue?: PropertyDef
}
