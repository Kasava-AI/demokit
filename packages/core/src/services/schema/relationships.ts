/**
 * Relationship detection for DemoKit schemas
 *
 * Detects relationships between models using:
 * 1. Explicit $ref references in OpenAPI
 * 2. Naming conventions (userId -> User.id)
 * 3. x-demokit-relationship extension
 */

import type {
  DataModel,
  PropertyDef,
  Relationship,
  RelationshipTarget,
  RelationshipDetectionMethod,
  RelationshipType,
} from './types'
import { isSchemaRef, extractRefName } from './types'

/**
 * Common ID field naming patterns
 * Maps suffix patterns to implied relationships
 */
const ID_FIELD_PATTERNS = [
  // Standard patterns: userId -> User, customerId -> Customer
  { pattern: /^(.+)Id$/, targetField: 'id' },
  { pattern: /^(.+)_id$/, targetField: 'id' },
  { pattern: /^(.+)ID$/, targetField: 'id' },

  // UUID patterns: userUuid -> User, customerUUID -> Customer
  { pattern: /^(.+)Uuid$/, targetField: 'uuid' },
  { pattern: /^(.+)UUID$/, targetField: 'uuid' },
  { pattern: /^(.+)_uuid$/, targetField: 'uuid' },
]

/**
 * Convert a field name prefix to a model name
 * @example "user" -> "User", "orderItem" -> "OrderItem"
 */
function prefixToModelName(prefix: string): string {
  return prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

/**
 * Check if a property looks like a foreign key based on naming conventions
 */
export function detectRelationshipFromNaming(
  property: PropertyDef,
  availableModels: Set<string>
): RelationshipTarget | null {
  const fieldName = property.name

  for (const { pattern, targetField } of ID_FIELD_PATTERNS) {
    const match = fieldName.match(pattern)
    if (match && match[1]) {
      const prefix = match[1]
      const modelName = prefixToModelName(prefix)

      // Check if this model exists in the schema
      if (availableModels.has(modelName)) {
        return { model: modelName, field: targetField }
      }

      // Also check for plural forms
      const pluralModel = modelName + 's'
      if (availableModels.has(pluralModel)) {
        return { model: pluralModel, field: targetField }
      }
    }
  }

  return null
}

/**
 * Check if a property has an explicit x-demokit-relationship extension
 */
export function detectRelationshipFromExtension(
  property: PropertyDef
): RelationshipTarget | null {
  const extension = property['x-demokit-relationship']
  if (extension && typeof extension === 'object') {
    return {
      model: extension.model,
      field: extension.field || 'id',
    }
  }
  return null
}

/**
 * Check if a property is a $ref to another model
 */
export function detectRelationshipFromRef(
  property: PropertyDef,
  availableModels: Set<string>
): RelationshipTarget | null {
  if (property.$ref) {
    const modelName = extractRefName(property.$ref)
    if (availableModels.has(modelName)) {
      return { model: modelName, field: 'id' }
    }
  }

  // Check if items is a $ref (for arrays of references)
  if (property.items && isSchemaRef(property.items)) {
    const modelName = extractRefName(property.items.$ref)
    if (availableModels.has(modelName)) {
      return { model: modelName, field: 'id' }
    }
  }

  return null
}

/**
 * Detect the relationship type based on property and target
 */
function determineRelationshipType(
  property: PropertyDef,
  _fromModel: DataModel
): RelationshipType {
  // If the property is an array, it's one-to-many or many-to-many
  if (property.type === 'array') {
    // For simplicity, treat array references as one-to-many
    // (the "one" side has the array of references)
    return 'one-to-many'
  }

  // Single reference is many-to-one (many records can reference one target)
  return 'many-to-one'
}

/**
 * Detect all relationships in a set of models
 */
export function detectRelationships(
  models: Record<string, DataModel>
): Relationship[] {
  const relationships: Relationship[] = []
  const availableModels = new Set(Object.keys(models))

  for (const [modelName, model] of Object.entries(models)) {
    if (!model.properties) continue

    for (const [propName, property] of Object.entries(model.properties)) {
      let target: RelationshipTarget | null = null
      let detectionMethod: RelationshipDetectionMethod = 'inferred'

      // Priority 1: Explicit x-demokit-relationship extension
      target = detectRelationshipFromExtension(property)
      if (target) {
        detectionMethod = 'x-demokit-extension'
      }

      // Priority 2: $ref references
      if (!target) {
        target = detectRelationshipFromRef(property, availableModels)
        if (target) {
          detectionMethod = 'explicit-ref'
        }
      }

      // Priority 3: Naming conventions
      if (!target) {
        target = detectRelationshipFromNaming(property, availableModels)
        if (target) {
          detectionMethod = 'naming-convention'
        }
      }

      if (target) {
        // Don't create self-referential relationships for simple IDs
        if (target.model === modelName && target.field === 'id' && propName === 'id') {
          continue
        }

        // Add the detected relationship info to the property
        property.relationshipTo = target

        relationships.push({
          from: { model: modelName, field: propName },
          to: target,
          type: determineRelationshipType(property, model),
          required: property.required ?? false,
          detectedBy: detectionMethod,
        })
      }
    }
  }

  return relationships
}

/**
 * Find all relationships for a specific model
 */
export function getRelationshipsForModel(
  modelName: string,
  relationships: Relationship[]
): {
  outgoing: Relationship[]
  incoming: Relationship[]
} {
  return {
    outgoing: relationships.filter(r => r.from.model === modelName),
    incoming: relationships.filter(r => r.to.model === modelName),
  }
}

/**
 * Check if a model is referenced by other models
 */
export function isModelReferenced(
  modelName: string,
  relationships: Relationship[]
): boolean {
  return relationships.some(r => r.to.model === modelName)
}

/**
 * Get the dependency order for models based on relationships
 * Returns models in order such that dependencies come before dependents
 */
export function getModelDependencyOrder(
  models: Record<string, DataModel>,
  relationships: Relationship[]
): string[] {
  const modelNames = Object.keys(models)
  const visited = new Set<string>()
  const order: string[] = []

  function visit(name: string, path: Set<string> = new Set()) {
    if (visited.has(name)) return
    if (path.has(name)) {
      // Circular dependency - skip to break the cycle
      return
    }

    path.add(name)

    // Visit all models that this model depends on first
    const deps = relationships
      .filter(r => r.from.model === name)
      .map(r => r.to.model)
      .filter(dep => modelNames.includes(dep))

    for (const dep of deps) {
      visit(dep, new Set(path))
    }

    if (!visited.has(name)) {
      visited.add(name)
      order.push(name)
    }
  }

  for (const name of modelNames) {
    visit(name)
  }

  return order
}
