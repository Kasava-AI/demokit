/**
 * Core types for DemoKit schema representation
 *
 * These types represent a parsed API schema with relationship detection,
 * independent of the source format (OpenAPI, GraphQL, etc.)
 */

/**
 * The main schema representation for DemoKit
 * Contains all information needed for fixture generation
 */
export interface DemokitSchema {
  /**
   * Metadata about the API
   */
  info: SchemaInfo

  /**
   * All API endpoints discovered from the spec
   */
  endpoints: Endpoint[]

  /**
   * All data models (schemas) from the spec
   */
  models: Record<string, DataModel>

  /**
   * Detected relationships between models
   */
  relationships: Relationship[]
}

/**
 * API metadata
 */
export interface SchemaInfo {
  /**
   * API title from the spec
   */
  title: string

  /**
   * API version
   */
  version: string

  /**
   * Optional description
   */
  description?: string

  /**
   * Base URL for the API (if specified)
   */
  baseUrl?: string
}

/**
 * An API endpoint
 */
export interface Endpoint {
  /**
   * HTTP method (GET, POST, PUT, PATCH, DELETE)
   */
  method: HttpMethod

  /**
   * URL path with parameter placeholders
   * @example "/users/{id}" or "/orders/{orderId}/items"
   */
  path: string

  /**
   * Operation ID from OpenAPI (if available)
   */
  operationId?: string

  /**
   * Human-readable summary
   */
  summary?: string

  /**
   * Detailed description
   */
  description?: string

  /**
   * Path parameters
   */
  pathParams: ParameterDef[]

  /**
   * Query parameters
   */
  queryParams: ParameterDef[]

  /**
   * Request body schema (for POST/PUT/PATCH)
   */
  requestBody?: RequestBody

  /**
   * Response schemas by status code
   */
  responses: Record<string, ResponseDef>

  /**
   * Tags for grouping endpoints
   */
  tags: string[]
}

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * A request or response body definition
 */
export interface RequestBody {
  /**
   * Content type (usually application/json)
   */
  contentType: string

  /**
   * Reference to the model name, or inline schema
   */
  schema: SchemaRef | DataModel

  /**
   * Whether the body is required
   */
  required: boolean

  /**
   * Description of the body
   */
  description?: string
}

/**
 * A response definition
 */
export interface ResponseDef {
  /**
   * HTTP status code
   */
  statusCode: string

  /**
   * Description of the response
   */
  description?: string

  /**
   * Content type to schema mapping
   */
  content?: Record<string, SchemaRef | DataModel>
}

/**
 * A parameter definition (path or query)
 */
export interface ParameterDef {
  /**
   * Parameter name
   */
  name: string

  /**
   * Where the parameter is located
   */
  in: 'path' | 'query' | 'header' | 'cookie'

  /**
   * Whether the parameter is required
   */
  required: boolean

  /**
   * Parameter type
   */
  type: PropertyType

  /**
   * Optional format hint
   */
  format?: string

  /**
   * Description
   */
  description?: string

  /**
   * Example value
   */
  example?: unknown
}

/**
 * Reference to another schema/model
 */
export interface SchemaRef {
  /**
   * The referenced model name
   */
  $ref: string
}

/**
 * A data model representing an object schema
 */
export interface DataModel {
  /**
   * Model name (from the schema component name)
   */
  name: string

  /**
   * The type of this model
   */
  type: ModelType

  /**
   * Description from the spec
   */
  description?: string

  /**
   * Properties for object types
   */
  properties?: Record<string, PropertyDef>

  /**
   * Required property names
   */
  required?: string[]

  /**
   * For array types, the item schema
   */
  items?: SchemaRef | DataModel

  /**
   * Enum values for enum types
   */
  enum?: unknown[]

  /**
   * Example value from the spec
   */
  example?: unknown

  /**
   * Additional properties schema (for dictionaries)
   */
  additionalProperties?: boolean | SchemaRef | DataModel
}

/**
 * Model types
 */
export type ModelType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null'

/**
 * A property definition within a model
 */
export interface PropertyDef {
  /**
   * Property name
   */
  name: string

  /**
   * Property type
   */
  type: PropertyType

  /**
   * Format hint (uuid, email, date-time, etc.)
   */
  format?: string

  /**
   * Description
   */
  description?: string

  /**
   * Whether this property is required
   */
  required?: boolean

  /**
   * Whether this property is nullable
   */
  nullable?: boolean

  /**
   * Enum values for string enums
   */
  enum?: unknown[]

  /**
   * For array types, the item schema
   */
  items?: SchemaRef | DataModel

  /**
   * Reference to another model (for $ref properties)
   */
  $ref?: string

  /**
   * Example value
   */
  example?: unknown

  /**
   * Default value
   */
  default?: unknown

  /**
   * Minimum value (for numbers)
   */
  minimum?: number

  /**
   * Maximum value (for numbers)
   */
  maximum?: number

  /**
   * Min length (for strings)
   */
  minLength?: number

  /**
   * Max length (for strings)
   */
  maxLength?: number

  /**
   * Pattern (regex for strings)
   */
  pattern?: string

  /**
   * Detected relationship to another model
   * Set by relationship detection, not directly from spec
   */
  relationshipTo?: RelationshipTarget

  /**
   * Custom extension for explicit relationship hints
   * @example "x-demokit-relationship": { "model": "User", "field": "id" }
   */
  'x-demokit-relationship'?: RelationshipTarget
}

/**
 * Property types
 */
export type PropertyType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'

/**
 * A detected relationship between two models
 */
export interface Relationship {
  /**
   * The source side of the relationship
   */
  from: RelationshipSide

  /**
   * The target side of the relationship
   */
  to: RelationshipSide

  /**
   * Type of relationship
   */
  type: RelationshipType

  /**
   * Whether the relationship is required (not nullable)
   */
  required: boolean

  /**
   * How this relationship was detected
   */
  detectedBy: RelationshipDetectionMethod
}

/**
 * One side of a relationship
 */
export interface RelationshipSide {
  /**
   * Model name
   */
  model: string

  /**
   * Field name
   */
  field: string
}

/**
 * Target for a relationship from a property
 */
export interface RelationshipTarget {
  /**
   * Target model name
   */
  model: string

  /**
   * Target field (usually "id")
   */
  field: string
}

/**
 * Types of relationships between models
 */
export type RelationshipType =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many'

/**
 * How a relationship was detected
 */
export type RelationshipDetectionMethod =
  | 'explicit-ref'        // OpenAPI $ref
  | 'naming-convention'   // userId -> User.id pattern
  | 'x-demokit-extension' // x-demokit-relationship extension
  | 'inferred'            // AI or heuristic inference

/**
 * Helper type to check if something is a schema reference
 */
export function isSchemaRef(value: unknown): value is SchemaRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$ref' in value &&
    typeof (value as SchemaRef).$ref === 'string'
  )
}

/**
 * Extract the model name from a $ref string
 * @example "#/components/schemas/User" -> "User"
 */
export function extractRefName(ref: string): string {
  const parts = ref.split('/')
  return parts[parts.length - 1] ?? ref
}
