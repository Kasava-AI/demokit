/**
 * Value generators for different property types
 *
 * Generates realistic demo data based on property type, format, and constraints.
 */

import type { PropertyDef, DataModel } from '../../schema'
import type { FieldRule, Dataset } from '../types'
import { generateIdForModel, generateSeededUUID } from './id-generator'
import {
  generateCorrelatedAddress,
  type GeneratedAddress,
} from './address-data'

/**
 * Context for generating correlated values within a single record.
 * This allows related fields (like city, state, zip) to be consistent,
 * and ensures fields linked to the same dataset use the same row.
 */
export interface RecordContext {
  /** Pre-generated correlated address for this record */
  address?: GeneratedAddress
  /** Country code preference (US, CA, GB, AU, DE) */
  countryCode?: string
  /**
   * Pre-selected row indices for each dataset (Phase 2).
   * Key is dataset ID, value is the row index to use.
   * This ensures multiple fields linked to the same dataset use the same row.
   */
  datasetRowIndices?: Map<string, number>
}

/**
 * Create a record context with pre-generated correlated data.
 * Call this once per record to ensure address fields are consistent
 * and dataset fields use the same row for correlation.
 */
export function createRecordContext(
  index: number,
  seed: number = 0,
  options: {
    countryCode?: string
    hasAddressFields?: boolean
    /** Datasets for row-based correlation (Phase 2) */
    datasets?: Record<string, Dataset>
  } = {}
): RecordContext {
  const context: RecordContext = {
    countryCode: options.countryCode,
  }

  // Pre-generate address if the model has address fields
  if (options.hasAddressFields !== false) {
    context.address = generateCorrelatedAddress(index, seed, {
      countryCode: options.countryCode,
    })
  }

  // Pre-select row indices for each dataset (Phase 2)
  // This ensures multiple fields linked to the same dataset use the same row
  if (options.datasets && Object.keys(options.datasets).length > 0) {
    const datasetRowIndices = new Map<string, number>()
    for (const [datasetId, dataset] of Object.entries(options.datasets)) {
      if (dataset.rows.length > 0) {
        // Use a unique seed per dataset to get different row selections per record
        const rowSeed = seed + index * 997 + hashString(datasetId)
        const rowIndex = Math.floor(seededRandom(rowSeed) * dataset.rows.length)
        datasetRowIndices.set(datasetId, rowIndex)
      }
    }
    context.datasetRowIndices = datasetRowIndices
  }

  return context
}

/**
 * Check if a model has any address-related fields
 */
export function modelHasAddressFields(properties: Record<string, { name: string }>): boolean {
  for (const prop of Object.values(properties)) {
    const lowerName = prop.name.toLowerCase()
    if (isAddressField(lowerName)) {
      return true
    }
  }
  return false
}

// Re-export address types for external use
export type { GeneratedAddress } from './address-data'
export { generateCorrelatedAddress, generateCorrelatedAddresses } from './address-data'

/**
 * Simple seeded random number generator (LCG)
 * Returns a value between 0 and 1
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/**
 * Generate a value from a custom field rule
 * Returns undefined if the rule doesn't apply or is incomplete
 *
 * @param rule - The custom field rule to apply
 * @param index - Record index for seeded generation
 * @param seed - Random seed for deterministic results
 * @param schemaEnum - Schema enum values (for enum rules)
 * @param recordContext - Context with pre-selected dataset row indices
 * @param datasets - Available datasets (for fromDataset rules)
 */
function generateFromCustomRule(
  rule: FieldRule,
  index: number,
  seed: number,
  schemaEnum?: unknown[],
  recordContext?: RecordContext,
  datasets?: Record<string, Dataset>
): unknown {
  switch (rule.type) {
    case 'string':
      if (rule.strategy === 'oneOf' && rule.values && rule.values.length > 0) {
        const idx = Math.floor(seededRandom(seed) * rule.values.length)
        return rule.values[idx]
      }
      if (rule.strategy === 'pattern' && rule.pattern) {
        return generateFromPattern(rule.pattern, index, seed)
      }
      return undefined

    case 'number':
      if (rule.strategy === 'fixed' && rule.value !== undefined) {
        return rule.value
      }
      if (rule.strategy === 'range') {
        const min = rule.min ?? 0
        const max = rule.max ?? 100
        const precision = rule.precision ?? 2
        const value = min + seededRandom(seed) * (max - min)
        return Number(value.toFixed(precision))
      }
      return undefined

    case 'integer':
      if (rule.strategy === 'fixed' && rule.value !== undefined) {
        return Math.round(rule.value)
      }
      if (rule.strategy === 'range') {
        const min = rule.min ?? 0
        const max = rule.max ?? 100
        return Math.floor(min + seededRandom(seed) * (max - min + 1))
      }
      return undefined

    case 'boolean':
      if (rule.strategy === 'fixed' && rule.value !== undefined) {
        return rule.value
      }
      if (rule.strategy === 'weighted') {
        const probability = rule.trueProbability ?? 0.5
        return seededRandom(seed) < probability
      }
      return undefined

    case 'enum':
      if (rule.strategy === 'subset' && rule.allowedValues && rule.allowedValues.length > 0) {
        const idx = Math.floor(seededRandom(seed) * rule.allowedValues.length)
        return rule.allowedValues[idx]
      }
      if (rule.strategy === 'weighted' && rule.weights) {
        // Use schema enum values or weights keys as the value pool
        const values = schemaEnum?.map(String) ?? Object.keys(rule.weights)
        if (values.length === 0) return undefined

        // Calculate total weight
        let totalWeight = 0
        for (const v of values) {
          totalWeight += rule.weights[v] ?? 1
        }

        // Pick a value based on weights
        let randomPoint = seededRandom(seed) * totalWeight
        for (const v of values) {
          const weight = rule.weights[v] ?? 1
          randomPoint -= weight
          if (randomPoint <= 0) {
            return v
          }
        }
        // Fallback to last value
        return values[values.length - 1]
      }
      return undefined

    // Phase 2: Linked Dataset support
    case 'fromDataset': {
      const dataset = datasets?.[rule.datasetId]
      if (!dataset || dataset.rows.length === 0) {
        return null // Dataset not found or empty
      }

      const columnIndex = dataset.columns.indexOf(rule.column)
      if (columnIndex === -1) {
        return null // Column not found
      }

      // Use pre-selected row from RecordContext for correlation
      // This ensures all fields linked to the same dataset use the same row
      let rowIndex = recordContext?.datasetRowIndices?.get(rule.datasetId)
      if (rowIndex === undefined) {
        // Fallback to seeded random if no context (shouldn't happen in normal use)
        rowIndex = Math.floor(seededRandom(seed) * dataset.rows.length)
      }

      return dataset.rows[rowIndex]?.[columnIndex] ?? null
    }

    default:
      return undefined
  }
}

/**
 * Generate a value from a pattern template
 * Supports {0000} for zero-padded numbers and {uuid} for UUIDs
 */
function generateFromPattern(pattern: string, index: number, seed: number): string {
  let result = pattern

  // Handle {0000} style patterns (zero-padded sequential number)
  const numPattern = /\{(0+)\}/g
  result = result.replace(numPattern, (_, zeros) => {
    const length = zeros.length
    return String(index).padStart(length, '0')
  })

  // Handle {uuid} pattern
  result = result.replace(/\{uuid\}/gi, () => {
    return generateSeededUUID(seed + index * 12345)
  })

  // Handle {random:N} pattern for random digits
  const randomPattern = /\{random:(\d+)\}/g
  result = result.replace(randomPattern, (_, lengthStr) => {
    const length = parseInt(lengthStr, 10)
    let randomStr = ''
    for (let i = 0; i < length; i++) {
      randomStr += Math.floor(seededRandom(seed + i) * 10)
    }
    return randomStr
  })

  return result
}

/**
 * Generate a value for a property definition
 *
 * @param propDef - The property definition from the schema
 * @param index - The record index (0-based)
 * @param baseTimestamp - Optional base timestamp for date generation
 * @param seed - Random seed for deterministic generation
 * @param recordContext - Optional context for correlated field generation
 * @param customRule - Optional custom generation rule for this field
 * @param datasets - Optional datasets for fromDataset rules (Phase 2)
 */
export function generateValue(
  propDef: PropertyDef,
  index: number,
  baseTimestamp?: number,
  seed: number = 0,
  recordContext?: RecordContext,
  customRule?: FieldRule,
  datasets?: Record<string, Dataset>
): unknown {
  const { type } = propDef

  // Create a unique seed for this field by combining seed, index, and field name
  const fieldSeed = seed + index * 1000 + hashString(propDef.name || '')

  // Check for custom rule first - this takes priority over default generation
  if (customRule) {
    const customValue = generateFromCustomRule(
      customRule,
      index,
      fieldSeed,
      propDef.enum,
      recordContext,
      datasets
    )
    if (customValue !== undefined) {
      return customValue
    }
    // If custom rule didn't produce a value, fall through to default generation
  }

  // Handle nullable - occasionally return null (using seeded random)
  // Skip for address fields to ensure consistent empty string vs null behavior
  const lowerName = propDef.name?.toLowerCase() ?? ''
  if (propDef.nullable && !isAddressField(lowerName) && seededRandom(fieldSeed + 1) < 0.1) {
    return null
  }

  // Use default value if available (but NOT for ID fields that need uniqueness)
  const isIdField = propDef.name?.toLowerCase() === 'id' || propDef.format === 'uuid'
  if (propDef.default !== undefined && !isIdField) {
    return propDef.default
  }

  // Use example value if available (but NOT for ID fields that need uniqueness)
  if (propDef.example !== undefined && !isIdField) {
    return propDef.example
  }

  // Handle enums - use seeded selection for variety
  if (propDef.enum && propDef.enum.length > 0) {
    const enumIndex = Math.floor(seededRandom(fieldSeed + 2) * propDef.enum.length)
    return propDef.enum[enumIndex]
  }

  // Generate based on type and format
  switch (type) {
    case 'string':
      return generateStringValue(propDef, index, baseTimestamp, fieldSeed, recordContext)
    case 'number':
      return generateNumberValue(propDef, index, fieldSeed)
    case 'integer':
      return generateIntegerValue(propDef, fieldSeed)
    case 'boolean':
      return generateBooleanValue(index, fieldSeed)
    case 'array':
      return generateArrayValue(propDef, index, baseTimestamp, fieldSeed)
    case 'object':
      return generateObjectValue(index, fieldSeed)
    default:
      return null
  }
}

/**
 * Generate a string value based on format and field name
 */
function generateStringValue(
  propDef: PropertyDef,
  index: number,
  baseTimestamp?: number,
  seed: number = 0,
  recordContext?: RecordContext
): string {
  const { format, name, minLength, maxLength, pattern } = propDef

  // Format-specific generation
  if (format) {
    switch (format) {
      case 'uuid':
        return generateSeededUUID(seed + index * 12345 + hashString(name))
      case 'email':
        return generateEmail(index, seed)
      case 'uri':
      case 'url':
        return generateUrl(name, index, seed)
      case 'date':
        return generateDate(index, baseTimestamp)
      case 'date-time':
        return generateDateTime(index, baseTimestamp)
      case 'time':
        return generateTime(index)
      case 'hostname': {
        const hostNum = Math.floor(seededRandom(seed + index) * 1000)
        return `host${hostNum}.example.com`
      }
      case 'ipv4': {
        const ip1 = Math.floor(seededRandom(seed + index) * 256)
        const ip2 = Math.floor(seededRandom(seed + index + 1) * 256)
        return `192.168.${ip1}.${ip2}`
      }
      case 'ipv6': {
        const hex = Math.floor(seededRandom(seed + index) * 65536)
        return `2001:db8::${hex.toString(16)}`
      }
      case 'byte': {
        const num = Math.floor(seededRandom(seed + index) * 10000)
        return btoa(`data${num}`)
      }
      case 'binary': {
        const num = Math.floor(seededRandom(seed + index) * 10000)
        return `binary_data_${num}`
      }
      case 'password': {
        const num = Math.floor(seededRandom(seed + index) * 10000)
        return `Password${num}!`
      }
      case 'phone': {
        const area = Math.floor(seededRandom(seed + index) * 1000)
        const num = Math.floor(seededRandom(seed + index + 1) * 10000)
        return `+1-555-${String(area).padStart(3, '0')}-${String(num).padStart(4, '0')}`
      }
    }
  }

  // Name-based inference
  const lowerName = name.toLowerCase()

  if (lowerName === 'id' || lowerName.endsWith('id')) {
    // Foreign key or ID field - use seeded index for variety
    const seededIdx = Math.floor(seededRandom(seed + index) * 10000)
    if (lowerName === 'id') {
      return generateIdForModel('item', seededIdx)
    }
    // Could be a foreign key - generate placeholder
    const modelHint = lowerName.slice(0, -2) // Remove 'Id'
    return generateIdForModel(modelHint || 'ref', seededIdx)
  }

  if (lowerName === 'email' || lowerName.includes('email')) {
    return generateEmail(index, seed)
  }

  if (lowerName === 'name' || lowerName === 'username') {
    return generatePersonName(index, seed)
  }

  if (lowerName === 'firstname' || lowerName === 'first_name') {
    const idx = Math.floor(seededRandom(seed + index) * FIRST_NAMES.length)
    return FIRST_NAMES[idx] ?? 'John'
  }

  if (lowerName === 'lastname' || lowerName === 'last_name') {
    const idx = Math.floor(seededRandom(seed + index) * LAST_NAMES.length)
    return LAST_NAMES[idx] ?? 'Doe'
  }

  if (lowerName === 'title') {
    const num = Math.floor(seededRandom(seed + index) * 1000)
    return `Title ${num}`
  }

  if (lowerName === 'description' || lowerName === 'bio' || lowerName === 'summary') {
    return generateDescription(index, seed)
  }

  // Address-related fields - use correlated generation if context available
  if (isAddressField(lowerName)) {
    const addr = recordContext?.address ?? generateCorrelatedAddress(index, seed, {
      countryCode: recordContext?.countryCode,
    })
    return getAddressFieldValue(lowerName, addr, index, seed)
  }

  if (lowerName === 'phone' || lowerName.includes('phone')) {
    const area = Math.floor(seededRandom(seed + index) * 1000)
    const num = Math.floor(seededRandom(seed + index + 1) * 10000)
    return `+1-555-${String(area).padStart(3, '0')}-${String(num).padStart(4, '0')}`
  }

  if (lowerName === 'url' || lowerName === 'website' || lowerName.includes('url')) {
    return generateUrl(name, index, seed)
  }

  if (lowerName.includes('image') || lowerName.includes('avatar') || lowerName.includes('photo')) {
    const imgSeed = Math.floor(seededRandom(seed + index) * 10000)
    return `https://picsum.photos/seed/${imgSeed}/200/200`
  }

  if (lowerName === 'status') {
    const idx = Math.floor(seededRandom(seed + index) * STATUS_VALUES.length)
    return STATUS_VALUES[idx] ?? 'active'
  }

  if (lowerName === 'type' || lowerName === 'category') {
    const num = Math.floor(seededRandom(seed + index) * 100)
    return `type_${num}`
  }

  if (lowerName.includes('createdat') || lowerName.includes('created_at')) {
    return generateDateTime(index, baseTimestamp)
  }

  if (lowerName.includes('updatedat') || lowerName.includes('updated_at')) {
    // Updated should be after created
    return generateDateTime(index, baseTimestamp, 3600000) // +1 hour
  }

  if (lowerName.includes('deletedat') || lowerName.includes('deleted_at')) {
    // Only some records are deleted (using seeded random)
    return seededRandom(seed + index) < 0.2 ? generateDateTime(index, baseTimestamp, 7200000) : ''
  }

  // Pattern-based generation
  if (pattern) {
    return generateFromPattern(pattern, index, seed)
  }

  // Respect length constraints
  const suffix = Math.floor(seededRandom(seed + index) * 10000)
  let value = `${capitalize(name)} ${suffix}`
  if (minLength && value.length < minLength) {
    value = value.padEnd(minLength, '_')
  }
  if (maxLength && value.length > maxLength) {
    value = value.slice(0, maxLength)
  }

  return value
}

/**
 * Generate a number value
 */
function generateNumberValue(propDef: PropertyDef, index: number, seed: number = 0): number {
  const { minimum, maximum, name } = propDef
  const lowerName = name.toLowerCase()

  // Always respect explicit constraints
  const hasConstraints = minimum !== undefined || maximum !== undefined

  // Price-like fields (only if no explicit constraints)
  if (!hasConstraints && (lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('total'))) {
    const base = (index + 1) * 10 + seededRandom(seed + index) * 90
    return Math.round(base * 100) / 100
  }

  // Percentage fields (only if no explicit constraints)
  if (!hasConstraints && (lowerName.includes('percent') || lowerName.includes('rate'))) {
    return Math.round(seededRandom(seed + index) * 100 * 100) / 100
  }

  // Latitude/longitude (only if no explicit constraints)
  if (!hasConstraints && lowerName.includes('lat')) {
    return Math.round((seededRandom(seed + index) * 180 - 90) * 1000000) / 1000000
  }
  if (!hasConstraints && (lowerName.includes('lng') || lowerName.includes('lon'))) {
    return Math.round((seededRandom(seed + index) * 360 - 180) * 1000000) / 1000000
  }

  // Respect constraints (use defaults only when not specified)
  const min = minimum ?? 0
  const max = maximum ?? 1000

  return Math.round((min + seededRandom(seed + index) * (max - min)) * 100) / 100
}

/**
 * Generate an integer value
 */
function generateIntegerValue(propDef: PropertyDef, seed: number = 0): number {
  const { minimum, maximum, name } = propDef
  const lowerName = name.toLowerCase()

  // Count/quantity fields
  if (lowerName.includes('count') || lowerName.includes('quantity') || lowerName.includes('qty')) {
    return Math.floor(seededRandom(seed) * 10) + 1
  }

  // Age field
  if (lowerName === 'age') {
    return 18 + Math.floor(seededRandom(seed) * 50)
  }

  // Year field
  if (lowerName === 'year') {
    return 2020 + Math.floor(seededRandom(seed) * 5)
  }

  // Respect constraints
  const min = minimum ?? 0
  const max = maximum ?? 100

  return Math.floor(min + seededRandom(seed) * (max - min + 1))
}

/**
 * Generate a boolean value
 */
function generateBooleanValue(index: number, seed: number = 0): boolean {
  return seededRandom(seed + index) > 0.5
}

/**
 * Generate an array value
 *
 * Handles:
 * - Arrays of primitives (items.type is a primitive)
 * - Arrays of objects (items.type === 'object' with properties)
 * - Fallback for undefined items
 */
function generateArrayValue(
  propDef: PropertyDef,
  index: number,
  baseTimestamp?: number,
  seed: number = 0
): unknown[] {
  const itemCount = 1 + Math.floor(seededRandom(seed + index) * 3)
  const items: unknown[] = []

  if (propDef.items && 'type' in propDef.items) {
    const itemSchema = propDef.items as PropertyDef | DataModel

    // Check if items is an object with properties (DataModel)
    if (itemSchema.type === 'object' && 'properties' in itemSchema && itemSchema.properties) {
      // Generate full objects with nested properties
      for (let i = 0; i < itemCount; i++) {
        items.push(generateNestedObject(itemSchema as DataModel, index * 10 + i, baseTimestamp, seed))
      }
    } else {
      // Simple type - use generateValue
      for (let i = 0; i < itemCount; i++) {
        items.push(generateValue(itemSchema as PropertyDef, index * 10 + i, baseTimestamp, seed))
      }
    }
  } else {
    // Default to string items
    for (let i = 0; i < itemCount; i++) {
      const num = Math.floor(seededRandom(seed + index + i) * 1000)
      items.push(`item_${num}`)
    }
  }

  return items
}

/**
 * Generate a nested object from a DataModel schema
 *
 * This handles inline object definitions within array items or nested properties.
 */
function generateNestedObject(
  model: DataModel,
  index: number,
  baseTimestamp?: number,
  seed: number = 0
): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  const properties = model.properties ?? {}
  const requiredFields = new Set(model.required ?? [])

  let fieldIndex = 0
  for (const [fieldName, propDef] of Object.entries(properties)) {
    const isRequired = requiredFields.has(fieldName) || propDef.required

    // Skip optional fields sometimes (but always include required ones)
    if (!isRequired && seededRandom(seed + index + fieldIndex) > 0.7) {
      fieldIndex++
      continue
    }

    // Generate value for this field
    record[fieldName] = generateValue(propDef, index, baseTimestamp, seed)
    fieldIndex++
  }

  return record
}

/**
 * Generate an object value
 */
function generateObjectValue(index: number, seed: number = 0): Record<string, unknown> {
  // For nested objects, generate a simple structure with seeded values
  const keyNum = Math.floor(seededRandom(seed + index) * 1000)
  const valNum = Math.floor(seededRandom(seed + index + 1) * 1000)
  return {
    key: `key_${keyNum}`,
    value: `value_${valNum}`,
  }
}

// Helper generators

/**
 * Check if a field name is address-related
 */
function isAddressField(lowerName: string): boolean {
  const addressFields = [
    'address', 'line1', 'line2', 'street', 'streetaddress',
    'city', 'state', 'province', 'region',
    'country', 'countrycode',
    'zipcode', 'postalcode', 'zip', 'postal',
  ]

  // Check exact matches
  if (addressFields.includes(lowerName)) return true

  // Check partial matches for common patterns
  if (lowerName.includes('address')) return true
  if (lowerName.includes('street')) return true
  if (lowerName === 'postal_code' || lowerName === 'zip_code') return true

  return false
}

/**
 * Get the appropriate value from a generated address based on field name
 */
function getAddressFieldValue(
  lowerName: string,
  addr: GeneratedAddress,
  _index: number,
  _seed: number
): string {
  // Full address field
  if (lowerName === 'address' || lowerName.includes('fulladdress')) {
    return addr.formatted.replace(/\n/g, ', ')
  }

  // Address lines
  if (lowerName === 'line1' || lowerName === 'streetaddress' || lowerName === 'street' || lowerName.includes('address1')) {
    return addr.line1
  }
  if (lowerName === 'line2' || lowerName.includes('address2')) {
    return addr.line2 ?? ''
  }

  // City
  if (lowerName === 'city') {
    return addr.city
  }

  // State/Province
  if (lowerName === 'state' || lowerName === 'province' || lowerName === 'region') {
    return addr.state
  }
  if (lowerName === 'statefull' || lowerName === 'provincefull' || lowerName === 'state_full') {
    return addr.stateFull
  }

  // Country
  if (lowerName === 'country') {
    return addr.country
  }
  if (lowerName === 'countrycode' || lowerName === 'country_code') {
    return addr.countryCode
  }

  // Postal/Zip code
  if (lowerName === 'zipcode' || lowerName === 'postalcode' || lowerName === 'zip' ||
      lowerName === 'postal' || lowerName === 'postal_code' || lowerName === 'zip_code') {
    return addr.postalCode
  }

  // Default to line1 for generic address fields
  return addr.line1
}

function generateEmail(index: number, seed: number = 0): string {
  const nameIdx = Math.floor(seededRandom(seed + index) * FIRST_NAMES.length)
  const domainIdx = Math.floor(seededRandom(seed + index + 1) * EMAIL_DOMAINS.length)
  const num = Math.floor(seededRandom(seed + index + 2) * 1000)
  const name = (FIRST_NAMES[nameIdx] ?? 'user').toLowerCase()
  const domain = EMAIL_DOMAINS[domainIdx] ?? 'example.com'
  return `${name}${num}@${domain}`
}

function generateUrl(fieldName: string, index: number, seed: number = 0): string {
  const num = Math.floor(seededRandom(seed + index) * 10000)
  return `https://example.com/${fieldName.toLowerCase()}/${num}`
}

function generateDate(index: number, baseTimestamp?: number): string {
  const base = baseTimestamp ?? Date.now()
  const offset = index * 86400000 // 1 day per index
  const date = new Date(base - offset)
  return date.toISOString().split('T')[0] ?? ''
}

function generateDateTime(index: number, baseTimestamp?: number, additionalOffset: number = 0): string {
  const base = baseTimestamp ?? Date.now()
  const offset = index * 86400000 + additionalOffset // 1 day per index + additional
  const date = new Date(base - offset)
  return date.toISOString()
}

function generateTime(index: number): string {
  const hours = String(index % 24).padStart(2, '0')
  const minutes = String((index * 15) % 60).padStart(2, '0')
  return `${hours}:${minutes}:00`
}

function generatePersonName(index: number, seed: number = 0): string {
  const firstIdx = Math.floor(seededRandom(seed + index) * FIRST_NAMES.length)
  const lastIdx = Math.floor(seededRandom(seed + index + 1) * LAST_NAMES.length)
  const first = FIRST_NAMES[firstIdx] ?? 'John'
  const last = LAST_NAMES[lastIdx] ?? 'Doe'
  return `${first} ${last}`
}

function generateDescription(index: number, seed: number = 0): string {
  const idx = Math.floor(seededRandom(seed + index) * DESCRIPTIONS.length)
  return DESCRIPTIONS[idx] ?? 'Sample description'
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Data pools

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava',
  'William', 'Sophia', 'James', 'Isabella', 'Oliver',
  'Mia', 'Benjamin', 'Charlotte', 'Elijah', 'Amelia',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White',
]

const EMAIL_DOMAINS = [
  'example.com', 'test.com', 'demo.com', 'sample.org', 'mail.test',
]

// Note: Address data (cities, states, countries, streets) has been moved to
// ./address-data.ts for correlated address generation

const STATUS_VALUES = [
  'active', 'pending', 'completed', 'cancelled', 'processing',
]

const DESCRIPTIONS = [
  'This is a sample description for demonstration purposes.',
  'A brief overview of the item with relevant details.',
  'Detailed information about this particular entry.',
  'Summary text providing context and background.',
  'Description highlighting key features and characteristics.',
]
