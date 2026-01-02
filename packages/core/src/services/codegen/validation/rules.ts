/**
 * Validation rule generation from DemokitSchema
 *
 * Automatically generates validation rules based on:
 * - Property types and formats
 * - Required fields
 * - Constraints (min/max, patterns)
 * - Relationships
 */

import type { DemokitSchema, DataModel, PropertyDef, Relationship } from '../../schema'
import type { ValidationRule, ValidationCheck, RuleGeneratorConfig } from '../types'

/**
 * Generate all validation rules from a schema
 */
export function generateRulesFromSchema(
  schema: DemokitSchema,
  config: RuleGeneratorConfig = {}
): ValidationRule[] {
  const {
    includeOptional = false,
    includeRelationships = true,
    includeFormats = true,
    customRules = [],
  } = config

  const rules: ValidationRule[] = []

  // Generate rules for each model
  for (const [modelName, model] of Object.entries(schema.models)) {
    const modelRules = generateModelRules(modelName, model, {
      includeOptional,
      includeFormats,
    })
    rules.push(...modelRules)
  }

  // Generate relationship rules
  if (includeRelationships) {
    for (const relationship of schema.relationships) {
      const relRule = generateRelationshipRule(relationship)
      rules.push(relRule)
    }
  }

  // Add timestamp ordering rules (common patterns)
  const timestampRules = generateTimestampRules(schema)
  rules.push(...timestampRules)

  // Add custom rules
  rules.push(...customRules)

  return rules
}

/**
 * Generate validation rules for a single model
 */
function generateModelRules(
  modelName: string,
  model: DataModel,
  options: { includeOptional: boolean; includeFormats: boolean }
): ValidationRule[] {
  const rules: ValidationRule[] = []

  if (!model.properties) return rules

  for (const [propName, propDef] of Object.entries(model.properties)) {
    const isRequired = model.required?.includes(propName) ?? propDef.required ?? false

    // Skip optional fields if not requested
    if (!isRequired && !options.includeOptional) {
      continue
    }

    // Type rule
    const typeRule = generateTypeRule(modelName, propName, propDef, isRequired)
    if (typeRule) {
      rules.push(typeRule)
    }

    // Format rule
    if (options.includeFormats && propDef.format) {
      const formatRule = generateFormatRule(modelName, propName, propDef)
      if (formatRule) {
        rules.push(formatRule)
      }
    }

    // Constraint rules
    const constraintRules = generateConstraintRules(modelName, propName, propDef)
    rules.push(...constraintRules)

    // Enum rule
    if (propDef.enum && propDef.enum.length > 0) {
      rules.push({
        id: `${modelName}.${propName}.enum`,
        model: modelName,
        field: propName,
        check: 'inEnum',
        target: JSON.stringify(propDef.enum),
        required: isRequired,
        message: `${propName} must be one of: ${propDef.enum.join(', ')}`,
      })
    }
  }

  return rules
}

/**
 * Generate type validation rule for a property
 */
function generateTypeRule(
  modelName: string,
  propName: string,
  propDef: PropertyDef,
  required: boolean
): ValidationRule | null {
  const checkMap: Record<string, ValidationCheck> = {
    string: 'isString',
    number: 'isNumber',
    integer: 'isInteger',
    boolean: 'isBoolean',
    array: 'isArray',
    object: 'isObject',
  }

  const check = checkMap[propDef.type]
  if (!check) return null

  return {
    id: `${modelName}.${propName}.type`,
    model: modelName,
    field: propName,
    check,
    required,
    message: `${propName} must be a ${propDef.type}`,
  }
}

/**
 * Generate format validation rule for a property
 */
function generateFormatRule(
  modelName: string,
  propName: string,
  propDef: PropertyDef
): ValidationRule | null {
  const formatMap: Record<string, ValidationCheck> = {
    uuid: 'isUUID',
    email: 'isEmail',
    uri: 'isURL',
    url: 'isURL',
    date: 'isDate',
    'date-time': 'isDateTime',
  }

  const format = propDef.format
  if (!format) return null

  const check = formatMap[format]
  if (!check) return null

  return {
    id: `${modelName}.${propName}.format`,
    model: modelName,
    field: propName,
    check,
    message: `${propName} must be a valid ${format}`,
  }
}

/**
 * Generate constraint validation rules for a property
 */
function generateConstraintRules(
  modelName: string,
  propName: string,
  propDef: PropertyDef
): ValidationRule[] {
  const rules: ValidationRule[] = []

  if (propDef.minLength !== undefined) {
    rules.push({
      id: `${modelName}.${propName}.minLength`,
      model: modelName,
      field: propName,
      check: 'minLength',
      target: String(propDef.minLength),
      message: `${propName} must have at least ${propDef.minLength} characters`,
    })
  }

  if (propDef.maxLength !== undefined) {
    rules.push({
      id: `${modelName}.${propName}.maxLength`,
      model: modelName,
      field: propName,
      check: 'maxLength',
      target: String(propDef.maxLength),
      message: `${propName} must have at most ${propDef.maxLength} characters`,
    })
  }

  if (propDef.minimum !== undefined) {
    rules.push({
      id: `${modelName}.${propName}.minimum`,
      model: modelName,
      field: propName,
      check: 'minimum',
      target: String(propDef.minimum),
      message: `${propName} must be at least ${propDef.minimum}`,
    })
  }

  if (propDef.maximum !== undefined) {
    rules.push({
      id: `${modelName}.${propName}.maximum`,
      model: modelName,
      field: propName,
      check: 'maximum',
      target: String(propDef.maximum),
      message: `${propName} must be at most ${propDef.maximum}`,
    })
  }

  if (propDef.pattern) {
    rules.push({
      id: `${modelName}.${propName}.pattern`,
      model: modelName,
      field: propName,
      check: 'pattern',
      target: propDef.pattern,
      message: `${propName} must match pattern: ${propDef.pattern}`,
    })
  }

  return rules
}

/**
 * Generate referential integrity rule for a relationship
 */
function generateRelationshipRule(relationship: Relationship): ValidationRule {
  const { from, to } = relationship

  return {
    id: `${from.model}.${from.field}.ref`,
    model: from.model,
    field: from.field,
    check: 'existsIn',
    target: `${to.model}.${to.field}`,
    required: relationship.required,
    message: `${from.field} must reference a valid ${to.model}`,
  }
}

/**
 * Generate timestamp ordering rules (common patterns)
 */
function generateTimestampRules(schema: DemokitSchema): ValidationRule[] {
  const rules: ValidationRule[] = []

  // Common timestamp pairs to validate
  const timestampPairs = [
    ['createdAt', 'updatedAt'],
    ['created_at', 'updated_at'],
    ['startDate', 'endDate'],
    ['start_date', 'end_date'],
    ['startTime', 'endTime'],
    ['start_time', 'end_time'],
  ]

  for (const [modelName, model] of Object.entries(schema.models)) {
    if (!model.properties) continue

    const propNames = Object.keys(model.properties)

    for (const pair of timestampPairs) {
      const before = pair[0]
      const after = pair[1]
      if (!before || !after) continue
      if (propNames.includes(before) && propNames.includes(after)) {
        rules.push({
          id: `${modelName}.${before}.beforeOrEqual.${after}`,
          model: modelName,
          field: before,
          check: 'beforeOrEqual',
          target: after,
          message: `${before} must be before or equal to ${after}`,
        })
      }
    }
  }

  return rules
}

/**
 * Get a human-readable description of a rule
 */
export function describeRule(rule: ValidationRule): string {
  const prefix = rule.required ? '[Required] ' : ''

  switch (rule.check) {
    case 'isString':
      return `${prefix}${rule.model}.${rule.field} must be a string`
    case 'isNumber':
      return `${prefix}${rule.model}.${rule.field} must be a number`
    case 'isInteger':
      return `${prefix}${rule.model}.${rule.field} must be an integer`
    case 'isBoolean':
      return `${prefix}${rule.model}.${rule.field} must be a boolean`
    case 'isArray':
      return `${prefix}${rule.model}.${rule.field} must be an array`
    case 'isObject':
      return `${prefix}${rule.model}.${rule.field} must be an object`
    case 'isUUID':
      return `${prefix}${rule.model}.${rule.field} must be a valid UUID`
    case 'isEmail':
      return `${prefix}${rule.model}.${rule.field} must be a valid email`
    case 'isURL':
      return `${prefix}${rule.model}.${rule.field} must be a valid URL`
    case 'isISO8601':
    case 'isDateTime':
      return `${prefix}${rule.model}.${rule.field} must be a valid ISO 8601 datetime`
    case 'isDate':
      return `${prefix}${rule.model}.${rule.field} must be a valid date (YYYY-MM-DD)`
    case 'existsIn':
      return `${prefix}${rule.model}.${rule.field} must reference a valid ${rule.target}`
    case 'beforeOrEqual':
      return `${prefix}${rule.model}.${rule.field} must be before or equal to ${rule.target}`
    case 'inEnum':
      return `${prefix}${rule.model}.${rule.field} must be one of: ${rule.target}`
    default:
      return `${prefix}${rule.model}.${rule.field}: ${rule.check}`
  }
}

/**
 * Group rules by model for easier inspection
 */
export function groupRulesByModel(
  rules: ValidationRule[]
): Record<string, ValidationRule[]> {
  const grouped: Record<string, ValidationRule[]> = {}

  for (const rule of rules) {
    const modelRules = grouped[rule.model]
    if (!modelRules) {
      grouped[rule.model] = [rule]
    } else {
      modelRules.push(rule)
    }
  }

  return grouped
}

/**
 * Filter rules to get only relationship rules
 */
export function getRelationshipRules(rules: ValidationRule[]): ValidationRule[] {
  return rules.filter((rule) => rule.check === 'existsIn')
}

/**
 * Filter rules to get only required field rules
 */
export function getRequiredFieldRules(rules: ValidationRule[]): ValidationRule[] {
  return rules.filter((rule) => rule.required)
}
