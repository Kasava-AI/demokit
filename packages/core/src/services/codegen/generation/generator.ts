/**
 * Main generator orchestrator for demo data generation
 *
 * Supports two levels:
 * - Level 1 (schema-valid): Generate data that matches types
 * - Level 2 (relationship-valid): Generate data with valid references
 */

import type { DemokitSchema, DataModel, Relationship } from '../../schema'
import type {
  GenerationOptions,
  GenerationResult,
  GenerationMetadata,
  DemoData,
  GenerationRulesConfig,
  StorySpec,
  AnchorEntity,
  TrendSpec,
} from '../types'
import { validateData } from '../validation/validator'
import { validateStoryConsistency } from '../validation/story'
import { generateIdForModel } from './id-generator'
import {
  generateValue,
  createRecordContext,
  modelHasAddressFields,
  type RecordContext,
} from './value-generators'
import { applyPins, parsePinPath, generateTrendDate } from './story'

/**
 * Default record counts per model
 */
const DEFAULT_COUNT = 5

/**
 * Generate demo data from a schema
 */
export function generateDemoData(
  schema: DemokitSchema,
  options: GenerationOptions = { level: 'schema-valid' }
): GenerationResult {
  const startTime = Date.now()
  const { level, baseTimestamp, validate = true, story } = options
  const seed = options.seed ?? story?.seed ?? 0
  const counts: Record<string, number> = { ...(story?.counts ?? {}), ...(options.counts ?? {}) }
  for (const pin of story?.pins ?? []) {
    const parsed = parsePinPath(pin)
    if (parsed?.kind === 'count') counts[parsed.model] = parsed.value
  }
  const customRules: GenerationRulesConfig | undefined =
    story && Object.keys(story.fieldRules).length > 0
      ? {
          version: 1,
          fieldRules: { ...story.fieldRules, ...(options.customRules?.fieldRules ?? {}) },
          datasets: options.customRules?.datasets,
        }
      : options.customRules

  // Track used IDs for each model
  const usedIds: Record<string, string[]> = {}
  const data: DemoData = {}

  const anchorsByModel: Record<string, AnchorEntity[]> = {}
  for (const anchor of story?.anchors ?? []) {
    ;(anchorsByModel[anchor.model] ??= []).push(anchor)
  }
  const anchorIds: Record<string, string[]> = {}
  // (model → row index → fields set by anchors/pins; the aggregate pass must not rewrite them)
  const heldFields: Record<string, Map<number, Set<string>>> = {}

  // Get model names in order (respecting dependencies for relationship-valid)
  const modelOrder = level === 'relationship-valid'
    ? getModelGenerationOrder(schema)
    : Object.keys(schema.models)

  // Generate data for each model
  for (const modelName of modelOrder) {
    const model = schema.models[modelName]
    if (!model || model.type !== 'object') continue

    const modelAnchors = anchorsByModel[modelName] ?? []
    const count = Math.max(counts[modelName] ?? DEFAULT_COUNT, modelAnchors.length)
    const records: Record<string, unknown>[] = []
    usedIds[modelName] = []
    anchorIds[modelName] = []

    const trend = story?.trends.find((t) => t.model === modelName)

    for (let i = 0; i < count; i++) {
      const record = generateRecord(
        model,
        schema,
        i,
        usedIds,
        anchorIds,
        level,
        baseTimestamp,
        seed,
        customRules,
        trend
      )
      const anchor = modelAnchors[i]
      if (anchor) {
        Object.assign(record, anchor.attrs)
        const held = (heldFields[modelName] ??= new Map())
        held.set(i, new Set(Object.keys(anchor.attrs)))
      }
      records.push(record)

      // Track the ID
      const idField = findIdField(model)
      if (idField && record[idField]) {
        usedIds[modelName].push(String(record[idField]))
        if (anchor) {
          anchorIds[modelName].push(String(record[idField]))
        }
      }
    }

    data[modelName] = records
  }

  if (story) {
    applyPins(data, story, heldFields, schema)
  }

  // Calculate metadata
  const recordsByModel: Record<string, number> = {}
  let totalRecords = 0
  for (const [modelName, records] of Object.entries(data)) {
    recordsByModel[modelName] = records.length
    totalRecords += records.length
  }

  const metadata: GenerationMetadata = {
    level,
    generatedAt: new Date().toISOString(),
    totalRecords,
    recordsByModel,
    usedIds,
    durationMs: Date.now() - startTime,
  }

  // Validate if requested
  const validation = validate
    ? validateData(data, { schema })
    : {
        valid: true,
        errors: [],
        warnings: [],
        stats: {
          totalRecords,
          recordsByModel,
          relationshipsChecked: 0,
          typeChecks: 0,
          durationMs: 0,
        },
      }

  if (validate && story) {
    const storyErrors = validateStoryConsistency(data, story, { baseTimestamp })
    if (storyErrors.length > 0) {
      validation.errors.push(...storyErrors)
      validation.valid = false
    }
  }

  // Generate fixtures if requested
  const fixtures = options.format === 'typescript'
    ? generateTypeScriptFixtures(data)
    : undefined

  return {
    data,
    fixtures,
    validation,
    metadata,
  }
}

/**
 * Generate a single record for a model
 */
function generateRecord(
  model: DataModel,
  schema: DemokitSchema,
  index: number,
  usedIds: Record<string, string[]>,
  anchorIds: Record<string, string[]>,
  level: string,
  baseTimestamp?: number,
  seed: number = 0,
  customRules?: GenerationRulesConfig,
  trend?: TrendSpec
): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  const properties = model.properties ?? {}
  const requiredFields = new Set(model.required ?? [])

  // Create record context for correlated field generation
  // This ensures address fields (city, state, zip, etc.) are consistent within a record
  // and dataset fields use the same row for correlation (Phase 2)
  const hasAddressFields = modelHasAddressFields(properties)
  const recordContext: RecordContext = createRecordContext(index, seed, {
    hasAddressFields,
    datasets: customRules?.datasets,
  })

  // Track timestamp fields for ordering
  let createdAt: string | undefined
  let updatedAt: string | undefined

  for (const [fieldName, propDef] of Object.entries(properties)) {
    const isRequired = requiredFields.has(fieldName) || propDef.required

    // Skip optional fields sometimes (but always include required ones)
    // Use seeded random for deterministic results
    const fieldSeed = seed + index * 1000 + hashString(fieldName)
    const isTrendField = trend !== undefined && fieldName === trend.dateField
    if (!isRequired && !isTrendField && seededRandom(fieldSeed) > 0.7) {
      continue
    }

    // Handle relationship fields for Level 2
    if (level === 'relationship-valid') {
      const relationship = findRelationshipForField(schema, model.name, fieldName)
      if (relationship) {
        const targetIds = usedIds[relationship.to.model]
        const targetAnchorIds = anchorIds[relationship.to.model] ?? []
        if (targetIds && targetIds.length > 0) {
          // Anchors become preferred FK targets (spec §5.2): half of the
          // references land on anchor rows, deterministically.
          if (targetAnchorIds.length > 0 && seededRandom(fieldSeed + 2) < 0.5) {
            const anchorIndex = Math.floor(seededRandom(fieldSeed + 3) * targetAnchorIds.length)
            record[fieldName] = targetAnchorIds[anchorIndex]
          } else {
            const randomIndex = Math.floor(seededRandom(fieldSeed + 1) * targetIds.length)
            record[fieldName] = targetIds[randomIndex]
          }
          continue
        } else if (relationship.required) {
          // No IDs available yet - this shouldn't happen with proper ordering
          // but handle gracefully
          record[fieldName] = generateIdForModel(relationship.to.model, 0)
          continue
        }
      }
    }

    // Look up custom rule for this field (key: "ModelName.fieldName")
    const ruleKey = `${model.name}.${fieldName}`
    const customRule = customRules?.fieldRules?.[ruleKey]

    // Generate value based on field type, passing record context for correlated generation
    // and datasets for fromDataset rules (Phase 2)
    const value = isTrendField
      ? generateTrendDate(trend, index, seed, baseTimestamp, propDef.format)
      : generateValue(
          propDef,
          index,
          baseTimestamp,
          seed,
          recordContext,
          customRule,
          customRules?.datasets
        )
    record[fieldName] = value

    // Track timestamp fields
    if (fieldName === 'createdAt' && typeof value === 'string') {
      createdAt = value
    }
    if (fieldName === 'updatedAt' && typeof value === 'string') {
      updatedAt = value
    }
  }

  // Ensure timestamp ordering: createdAt <= updatedAt
  if (createdAt && updatedAt) {
    const createdTime = new Date(createdAt).getTime()
    const updatedTime = new Date(updatedAt).getTime()
    if (createdTime > updatedTime) {
      // Swap them
      record.createdAt = updatedAt
      record.updatedAt = createdAt
    }
  }

  return record
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/**
 * Hash a string to a number
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

/**
 * Find the ID field for a model
 */
function findIdField(model: DataModel): string | undefined {
  const properties = model.properties ?? {}

  // Look for common ID field names
  for (const idName of ['id', 'ID', '_id']) {
    if (properties[idName]) {
      return idName
    }
  }

  // Look for format: uuid
  for (const [name, prop] of Object.entries(properties)) {
    if (prop.format === 'uuid') {
      return name
    }
  }

  return undefined
}

/**
 * Find a relationship for a specific field
 */
function findRelationshipForField(
  schema: DemokitSchema,
  modelName: string,
  fieldName: string
): Relationship | undefined {
  return schema.relationships.find(
    (rel) => rel.from.model === modelName && rel.from.field === fieldName
  )
}

/**
 * Get models in dependency order for relationship-valid generation
 * Models that are referenced should be generated first
 */
function getModelGenerationOrder(schema: DemokitSchema): string[] {
  const modelNames = Object.keys(schema.models)
  const dependencies = new Map<string, Set<string>>()

  // Initialize all models with empty dependency sets
  for (const name of modelNames) {
    dependencies.set(name, new Set())
  }

  // Build dependency graph from relationships
  for (const rel of schema.relationships) {
    const fromModel = rel.from.model
    const toModel = rel.to.model

    // fromModel depends on toModel (toModel must be generated first)
    if (dependencies.has(fromModel) && modelNames.includes(toModel)) {
      dependencies.get(fromModel)!.add(toModel)
    }
  }

  // Topological sort
  const result: string[] = []
  const visited = new Set<string>()
  const temp = new Set<string>()

  function visit(name: string): void {
    if (visited.has(name)) return
    if (temp.has(name)) {
      // Cycle detected - just skip (will use fallback ID generation)
      return
    }

    temp.add(name)

    const deps = dependencies.get(name) ?? new Set()
    for (const dep of deps) {
      visit(dep)
    }

    temp.delete(name)
    visited.add(name)
    result.push(name)
  }

  for (const name of modelNames) {
    visit(name)
  }

  return result
}

/**
 * Generate TypeScript fixture code
 */
function generateTypeScriptFixtures(data: DemoData): string {
  const lines: string[] = [
    '/**',
    ' * Auto-generated demo fixtures',
    ` * Generated at: ${new Date().toISOString()}`,
    ' */',
    '',
  ]

  for (const [modelName, records] of Object.entries(data)) {
    const varName = `DEMO_${toConstantCase(modelName)}`
    lines.push(`export const ${varName} = ${JSON.stringify(records, null, 2)} as const`)
    lines.push('')
  }

  // Add a combined export
  const modelNames = Object.keys(data)
  lines.push('export const DEMO_DATA = {')
  for (const name of modelNames) {
    lines.push(`  ${name}: DEMO_${toConstantCase(name)},`)
  }
  lines.push('} as const')

  return lines.join('\n')
}

/**
 * Convert a name to CONSTANT_CASE
 */
function toConstantCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase()
}

/**
 * Execute a StorySpec deterministically (spec §5.2). Relationship-valid by
 * default so anchors can serve as FK targets.
 */
export function generateFromStorySpec(
  schema: DemokitSchema,
  story: StorySpec,
  overrides: Partial<Omit<GenerationOptions, 'story'>> = {}
): GenerationResult {
  return generateDemoData(schema, {
    level: 'relationship-valid',
    validate: true,
    ...overrides,
    story,
  })
}
