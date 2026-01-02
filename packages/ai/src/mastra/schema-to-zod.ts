/**
 * Schema to Zod Conversion
 *
 * Converts DemokitSchema models to Zod schemas for Mastra's structured output.
 * This ensures AI-generated data matches the parsed OpenAPI spec exactly.
 *
 * Features:
 * - Full recursive support for nested objects and arrays
 * - All property types (string, number, integer, boolean, array, object)
 * - Format validators (email, uuid, url, date-time, date)
 * - Constraints (min/max, length, pattern, enum)
 * - Nullable and optional field handling
 * - Schema reference ($ref) resolution
 *
 * @module
 */

import { z } from 'zod'
import type {
  DemokitSchema,
  DataModel,
  PropertyDef,
  SchemaRef,
  RelationshipTarget,
} from '@demokit-ai/core'
import { isSchemaRef, extractRefName } from '@demokit-ai/core'

// ============================================================================
// Types
// ============================================================================

/**
 * Information about a UUID field that needs to be injected after AI generation
 */
export interface UuidFieldInfo {
  /** Field name */
  fieldName: string
  /** Whether this is a primary ID field (not a foreign key) */
  isPrimaryId: boolean
  /** If this is a foreign key, the target model and field */
  relationshipTo?: RelationshipTarget
}

/**
 * Map of model names to their UUID fields
 * Used to inject valid UUIDs after AI generation
 */
export type UuidFieldMap = Record<string, UuidFieldInfo[]>

/**
 * Context passed through recursive schema building
 * Contains the full schema for resolving $ref references
 */
interface SchemaContext {
  /** The full DemokitSchema for resolving references */
  schema: DemokitSchema
  /** Track visited models to prevent infinite recursion */
  visited: Set<string>
  /** Maximum recursion depth (safety limit) */
  maxDepth: number
  /** Current depth */
  currentDepth: number
  /** Collect UUID fields for post-processing */
  uuidFields: UuidFieldMap
  /** Current model being processed (for tracking UUID fields) */
  currentModel?: string
}

/**
 * Create a new schema context
 */
function createContext(schema: DemokitSchema): SchemaContext {
  return {
    schema,
    visited: new Set(),
    maxDepth: 10,
    currentDepth: 0,
    uuidFields: {},
  }
}

/**
 * Clone context with incremented depth
 */
function incrementDepth(ctx: SchemaContext): SchemaContext {
  return {
    ...ctx,
    currentDepth: ctx.currentDepth + 1,
  }
}

// ============================================================================
// Model to Zod Conversion
// ============================================================================

/**
 * Convert a DemokitSchema model to a Zod schema
 *
 * Handles:
 * - All property types (string, number, integer, boolean, array, object)
 * - Format validators (email, uuid, url, date-time)
 * - Constraints (min/max, length, pattern, enum)
 * - Nullable fields
 * - Required vs optional fields
 * - Nested objects and arrays (recursive)
 * - Schema references ($ref)
 *
 * @param model - DataModel from DemokitSchema
 * @param ctx - Optional schema context for reference resolution
 * @returns Zod object schema matching the model
 *
 * @example
 * ```typescript
 * const userModel = schema.models['User']
 * const UserSchema = modelToZodSchema(userModel)
 *
 * // Now AI output must match:
 * // { id: string (uuid), email: string (email), name: string }
 * ```
 */
export function modelToZodSchema(
  model: DataModel,
  ctx?: SchemaContext
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  // Set current model in context for UUID field tracking
  const modelCtx = ctx ? { ...ctx, currentModel: model.name } : undefined

  for (const [fieldName, prop] of Object.entries(model.properties || {})) {
    let fieldSchema = propertyToZodType(prop, fieldName, modelCtx)

    // Make optional if not in required list
    // Note: UUID fields are always made optional regardless of required status
    if (!model.required?.includes(fieldName)) {
      fieldSchema = fieldSchema.optional()
    }

    shape[fieldName] = fieldSchema
  }

  return z.object(shape)
}

/**
 * Convert a PropertyDef to a Zod type
 *
 * Recursively handles nested types (arrays of objects, nested objects, etc.)
 *
 * @param prop - Property definition
 * @param fieldName - Name of the field (for UUID tracking)
 * @param ctx - Optional schema context for reference resolution
 * @returns Zod type matching the property
 */
function propertyToZodType(prop: PropertyDef, fieldName?: string, ctx?: SchemaContext): z.ZodTypeAny {
  let schema: z.ZodTypeAny

  switch (prop.type) {
    case 'string':
      schema = buildStringSchema(prop, fieldName, ctx)
      break

    case 'number':
      schema = buildNumberSchema(prop, false)
      break

    case 'integer':
      schema = buildNumberSchema(prop, true)
      break

    case 'boolean':
      schema = z.boolean()
      break

    case 'array':
      schema = buildArraySchema(prop, ctx)
      break

    case 'object':
      schema = buildObjectSchema(prop, ctx)
      break

    case 'null':
      schema = z.null()
      break

    default:
      // For any unrecognized type, use a permissive record
      // This is safer than z.unknown() as it still enforces object structure
      schema = z.record(z.string(), z.any())
  }

  // Handle nullable
  if (prop.nullable) {
    schema = schema.nullable()
  }

  return schema
}

/**
 * Build a Zod string schema with format and constraints
 *
 * For UUID fields:
 * - Makes them optional (AI doesn't need to generate them)
 * - Tracks them in context for post-processing UUID injection
 *
 * @param prop - Property definition
 * @param fieldName - Name of the field (for UUID tracking)
 * @param ctx - Schema context for UUID field tracking
 */
function buildStringSchema(prop: PropertyDef, fieldName?: string, ctx?: SchemaContext): z.ZodTypeAny {
  // Handle enums first (they're a special case)
  if (prop.enum && prop.enum.length > 0) {
    const enumValues = prop.enum.filter((v): v is string => typeof v === 'string')
    if (enumValues.length >= 2) {
      return z.enum(enumValues as [string, ...string[]])
    } else if (enumValues.length === 1) {
      return z.literal(enumValues[0])
    }
  }

  let schema: z.ZodTypeAny = z.string()

  // Apply format validators
  switch (prop.format) {
    case 'email':
      schema = z.string().email()
      break
    case 'uuid':
      // UUID fields are made optional - we'll inject real UUIDs after AI generation
      // Track this field for post-processing
      if (ctx?.currentModel && fieldName) {
        if (!ctx.uuidFields[ctx.currentModel]) {
          ctx.uuidFields[ctx.currentModel] = []
        }

        // Determine if this is a primary ID or a foreign key
        const isPrimaryId = fieldName === 'id' || fieldName === 'ID' || fieldName === '_id'
        const relationshipTo = prop.relationshipTo || prop['x-demokit-relationship']

        ctx.uuidFields[ctx.currentModel].push({
          fieldName,
          isPrimaryId,
          relationshipTo,
        })
      }
      // Make UUID fields optional - AI doesn't generate them
      schema = z.string().optional()
      break
    case 'uri':
    case 'url':
      schema = z.string().url()
      break
    case 'date-time':
      schema = z.string().datetime({ offset: true })
      break
    case 'date':
      schema = z.string().date()
      break
    // Add more formats as needed
  }

  // Apply length constraints (only for non-optional string schemas)
  if (prop.format !== 'uuid') {
    if (prop.minLength !== undefined) {
      schema = (schema as z.ZodString).min(prop.minLength)
    }
    if (prop.maxLength !== undefined) {
      schema = (schema as z.ZodString).max(prop.maxLength)
    }

    // Apply pattern
    if (prop.pattern) {
      try {
        schema = (schema as z.ZodString).regex(new RegExp(prop.pattern))
      } catch {
        // Invalid regex, skip it
      }
    }
  }

  return schema
}

/**
 * Build a Zod number schema with constraints
 */
function buildNumberSchema(prop: PropertyDef, isInteger: boolean): z.ZodNumber {
  let schema = z.number()

  if (isInteger) {
    schema = schema.int()
  }

  if (prop.minimum !== undefined) {
    schema = schema.min(prop.minimum)
  }
  if (prop.maximum !== undefined) {
    schema = schema.max(prop.maximum)
  }

  return schema
}

/**
 * Build a Zod array schema with full item type support
 *
 * Handles:
 * - Arrays of primitives (string[], number[], etc.)
 * - Arrays of objects with nested properties
 * - Arrays of $ref references to other models
 * - Min/max items constraints
 *
 * @param prop - Property definition with items schema
 * @param ctx - Schema context for reference resolution
 * @returns Zod array schema with proper item type
 */
function buildArraySchema(prop: PropertyDef, ctx?: SchemaContext): z.ZodArray<z.ZodTypeAny> {
  const itemSchema = buildItemSchema(prop.items, ctx)
  const schema = z.array(itemSchema)

  // Apply array constraints if present (from OpenAPI minItems/maxItems)
  // Note: These aren't in PropertyDef currently but could be added
  // if (prop.minItems !== undefined) schema = schema.min(prop.minItems)
  // if (prop.maxItems !== undefined) schema = schema.max(prop.maxItems)

  return schema
}

/**
 * Build a Zod schema for array items or nested schemas
 *
 * This is the core recursive function that handles:
 * - SchemaRef ($ref to another model)
 * - Inline DataModel (nested object definition)
 * - undefined (fallback to permissive record)
 *
 * @param items - The items schema (SchemaRef, DataModel, or undefined)
 * @param ctx - Schema context for reference resolution
 * @returns Zod schema for the items
 */
function buildItemSchema(
  items: SchemaRef | DataModel | undefined,
  ctx?: SchemaContext
): z.ZodTypeAny {
  // No items definition - use permissive record as fallback
  if (!items) {
    return z.record(z.string(), z.any())
  }

  // Check for $ref reference
  if (isSchemaRef(items)) {
    return resolveSchemaRef(items, ctx)
  }

  // It's an inline DataModel - convert based on its type
  return dataModelToZodType(items, ctx)
}

/**
 * Resolve a $ref schema reference to a Zod type
 *
 * Looks up the referenced model in the schema context and converts it.
 * Handles circular references by tracking visited models.
 *
 * @param ref - Schema reference with $ref property
 * @param ctx - Schema context containing the full schema
 * @returns Zod schema for the referenced model
 */
function resolveSchemaRef(ref: SchemaRef, ctx?: SchemaContext): z.ZodTypeAny {
  const modelName = extractRefName(ref.$ref)

  // No context - can't resolve reference
  if (!ctx) {
    // Return a permissive object schema as fallback
    return z.record(z.string(), z.any())
  }

  // Check for circular reference
  if (ctx.visited.has(modelName)) {
    // Return a lazy schema to handle circular refs
    return z.lazy(() => z.record(z.string(), z.any()))
  }

  // Check depth limit
  if (ctx.currentDepth >= ctx.maxDepth) {
    return z.record(z.string(), z.any())
  }

  // Look up the model
  const model = ctx.schema.models[modelName]
  if (!model) {
    // Referenced model not found - use permissive fallback
    return z.record(z.string(), z.any())
  }

  // Mark as visited and recurse
  const newVisited = new Set(ctx.visited)
  newVisited.add(modelName)
  const newCtx = incrementDepth({
    ...ctx,
    visited: newVisited,
  })

  return dataModelToZodType(model, newCtx)
}

/**
 * Convert a DataModel to a Zod type based on its type property
 *
 * Handles all model types: object, array, string, number, integer, boolean
 *
 * @param model - DataModel to convert
 * @param ctx - Schema context for nested reference resolution
 * @returns Zod schema matching the model
 */
function dataModelToZodType(model: DataModel, ctx?: SchemaContext): z.ZodTypeAny {
  switch (model.type) {
    case 'object':
      return buildObjectFromModel(model, ctx)

    case 'array':
      // Array model - recurse into items
      return z.array(buildItemSchema(model.items, ctx))

    case 'string':
      // String model (possibly enum)
      if (model.enum && model.enum.length > 0) {
        const enumValues = model.enum.filter((v): v is string => typeof v === 'string')
        if (enumValues.length >= 2) {
          return z.enum(enumValues as [string, ...string[]])
        } else if (enumValues.length === 1) {
          return z.literal(enumValues[0])
        }
      }
      return z.string()

    case 'number':
      return z.number()

    case 'integer':
      return z.number().int()

    case 'boolean':
      return z.boolean()

    case 'null':
      return z.null()

    default:
      return z.record(z.string(), z.any())
  }
}

/**
 * Build a Zod object schema from a DataModel
 *
 * @param model - DataModel with properties
 * @param ctx - Schema context for nested reference resolution
 * @returns Zod object schema
 */
function buildObjectFromModel(
  model: DataModel,
  ctx?: SchemaContext
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  // Set current model in context for UUID field tracking
  const modelCtx = ctx ? { ...ctx, currentModel: model.name } : undefined

  for (const [fieldName, prop] of Object.entries(model.properties || {})) {
    let fieldSchema = propertyToZodType(prop, fieldName, modelCtx)

    // Make optional if not in required list
    if (!model.required?.includes(fieldName)) {
      fieldSchema = fieldSchema.optional()
    }

    shape[fieldName] = fieldSchema
  }

  return z.object(shape)
}

/**
 * Build a Zod object schema from a PropertyDef
 *
 * Handles inline object definitions within properties.
 * This is different from buildObjectFromModel which handles top-level models.
 *
 * @param prop - Property definition with nested properties
 * @param ctx - Schema context for reference resolution
 * @returns Zod object schema
 */
function buildObjectSchema(
  prop: PropertyDef,
  ctx?: SchemaContext
): z.ZodTypeAny {
  // Check if this property has a $ref
  if (prop.$ref) {
    return resolveSchemaRef({ $ref: prop.$ref }, ctx)
  }

  // Check if items is set (sometimes object properties use items for nested schema)
  if (prop.items) {
    return buildItemSchema(prop.items, ctx)
  }

  // No nested structure defined - use permissive record
  // This handles cases like { type: 'object' } with no properties
  return z.record(z.string(), z.any())
}

// ============================================================================
// Complete Schema Conversion
// ============================================================================

/**
 * Result of creating a demo data schema
 * Includes both the Zod schema and metadata about UUID fields
 */
export interface DemoDataSchemaResult {
  /** Zod schema for structured output validation */
  zodSchema: z.ZodObject<Record<string, z.ZodTypeAny>>
  /** Map of model names to their UUID fields for post-processing */
  uuidFields: UuidFieldMap
}

/**
 * Create a Zod schema for complete demo data output
 *
 * Generates a schema that expects:
 * ```json
 * {
 *   "ModelName": [{ ...record }, { ...record }],
 *   "AnotherModel": [{ ...record }]
 * }
 * ```
 *
 * This function creates a schema context that enables:
 * - Full recursive support for nested objects and arrays
 * - Resolution of $ref references to other models
 * - Circular reference detection and handling
 * - Depth limiting to prevent infinite recursion
 * - UUID field tracking for post-generation injection
 *
 * @param schema - Complete DemokitSchema
 * @returns Object containing Zod schema and UUID field map
 *
 * @example
 * ```typescript
 * const schema = await importFromOpenAPI('./openapi.yaml')
 * const { zodSchema, uuidFields } = createDemoDataSchema(schema)
 *
 * const result = await agent.generate(prompt, { output: zodSchema })
 * // Post-process to inject UUIDs using uuidFields map
 * ```
 */
export function createDemoDataSchema(
  schema: DemokitSchema
): DemoDataSchemaResult {
  const shape: Record<string, z.ZodTypeAny> = {}

  // Create context for reference resolution and UUID tracking
  const ctx = createContext(schema)

  for (const [modelName, model] of Object.entries(schema.models)) {
    // Skip non-object models (primitives, enums)
    if (model.type !== 'object' || !model.properties) {
      continue
    }

    // Pass context to enable nested schema resolution and UUID tracking
    const modelSchema = modelToZodSchema(model, ctx)
    shape[modelName] = z.array(modelSchema)
  }

  return {
    zodSchema: z.object(shape),
    uuidFields: ctx.uuidFields,
  }
}

/**
 * Create a partial Zod schema that allows missing models
 *
 * Useful when you want to generate data for only some models.
 * Each model array is optional, allowing partial data generation.
 *
 * @param schema - Complete DemokitSchema
 * @returns Zod schema with optional model arrays
 */
export function createPartialDemoDataSchema(
  schema: DemokitSchema
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  // Create context for reference resolution
  const ctx = createContext(schema)

  for (const [modelName, model] of Object.entries(schema.models)) {
    if (model.type !== 'object' || !model.properties) {
      continue
    }

    // Pass context to enable nested schema resolution
    const modelSchema = modelToZodSchema(model, ctx)
    shape[modelName] = z.array(modelSchema).optional()
  }

  return z.object(shape)
}

// ============================================================================
// UUID Injection
// ============================================================================

/**
 * Type for demo data - record of model names to arrays of records
 */
type DemoData = Record<string, Record<string, unknown>[]>

/**
 * Inject valid UUIDs into AI-generated demo data
 *
 * This function post-processes AI output to:
 * 1. Generate real UUIDs for primary ID fields
 * 2. Build a mapping of model -> record index -> UUID
 * 3. Assign foreign key UUIDs based on relationships
 *
 * @param data - AI-generated demo data (with optional/missing UUID fields)
 * @param uuidFields - Map of UUID fields from createDemoDataSchema
 * @returns Data with valid UUIDs injected
 *
 * @example
 * ```typescript
 * const { zodSchema, uuidFields } = createDemoDataSchema(schema)
 * const result = await agent.generate(prompt, { output: zodSchema })
 * const dataWithUuids = injectUuids(result.object, uuidFields)
 * ```
 */
export function injectUuids(
  data: DemoData,
  uuidFields: UuidFieldMap
): DemoData {
  // Step 1: Generate UUIDs for all primary ID fields and build mapping
  const uuidMappings: Record<string, string[]> = {}

  for (const [modelName, records] of Object.entries(data)) {
    const fields = uuidFields[modelName] || []
    const primaryIdFields = fields.filter(f => f.isPrimaryId)

    if (primaryIdFields.length === 0) {
      continue
    }

    // Generate UUIDs for each record's primary ID
    uuidMappings[modelName] = []
    for (let i = 0; i < records.length; i++) {
      const uuid = crypto.randomUUID()
      uuidMappings[modelName].push(uuid)

      // Inject UUID into all primary ID fields
      for (const field of primaryIdFields) {
        records[i][field.fieldName] = uuid
      }
    }
  }

  // Step 2: Assign foreign key UUIDs based on relationships
  for (const [modelName, records] of Object.entries(data)) {
    const fields = uuidFields[modelName] || []
    const foreignKeyFields = fields.filter(f => !f.isPrimaryId && f.relationshipTo)

    for (const field of foreignKeyFields) {
      const targetModel = field.relationshipTo!.model
      const targetUuids = uuidMappings[targetModel]

      if (!targetUuids || targetUuids.length === 0) {
        // No target UUIDs available, generate a random one as fallback
        for (const record of records) {
          record[field.fieldName] = crypto.randomUUID()
        }
        continue
      }

      // Assign UUIDs from target model (round-robin distribution)
      for (let i = 0; i < records.length; i++) {
        const targetIndex = i % targetUuids.length
        records[i][field.fieldName] = targetUuids[targetIndex]
      }
    }

    // Handle UUID fields without explicit relationships (standalone UUIDs)
    const standaloneUuidFields = fields.filter(f => !f.isPrimaryId && !f.relationshipTo)
    for (const field of standaloneUuidFields) {
      for (const record of records) {
        record[field.fieldName] = crypto.randomUUID()
      }
    }
  }

  return data
}
