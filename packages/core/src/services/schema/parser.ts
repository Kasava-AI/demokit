/**
 * OpenAPI 3.x parser for DemoKit
 *
 * Parses OpenAPI specs into DemoKit's internal schema representation
 * with automatic relationship detection.
 *
 * Uses @scalar/openapi-parser - a modern, webpack-compatible parser.
 */

import { dereference, validate } from '@scalar/openapi-parser'
import type { OpenAPI, OpenAPIV3_1 } from '@scalar/openapi-types'
import type {
  DemokitSchema,
  SchemaInfo,
  Endpoint,
  DataModel,
  PropertyDef,
  HttpMethod,
  ParameterDef,
  RequestBody,
  ResponseDef,
  PropertyType,
  ModelType,
} from './types'
import { detectRelationships } from './relationships'

// Type aliases for OpenAPI 3.x structures
type OpenAPIDocument = OpenAPI.Document
type SchemaObject = OpenAPIV3_1.SchemaObject
type ReferenceObject = OpenAPIV3_1.ReferenceObject
type ParameterObject = OpenAPIV3_1.ParameterObject
type RequestBodyObject = OpenAPIV3_1.RequestBodyObject
type ResponseObject = OpenAPIV3_1.ResponseObject
type MediaTypeObject = OpenAPIV3_1.MediaTypeObject

/**
 * Options for parsing OpenAPI specs
 */
export interface ParseOptions {
  /**
   * Whether to dereference all $ref pointers
   * @default true
   */
  dereference?: boolean

  /**
   * Whether to detect relationships automatically
   * @default true
   */
  detectRelationships?: boolean

  /**
   * Whether to include response schemas in models
   * @default true
   */
  includeResponses?: boolean
}

/**
 * Parse an OpenAPI spec from a file path or URL
 */
export async function parseOpenAPIFromPath(
  pathOrUrl: string,
  options: ParseOptions = {}
): Promise<DemokitSchema> {
  // Fetch the content
  const response = await fetch(pathOrUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec from ${pathOrUrl}: ${response.statusText}`)
  }

  const content = await response.text()
  return parseOpenAPIFromString(content, options)
}

/**
 * Parse an OpenAPI spec from a string (JSON or YAML)
 */
export async function parseOpenAPIFromString(
  spec: string,
  options: ParseOptions = {}
): Promise<DemokitSchema> {
  const { dereference: shouldDereference = true } = options

  // First validate the spec
  const validationResult = await validate(spec)
  if (!validationResult.valid) {
    const errorMessages = validationResult.errors?.map(e => e.message).join(', ') || 'Unknown validation error'
    throw new Error(`Invalid OpenAPI specification: ${errorMessages}`)
  }

  // Get the dereferenced schema if requested
  let schema: OpenAPIDocument
  if (shouldDereference) {
    const derefResult = await dereference(spec)
    if (derefResult.errors && derefResult.errors.length > 0) {
      const errorMessages = derefResult.errors.map(e => e.message).join(', ')
      throw new Error(`Failed to dereference OpenAPI spec: ${errorMessages}`)
    }
    schema = derefResult.schema as OpenAPIDocument
  } else {
    // Parse without dereferencing - just use the validated result
    schema = validationResult.specification as OpenAPIDocument
  }

  return parseOpenAPIDocument(schema, options)
}

/**
 * Parse an OpenAPI spec from an already-parsed object
 */
export async function parseOpenAPIFromObject(
  spec: Record<string, unknown>,
  options: ParseOptions = {}
): Promise<DemokitSchema> {
  const { dereference: shouldDereference = true } = options

  // Validate the object
  const validationResult = await validate(spec)
  if (!validationResult.valid) {
    const errorMessages = validationResult.errors?.map(e => e.message).join(', ') || 'Unknown validation error'
    throw new Error(`Invalid OpenAPI specification: ${errorMessages}`)
  }

  // Get the dereferenced schema if requested
  let schema: OpenAPIDocument
  if (shouldDereference) {
    const derefResult = await dereference(spec)
    if (derefResult.errors && derefResult.errors.length > 0) {
      const errorMessages = derefResult.errors.map(e => e.message).join(', ')
      throw new Error(`Failed to dereference OpenAPI spec: ${errorMessages}`)
    }
    schema = derefResult.schema as OpenAPIDocument
  } else {
    schema = validationResult.specification as OpenAPIDocument
  }

  return parseOpenAPIDocument(schema, options)
}

/**
 * Parse an OpenAPI document into DemokitSchema
 */
function parseOpenAPIDocument(
  doc: OpenAPIDocument,
  options: ParseOptions = {}
): DemokitSchema {
  const { detectRelationships: shouldDetect = true } = options

  // Parse info
  const info = parseInfo(doc)

  // Parse models from components/schemas
  const models = parseModels(doc)

  // Parse endpoints from paths
  const endpoints = parseEndpoints(doc)

  // Detect relationships
  const relationships = shouldDetect ? detectRelationships(models) : []

  return {
    info,
    endpoints,
    models,
    relationships,
  }
}

/**
 * Parse API info from the document
 */
function parseInfo(doc: OpenAPIDocument): SchemaInfo {
  const docInfo = (doc as any).info || {}
  const info: SchemaInfo = {
    title: docInfo.title ?? 'Untitled API',
    version: docInfo.version ?? '1.0.0',
    description: docInfo.description,
  }

  // Try to extract base URL from servers
  const servers = (doc as any).servers
  if (servers && servers.length > 0 && servers[0]) {
    info.baseUrl = servers[0].url
  }

  return info
}

/**
 * Parse all models from components/schemas
 */
function parseModels(doc: OpenAPIDocument): Record<string, DataModel> {
  const models: Record<string, DataModel> = {}

  const components = (doc as any).components
  const schemas = components?.schemas
  if (!schemas) {
    return models
  }

  for (const [name, schema] of Object.entries(schemas)) {
    // Skip reference objects (shouldn't happen after dereference)
    if (schema && typeof schema === 'object' && '$ref' in schema) {
      continue
    }

    models[name] = parseSchemaToModel(name, schema as SchemaObject)
  }

  return models
}

/**
 * Parse a schema object into a DataModel
 */
function parseSchemaToModel(name: string, schema: SchemaObject): DataModel {
  if (!schema || typeof schema !== 'object') {
    return { name, type: 'object' }
  }

  const s = schema as Record<string, unknown>
  const model: DataModel = {
    name,
    type: schemaTypeToModelType(s.type as string | string[] | undefined),
    description: s.description as string | undefined,
  }

  // Parse properties for object types
  if (s.type === 'object' || s.properties) {
    model.type = 'object'
    model.properties = {}
    model.required = (s.required as string[]) || []

    if (s.properties && typeof s.properties === 'object') {
      for (const [propName, propSchema] of Object.entries(s.properties)) {
        model.properties[propName] = parseProperty(
          propName,
          propSchema as SchemaObject | ReferenceObject,
          model.required.includes(propName)
        )
      }
    }

    if (s.additionalProperties !== undefined) {
      if (typeof s.additionalProperties === 'boolean') {
        model.additionalProperties = s.additionalProperties
      } else if (s.additionalProperties && typeof s.additionalProperties === 'object') {
        if ('$ref' in s.additionalProperties) {
          model.additionalProperties = {
            $ref: (s.additionalProperties as ReferenceObject).$ref,
          }
        } else {
          model.additionalProperties = parseSchemaToModel(
            `${name}AdditionalProps`,
            s.additionalProperties as SchemaObject
          )
        }
      }
    }
  }

  // Parse array items
  if (s.type === 'array' && s.items) {
    model.type = 'array'
    if (typeof s.items === 'object' && '$ref' in s.items) {
      model.items = { $ref: (s.items as ReferenceObject).$ref }
    } else {
      model.items = parseSchemaToModel(`${name}Item`, s.items as SchemaObject)
    }
  }

  // Parse enum values
  if (s.enum) {
    model.enum = s.enum as unknown[]
  }

  // Parse example
  if (s.example !== undefined) {
    model.example = s.example
  }

  return model
}

/**
 * Parse a property schema into a PropertyDef
 */
function parseProperty(
  name: string,
  schema: SchemaObject | ReferenceObject,
  required: boolean
): PropertyDef {
  // Handle $ref
  if (schema && typeof schema === 'object' && '$ref' in schema) {
    return {
      name,
      type: 'object',
      required,
      $ref: schema.$ref,
    }
  }

  const s = schema as Record<string, unknown>

  const prop: PropertyDef = {
    name,
    type: schemaTypeToPropertyType(s.type as string | string[] | undefined),
    required,
    nullable: s.nullable as boolean | undefined,
    description: s.description as string | undefined,
    format: s.format as string | undefined,
    enum: s.enum as unknown[] | undefined,
    example: s.example,
    default: s.default,
    minimum: s.minimum as number | undefined,
    maximum: s.maximum as number | undefined,
    minLength: s.minLength as number | undefined,
    maxLength: s.maxLength as number | undefined,
    pattern: s.pattern as string | undefined,
  }

  // Parse array items
  if (s.type === 'array' && s.items) {
    prop.type = 'array'
    if (typeof s.items === 'object' && '$ref' in s.items) {
      prop.items = { $ref: (s.items as ReferenceObject).$ref }
    } else {
      prop.items = parseSchemaToModel(`${name}Item`, s.items as SchemaObject)
    }
  }

  // Check for x-demokit-relationship extension
  const xRelationship = s['x-demokit-relationship']
  if (xRelationship && typeof xRelationship === 'object') {
    prop['x-demokit-relationship'] = xRelationship as { model: string; field: string }
  }

  return prop
}

/**
 * Parse all endpoints from paths
 */
function parseEndpoints(doc: OpenAPIDocument): Endpoint[] {
  const endpoints: Endpoint[] = []

  const paths = (doc as any).paths
  if (!paths) {
    return endpoints
  }

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method.toLowerCase()]

      if (!operation || typeof operation !== 'object') continue

      endpoints.push(parseEndpoint(method, path, operation as Record<string, unknown>, pathItem as Record<string, unknown>))
    }
  }

  return endpoints
}

/**
 * Parse a single endpoint
 */
function parseEndpoint(
  method: HttpMethod,
  path: string,
  operation: Record<string, unknown>,
  pathItem: Record<string, unknown>
): Endpoint {
  // Combine path-level and operation-level parameters
  const pathParams: ParameterDef[] = []
  const queryParams: ParameterDef[] = []

  const allParams = [
    ...((pathItem.parameters as unknown[]) || []),
    ...((operation.parameters as unknown[]) || []),
  ]

  for (const param of allParams) {
    if (!param || typeof param !== 'object') continue
    if ('$ref' in param) continue // Skip refs

    const parsed = parseParameter(param as ParameterObject)

    if (parsed.in === 'path') {
      pathParams.push(parsed)
    } else if (parsed.in === 'query') {
      queryParams.push(parsed)
    }
  }

  // Parse request body
  let requestBody: RequestBody | undefined
  const opRequestBody = operation.requestBody
  if (opRequestBody && typeof opRequestBody === 'object' && !('$ref' in opRequestBody)) {
    requestBody = parseRequestBody(opRequestBody as RequestBodyObject)
  }

  // Parse responses
  const responses: Record<string, ResponseDef> = {}
  const opResponses = operation.responses
  if (opResponses && typeof opResponses === 'object') {
    for (const [statusCode, response] of Object.entries(opResponses)) {
      if (!response || typeof response !== 'object') continue
      if ('$ref' in response) continue
      responses[statusCode] = parseResponse(statusCode, response as ResponseObject)
    }
  }

  return {
    method,
    path,
    operationId: operation.operationId as string | undefined,
    summary: operation.summary as string | undefined,
    description: operation.description as string | undefined,
    pathParams,
    queryParams,
    requestBody,
    responses,
    tags: (operation.tags as string[]) || [],
  }
}

/**
 * Parse a parameter object
 */
function parseParameter(param: ParameterObject): ParameterDef {
  const p = param as Record<string, unknown>
  const schema = p.schema as Record<string, unknown> | undefined

  return {
    name: p.name as string,
    in: p.in as 'path' | 'query' | 'header' | 'cookie',
    required: (p.required as boolean) ?? false,
    type: schema ? schemaTypeToPropertyType(schema.type as string | string[] | undefined) : 'string',
    format: schema?.format as string | undefined,
    description: p.description as string | undefined,
    example: p.example ?? schema?.example,
  }
}

/**
 * Parse a request body object
 */
function parseRequestBody(body: RequestBodyObject): RequestBody {
  const b = body as Record<string, unknown>
  const content = b.content as Record<string, unknown> | undefined
  const contentType = Object.keys(content || {})[0] || 'application/json'
  const mediaType = content?.[contentType] as MediaTypeObject | undefined

  let schema: RequestBody['schema'] = { name: 'Unknown', type: 'object' }

  if (mediaType) {
    const m = mediaType as Record<string, unknown>
    const mediaSchema = m.schema
    if (mediaSchema && typeof mediaSchema === 'object') {
      if ('$ref' in mediaSchema) {
        schema = { $ref: (mediaSchema as ReferenceObject).$ref }
      } else {
        schema = parseSchemaToModel('RequestBody', mediaSchema as SchemaObject)
      }
    }
  }

  return {
    contentType,
    schema,
    required: (b.required as boolean) ?? false,
    description: b.description as string | undefined,
  }
}

/**
 * Parse a response object
 */
function parseResponse(statusCode: string, response: ResponseObject): ResponseDef {
  const r = response as Record<string, unknown>
  const responseDef: ResponseDef = {
    statusCode,
    description: r.description as string | undefined,
  }

  const content = r.content as Record<string, unknown> | undefined
  if (content) {
    responseDef.content = {}

    for (const [contentType, mediaType] of Object.entries(content)) {
      if (!mediaType || typeof mediaType !== 'object') continue

      const m = mediaType as Record<string, unknown>
      const schema = m.schema
      if (schema && typeof schema === 'object') {
        if ('$ref' in schema) {
          responseDef.content[contentType] = {
            $ref: (schema as ReferenceObject).$ref,
          }
        } else {
          responseDef.content[contentType] = parseSchemaToModel(
            `Response${statusCode}`,
            schema as SchemaObject
          )
        }
      }
    }
  }

  return responseDef
}

/**
 * Convert OpenAPI schema type to ModelType
 */
function schemaTypeToModelType(
  type: string | string[] | undefined
): ModelType {
  if (!type) return 'object'
  if (Array.isArray(type)) return type[0] as ModelType
  return type as ModelType
}

/**
 * Convert OpenAPI schema type to PropertyType
 */
function schemaTypeToPropertyType(
  type: string | string[] | undefined
): PropertyType {
  if (!type) return 'object'
  if (Array.isArray(type)) return type[0] as PropertyType
  return type as PropertyType
}
