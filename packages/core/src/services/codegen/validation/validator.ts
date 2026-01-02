/**
 * Main validator for demo data
 *
 * Validates data against a DemokitSchema, checking:
 * - Type correctness
 * - Format validity
 * - Referential integrity
 * - Custom constraints
 */

import type { PropertyDef, Relationship } from '../../schema'
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidatorOptions,
  DemoData,
} from '../types'
import * as checks from './checks'

/**
 * Validate demo data against a schema
 */
export function validateData(
  data: DemoData,
  options: ValidatorOptions
): ValidationResult {
  const startTime = performance.now()
  const { schema, collectWarnings = false, failFast = false, maxErrors = 1000 } = options

  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let totalRecords = 0
  let relationshipsChecked = 0
  let typeChecks = 0
  const recordsByModel: Record<string, number> = {}

  // Build ID indexes for referential integrity checks
  const idIndexes = buildIdIndexes(data)

  // Validate each model's data
  for (const [modelName, modelData] of Object.entries(data)) {
    const model = schema.models[modelName]
    if (!model) {
      // Data for a model that doesn't exist in schema
      warnings.push({
        type: 'suspicious_value',
        model: modelName,
        field: '',
        message: `Model "${modelName}" exists in data but not in schema`,
      })
      continue
    }

    recordsByModel[modelName] = modelData.length
    totalRecords += modelData.length

    // Validate each record
    for (const record of modelData) {
      const recordId = getRecordId(record)

      // Validate properties
      if (model.properties) {
        for (const [propName, propDef] of Object.entries(model.properties)) {
          const value = (record as Record<string, unknown>)[propName]
          const isRequired = model.required?.includes(propName) ?? propDef.required ?? false

          // Check required fields
          if (isRequired && checks.isNullish(value)) {
            errors.push({
              type: 'required_missing',
              model: modelName,
              field: propName,
              message: `Required field "${propName}" is missing`,
              recordId,
            })
            if (failFast || errors.length >= maxErrors) break
            continue
          }

          // Skip validation if value is null/undefined and field is optional
          if (checks.isNullish(value)) {
            if (collectWarnings && !propDef.nullable) {
              warnings.push({
                type: 'missing_optional',
                model: modelName,
                field: propName,
                message: `Optional field "${propName}" is missing`,
              })
            }
            continue
          }

          // Type validation
          const typeError = validateType(value, propDef, modelName, propName, recordId)
          if (typeError) {
            errors.push(typeError)
            typeChecks++
            if (failFast || errors.length >= maxErrors) break
          } else {
            typeChecks++
          }

          // Format validation
          const formatError = validateFormat(value, propDef, modelName, propName, recordId)
          if (formatError) {
            errors.push(formatError)
            if (failFast || errors.length >= maxErrors) break
          }

          // Constraint validation
          const constraintErrors = validateConstraints(value, propDef, modelName, propName, recordId)
          errors.push(...constraintErrors)
          if (failFast && constraintErrors.length > 0) break
          if (errors.length >= maxErrors) break

          // Referential integrity
          if (propDef.relationshipTo) {
            const refError = validateReference(
              value,
              propDef.relationshipTo,
              modelName,
              propName,
              recordId,
              idIndexes
            )
            relationshipsChecked++
            if (refError) {
              errors.push(refError)
              if (failFast || errors.length >= maxErrors) break
            }
          }

          // Warnings
          if (collectWarnings) {
            if (typeof value === 'string' && value.trim() === '') {
              warnings.push({
                type: 'empty_string',
                model: modelName,
                field: propName,
                message: `String field "${propName}" is empty`,
                value,
              })
            }
          }
        }
      }

      if (failFast && errors.length > 0) break
      if (errors.length >= maxErrors) break
    }

    if (failFast && errors.length > 0) break
    if (errors.length >= maxErrors) break
  }

  // Check for duplicate IDs
  const duplicateErrors = checkDuplicateIds(data)
  errors.push(...duplicateErrors)

  // Validate relationships from schema
  for (const relationship of schema.relationships) {
    const relErrors = validateRelationship(relationship, data, idIndexes)
    relationshipsChecked++
    errors.push(...relErrors)
  }

  const endTime = performance.now()

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRecords,
      recordsByModel,
      relationshipsChecked,
      typeChecks,
      durationMs: Math.round(endTime - startTime),
    },
  }
}

/**
 * Build indexes of IDs for each model for fast reference lookups
 */
function buildIdIndexes(data: DemoData): Map<string, Set<string>> {
  const indexes = new Map<string, Set<string>>()

  for (const [modelName, records] of Object.entries(data)) {
    const ids = new Set<string>()
    for (const record of records) {
      const id = getRecordId(record)
      if (id) {
        ids.add(id)
      }
    }
    indexes.set(modelName, ids)
  }

  return indexes
}

/**
 * Get the ID from a record (tries common ID field names)
 */
function getRecordId(record: unknown): string | undefined {
  if (!record || typeof record !== 'object') return undefined
  const obj = record as Record<string, unknown>
  return (obj.id ?? obj.uuid ?? obj._id) as string | undefined
}

/**
 * Validate value type matches property definition
 */
function validateType(
  value: unknown,
  propDef: PropertyDef,
  model: string,
  field: string,
  recordId?: string
): ValidationError | null {
  const expectedType = propDef.type

  switch (expectedType) {
    case 'string':
      if (!checks.isString(value)) {
        return {
          type: 'type_mismatch',
          model,
          field,
          message: `Expected string but got ${checks.getTypeName(value)}`,
          value,
          expected: 'string',
          recordId,
        }
      }
      break

    case 'number':
      if (!checks.isNumber(value)) {
        return {
          type: 'type_mismatch',
          model,
          field,
          message: `Expected number but got ${checks.getTypeName(value)}`,
          value,
          expected: 'number',
          recordId,
        }
      }
      break

    case 'integer':
      if (!checks.isInteger(value)) {
        return {
          type: 'type_mismatch',
          model,
          field,
          message: `Expected integer but got ${checks.getTypeName(value)}`,
          value,
          expected: 'integer',
          recordId,
        }
      }
      break

    case 'boolean':
      if (!checks.isBoolean(value)) {
        return {
          type: 'type_mismatch',
          model,
          field,
          message: `Expected boolean but got ${checks.getTypeName(value)}`,
          value,
          expected: 'boolean',
          recordId,
        }
      }
      break

    case 'array':
      if (!checks.isArray(value)) {
        return {
          type: 'type_mismatch',
          model,
          field,
          message: `Expected array but got ${checks.getTypeName(value)}`,
          value,
          expected: 'array',
          recordId,
        }
      }
      break

    case 'object':
      if (!checks.isObject(value)) {
        return {
          type: 'type_mismatch',
          model,
          field,
          message: `Expected object but got ${checks.getTypeName(value)}`,
          value,
          expected: 'object',
          recordId,
        }
      }
      break
  }

  return null
}

/**
 * Validate value format matches property definition
 */
function validateFormat(
  value: unknown,
  propDef: PropertyDef,
  model: string,
  field: string,
  recordId?: string
): ValidationError | null {
  const format = propDef.format

  if (!format) return null

  switch (format) {
    case 'uuid':
      if (!checks.isUUID(value)) {
        return {
          type: 'format_invalid',
          model,
          field,
          message: `Expected UUID format but got "${value}"`,
          value,
          expected: 'uuid',
          recordId,
        }
      }
      break

    case 'email':
      if (!checks.isEmail(value)) {
        return {
          type: 'format_invalid',
          model,
          field,
          message: `Expected email format but got "${value}"`,
          value,
          expected: 'email',
          recordId,
        }
      }
      break

    case 'uri':
    case 'url':
      if (!checks.isURL(value)) {
        return {
          type: 'format_invalid',
          model,
          field,
          message: `Expected URL format but got "${value}"`,
          value,
          expected: 'url',
          recordId,
        }
      }
      break

    case 'date':
      if (!checks.isDate(value)) {
        return {
          type: 'format_invalid',
          model,
          field,
          message: `Expected date format (YYYY-MM-DD) but got "${value}"`,
          value,
          expected: 'date',
          recordId,
        }
      }
      break

    case 'date-time':
      if (!checks.isDateTime(value)) {
        return {
          type: 'format_invalid',
          model,
          field,
          message: `Expected datetime format (ISO 8601) but got "${value}"`,
          value,
          expected: 'date-time',
          recordId,
        }
      }
      break
  }

  return null
}

/**
 * Validate value against property constraints
 */
function validateConstraints(
  value: unknown,
  propDef: PropertyDef,
  model: string,
  field: string,
  recordId?: string
): ValidationError[] {
  const errors: ValidationError[] = []

  // String length constraints
  if (propDef.minLength !== undefined && !checks.hasMinLength(value, propDef.minLength)) {
    errors.push({
      type: 'constraint_violation',
      model,
      field,
      message: `String length must be at least ${propDef.minLength}`,
      value,
      expected: `minLength: ${propDef.minLength}`,
      recordId,
    })
  }

  if (propDef.maxLength !== undefined && !checks.hasMaxLength(value, propDef.maxLength)) {
    errors.push({
      type: 'constraint_violation',
      model,
      field,
      message: `String length must be at most ${propDef.maxLength}`,
      value,
      expected: `maxLength: ${propDef.maxLength}`,
      recordId,
    })
  }

  // Number constraints
  if (propDef.minimum !== undefined && !checks.hasMinimum(value, propDef.minimum)) {
    errors.push({
      type: 'constraint_violation',
      model,
      field,
      message: `Value must be at least ${propDef.minimum}`,
      value,
      expected: `minimum: ${propDef.minimum}`,
      recordId,
    })
  }

  if (propDef.maximum !== undefined && !checks.hasMaximum(value, propDef.maximum)) {
    errors.push({
      type: 'constraint_violation',
      model,
      field,
      message: `Value must be at most ${propDef.maximum}`,
      value,
      expected: `maximum: ${propDef.maximum}`,
      recordId,
    })
  }

  // Pattern constraint
  if (propDef.pattern && !checks.matchesPattern(value, propDef.pattern)) {
    errors.push({
      type: 'constraint_violation',
      model,
      field,
      message: `Value must match pattern: ${propDef.pattern}`,
      value,
      expected: `pattern: ${propDef.pattern}`,
      recordId,
    })
  }

  // Enum constraint
  if (propDef.enum && !checks.isInEnum(value, propDef.enum)) {
    errors.push({
      type: 'enum_invalid',
      model,
      field,
      message: `Value must be one of: ${propDef.enum.join(', ')}`,
      value,
      expected: propDef.enum.join(' | '),
      recordId,
    })
  }

  return errors
}

/**
 * Validate a reference to another model
 */
function validateReference(
  value: unknown,
  target: { model: string; field: string },
  model: string,
  field: string,
  recordId: string | undefined,
  idIndexes: Map<string, Set<string>>
): ValidationError | null {
  const targetIds = idIndexes.get(target.model)

  if (!targetIds) {
    // Target model doesn't exist in data - might be intentional
    return null
  }

  const valueStr = String(value)
  if (!targetIds.has(valueStr)) {
    return {
      type: 'missing_reference',
      model,
      field,
      message: `Reference to ${target.model}.${target.field} with value "${value}" does not exist`,
      value,
      expected: `Valid ${target.model} ID`,
      recordId,
    }
  }

  return null
}

/**
 * Validate a relationship from the schema
 */
function validateRelationship(
  relationship: Relationship,
  data: DemoData,
  idIndexes: Map<string, Set<string>>
): ValidationError[] {
  const errors: ValidationError[] = []
  const { from, to } = relationship

  const sourceData = data[from.model]
  if (!sourceData) return errors

  const targetIds = idIndexes.get(to.model)
  if (!targetIds) return errors

  for (const record of sourceData) {
    const obj = record as Record<string, unknown>
    const value = obj[from.field]

    if (value !== null && value !== undefined) {
      const valueStr = String(value)
      if (!targetIds.has(valueStr)) {
        errors.push({
          type: 'missing_reference',
          model: from.model,
          field: from.field,
          message: `${from.model}.${from.field} references non-existent ${to.model} with ID "${value}"`,
          value,
          expected: `Valid ${to.model}.${to.field}`,
          recordId: getRecordId(record),
        })
      }
    }
  }

  return errors
}

/**
 * Check for duplicate IDs within each model
 */
function checkDuplicateIds(data: DemoData): ValidationError[] {
  const errors: ValidationError[] = []

  for (const [modelName, records] of Object.entries(data)) {
    const seenIds = new Map<string, number>()

    for (let i = 0; i < records.length; i++) {
      const id = getRecordId(records[i])
      if (id) {
        const existingIndex = seenIds.get(id)
        if (existingIndex !== undefined) {
          errors.push({
            type: 'duplicate_id',
            model: modelName,
            field: 'id',
            message: `Duplicate ID "${id}" found at records ${existingIndex} and ${i}`,
            value: id,
          })
        } else {
          seenIds.set(id, i)
        }
      }
    }
  }

  return errors
}

/**
 * Validate timestamp ordering (e.g., createdAt <= updatedAt)
 */
export function validateTimestampOrder(
  data: DemoData,
  rules: Array<{ model: string; before: string; after: string }>
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const rule of rules) {
    const records = data[rule.model]
    if (!records) continue

    for (const record of records) {
      const obj = record as Record<string, unknown>
      const beforeValue = obj[rule.before]
      const afterValue = obj[rule.after]

      if (beforeValue && afterValue) {
        if (!checks.isBeforeOrEqual(beforeValue, afterValue)) {
          errors.push({
            type: 'timestamp_order',
            model: rule.model,
            field: rule.before,
            message: `${rule.before} (${beforeValue}) must be before or equal to ${rule.after} (${afterValue})`,
            value: beforeValue,
            expected: `<= ${afterValue}`,
            recordId: getRecordId(record),
          })
        }
      }
    }
  }

  return errors
}
