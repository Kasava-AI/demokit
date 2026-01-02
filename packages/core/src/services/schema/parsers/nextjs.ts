/**
 * Next.js parser.
 * Parses Next.js API routes and Server Actions into DemokitSchema.
 *
 * Supports:
 * - App Router: app/api/[...]/route.ts (GET, POST, PUT, PATCH, DELETE)
 * - Pages Router: pages/api/[...].ts (handler function)
 * - Server Actions: 'use server' directive
 * - TypeScript types for request/response bodies
 * - Zod validation schemas in API routes
 *
 * Extracts endpoint and schema information from Next.js conventions.
 */

import type {
  DemokitSchema,
  DataModel,
  PropertyDef,
  PropertyType,
  Endpoint,
  HttpMethod,
} from '../types'
import type { CodebaseFile, ParseSchemaOptions, ParseResult, ParseWarning } from './types'

/**
 * Parse Next.js files into DemokitSchema.
 */
export function parseNextJS(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const {
    name = 'Next.js API Schema',
    version = '1.0.0',
  } = options

  const models: Record<string, DataModel> = {}
  const endpoints: Endpoint[] = []
  const warnings: ParseWarning[] = []
  const parsedFiles: string[] = []

  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) {
      continue
    }

    // Determine file type
    // Check for App Router routes - match /app/api/ or just app/api/ patterns
    const isAppRouterRoute = (file.path.includes('/app/api/') || file.path.startsWith('app/api/')) && file.path.endsWith('route.ts')
    // Check for Pages Router routes
    const isPagesApiRoute = (file.path.includes('/pages/api/') || file.path.startsWith('pages/api/')) && (file.path.endsWith('.ts') || file.path.endsWith('.tsx'))
    const isServerAction = file.content.includes("'use server'") || file.content.includes('"use server"')

    if (!isAppRouterRoute && !isPagesApiRoute && !isServerAction) {
      continue
    }

    try {
      if (isAppRouterRoute) {
        const { parsedModels, parsedEndpoints } = parseAppRouterRoute(
          file.content,
          file.path,
          warnings
        )
        for (const model of parsedModels) {
          if (!models[model.name]) {
            models[model.name] = model
          }
        }
        endpoints.push(...parsedEndpoints)
      } else if (isPagesApiRoute) {
        const { parsedModels, parsedEndpoints } = parsePagesApiRoute(
          file.content,
          file.path,
          warnings
        )
        for (const model of parsedModels) {
          if (!models[model.name]) {
            models[model.name] = model
          }
        }
        endpoints.push(...parsedEndpoints)
      } else if (isServerAction) {
        const { parsedModels, parsedEndpoints } = parseServerActions(
          file.content,
          file.path,
          warnings
        )
        for (const model of parsedModels) {
          if (!models[model.name]) {
            models[model.name] = model
          }
        }
        endpoints.push(...parsedEndpoints)
      }

      parsedFiles.push(file.path)
    } catch (error) {
      warnings.push({
        code: 'PARSE_ERROR',
        message: `Failed to parse ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: file.path,
      })
    }
  }

  const schema: DemokitSchema = {
    info: {
      title: name,
      version,
      description: 'Schema parsed from Next.js API routes and Server Actions',
    },
    endpoints,
    models,
    relationships: [],
  }

  return {
    schema,
    format: 'nextjs',
    warnings,
    parsedFiles,
  }
}

/**
 * Parse an App Router route.ts file.
 */
function parseAppRouterRoute(
  content: string,
  filePath: string,
  _warnings: ParseWarning[]
): { parsedModels: DataModel[]; parsedEndpoints: Endpoint[] } {
  const parsedModels: DataModel[] = []
  const parsedEndpoints: Endpoint[] = []

  // Extract API path from file path
  // e.g., app/api/users/[id]/route.ts -> /api/users/{id}
  const apiPath = extractApiPath(filePath)

  // Find exported HTTP method handlers
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

  for (const method of methods) {
    // Pattern: export async function GET or export function GET or export const GET
    const hasHandler =
      new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`).test(content) ||
      new RegExp(`export\\s+const\\s+${method}\\s*=`).test(content)

    if (hasHandler) {
      // Extract handler body for analysis
      const handlerMatch = content.match(
        new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
      )
      const handlerBody = handlerMatch ? handlerMatch[1] || '' : ''

      // Create endpoint
      const endpoint: Endpoint = {
        method,
        path: apiPath,
        operationId: `${method.toLowerCase()}${toPascalCase(apiPath.replace(/[^a-zA-Z0-9]/g, '_'))}`,
        summary: `${method} ${apiPath}`,
        pathParams: extractPathParams(apiPath),
        queryParams: [],
        responses: {},
        tags: extractTags(apiPath),
      }

      // Try to extract request body schema for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodySchema = extractRequestBodySchema(content, handlerBody)
        if (bodySchema) {
          const modelName = `${toPascalCase(apiPath.replace(/[^a-zA-Z0-9]/g, ''))}${method}Body`
          parsedModels.push({
            name: modelName,
            type: 'object',
            description: `Request body for ${method} ${apiPath}`,
            properties: bodySchema.properties,
            required: Object.keys(bodySchema.properties).filter(
              (k) => bodySchema.properties[k]?.required
            ),
          })

          endpoint.requestBody = {
            contentType: 'application/json',
            schema: { $ref: modelName },
            required: true,
          }
        }
      }

      parsedEndpoints.push(endpoint)
    }
  }

  // Extract any Zod schemas or TypeScript interfaces
  const schemas = extractSchemas(content)
  parsedModels.push(...schemas)

  return { parsedModels, parsedEndpoints }
}

/**
 * Parse a Pages Router API route.
 */
function parsePagesApiRoute(
  content: string,
  filePath: string,
  _warnings: ParseWarning[]
): { parsedModels: DataModel[]; parsedEndpoints: Endpoint[] } {
  const parsedModels: DataModel[] = []
  const parsedEndpoints: Endpoint[] = []

  // Extract API path
  const apiPath = extractPagesApiPath(filePath)

  // Pages Router uses a default export handler
  const hasDefaultHandler = content.includes('export default')

  if (hasDefaultHandler) {
    // Check which methods are handled
    const methods: HttpMethod[] = []
    if (content.includes("req.method === 'GET'") || content.includes('req.method === "GET"') || !content.includes('req.method')) {
      methods.push('GET')
    }
    if (content.includes("req.method === 'POST'") || content.includes('req.method === "POST"')) {
      methods.push('POST')
    }
    if (content.includes("req.method === 'PUT'") || content.includes('req.method === "PUT"')) {
      methods.push('PUT')
    }
    if (content.includes("req.method === 'PATCH'") || content.includes('req.method === "PATCH"')) {
      methods.push('PATCH')
    }
    if (content.includes("req.method === 'DELETE'") || content.includes('req.method === "DELETE"')) {
      methods.push('DELETE')
    }

    // If no specific method checks, assume GET/POST
    if (methods.length === 0) {
      methods.push('GET', 'POST')
    }

    for (const method of methods) {
      parsedEndpoints.push({
        method,
        path: apiPath,
        operationId: `${method.toLowerCase()}${toPascalCase(apiPath.replace(/[^a-zA-Z0-9]/g, '_'))}`,
        summary: `${method} ${apiPath}`,
        pathParams: extractPathParams(apiPath),
        queryParams: [],
        responses: {},
        tags: extractTags(apiPath),
      })
    }
  }

  // Extract schemas
  const schemas = extractSchemas(content)
  parsedModels.push(...schemas)

  return { parsedModels, parsedEndpoints }
}

/**
 * Parse Server Actions from a file.
 */
function parseServerActions(
  content: string,
  _filePath: string,
  _warnings: ParseWarning[]
): { parsedModels: DataModel[]; parsedEndpoints: Endpoint[] } {
  const parsedModels: DataModel[] = []
  const parsedEndpoints: Endpoint[] = []

  // Find exported async functions (server actions)
  const actionMatches = content.matchAll(
    /export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*Promise<([^>]+)>)?/g
  )

  for (const match of actionMatches) {
    const [, functionName, params, returnType] = match

    if (!functionName) continue

    // Create an endpoint for the Server Action
    parsedEndpoints.push({
      method: 'POST',
      path: `/actions/${functionName}`,
      operationId: functionName,
      summary: `Server Action: ${functionName}`,
      pathParams: [],
      queryParams: [],
      responses: {},
      tags: ['server-actions'],
    })

    // Try to parse parameter types
    if (params) {
      const paramSchema = parseActionParams(params)
      if (paramSchema && Object.keys(paramSchema).length > 0) {
        parsedModels.push({
          name: `${toPascalCase(functionName)}Input`,
          type: 'object',
          description: `Input for server action: ${functionName}`,
          properties: paramSchema,
          required: Object.keys(paramSchema).filter(
            (k) => paramSchema[k]?.required
          ),
        })
      }
    }

    // Try to parse return type
    if (returnType) {
      const returnSchema = parseTypeAnnotation(returnType)
      if (returnSchema) {
        parsedModels.push({
          name: `${toPascalCase(functionName)}Output`,
          type: 'object',
          description: `Output of server action: ${functionName}`,
          properties: returnSchema,
          required: Object.keys(returnSchema),
        })
      }
    }
  }

  // Also extract any Zod schemas or interfaces
  const schemas = extractSchemas(content)
  parsedModels.push(...schemas)

  return { parsedModels, parsedEndpoints }
}

/**
 * Extract API path from App Router file path.
 */
function extractApiPath(filePath: string): string {
  // app/api/users/[id]/route.ts -> /api/users/[id]
  // app/api/[...slug]/route.ts -> /api/[...slug]
  // Handle both relative (app/api/...) and absolute (/src/app/api/...) paths

  // Normalize path separators and find the app/api portion
  const normalizedPath = filePath.replace(/\\/g, '/')

  // Match app/api/... up to route.ts
  const match = normalizedPath.match(/app(\/api\/.+?)\/route\.ts$/)
  if (match && match[1]) {
    // Keep the original bracket notation for the path
    return match[1]
  }
  return '/api/unknown'
}

/**
 * Extract API path from Pages Router file path.
 */
function extractPagesApiPath(filePath: string): string {
  // pages/api/users/[id].ts -> /api/users/[id]
  const normalizedPath = filePath.replace(/\\/g, '/')
  const match = normalizedPath.match(/pages(\/api\/.+?)\.tsx?$/)
  if (match && match[1]) {
    return match[1]
  }
  return '/api/unknown'
}

/**
 * Extract path parameters from API path.
 */
function extractPathParams(apiPath: string): Array<{ name: string; in: 'path'; required: boolean; type: PropertyType }> {
  const params: Array<{ name: string; in: 'path'; required: boolean; type: PropertyType }> = []
  const matches = apiPath.matchAll(/\{(\w+)\}/g)

  for (const match of matches) {
    const paramName = match[1]
    if (paramName) {
      params.push({
        name: paramName,
        in: 'path',
        required: true,
        type: 'string',
      })
    }
  }

  return params
}

/**
 * Extract tags from API path.
 */
function extractTags(apiPath: string): string[] {
  const parts = apiPath.split('/').filter(Boolean)
  if (parts.length >= 2) {
    // Use the first meaningful segment after /api/
    const tag = parts[1]
    if (tag && !tag.startsWith('{')) {
      return [tag]
    }
  }
  return []
}

/**
 * Try to extract request body schema from handler.
 */
function extractRequestBodySchema(
  content: string,
  handlerBody: string
): { properties: Record<string, PropertyDef> } | null {
  // Look for Zod validation
  const zodMatch = content.match(/z\.object\(\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)/)
  if (zodMatch && zodMatch[1]) {
    const properties = parseZodObjectBody(zodMatch[1])
    return { properties }
  }

  // Look for destructuring from request body
  const bodyMatch = handlerBody.match(/(?:const|let)\s*\{([^}]+)\}\s*=\s*(?:await\s+)?(?:request|req)\.json\(\)/)
  if (bodyMatch && bodyMatch[1]) {
    const fields = bodyMatch[1].split(',').map((f) => f.trim()).filter(Boolean)
    const properties: Record<string, PropertyDef> = {}
    for (const field of fields) {
      const fieldName = field.split(':')[0]?.trim()
      if (fieldName) {
        properties[fieldName] = {
          name: fieldName,
          type: 'string', // Default to string
          required: true,
        }
      }
    }
    return { properties }
  }

  return null
}

/**
 * Extract schemas from content (Zod schemas and TypeScript interfaces).
 */
function extractSchemas(content: string): DataModel[] {
  const models: DataModel[] = []

  // Extract Zod schemas
  const zodMatches = content.matchAll(
    /(?:export\s+)?(?:const|let)\s+(\w+Schema?)\s*=\s*z\.object\(\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)/g
  )

  for (const match of zodMatches) {
    const [, schemaName, schemaBody] = match
    if (!schemaName || !schemaBody) continue

    const properties = parseZodObjectBody(schemaBody)
    models.push({
      name: toPascalCase(schemaName.replace(/Schema$/, '')),
      type: 'object',
      description: `Schema: ${schemaName}`,
      properties,
      required: Object.keys(properties).filter((k) => properties[k]?.required),
    })
  }

  // Extract TypeScript interfaces
  const interfaceMatches = content.matchAll(
    /(?:export\s+)?interface\s+(\w+)\s*\{([^}]*)\}/g
  )

  for (const match of interfaceMatches) {
    const [, interfaceName, interfaceBody] = match
    if (!interfaceName || !interfaceBody) continue

    // Skip common Next.js interfaces
    if (['NextApiRequest', 'NextApiResponse', 'NextRequest', 'NextResponse'].includes(interfaceName)) {
      continue
    }

    const properties = parseInterfaceBody(interfaceBody)
    models.push({
      name: interfaceName,
      type: 'object',
      properties,
      required: Object.keys(properties).filter((k) => properties[k]?.required),
    })
  }

  return models
}

/**
 * Parse Zod object body.
 */
function parseZodObjectBody(body: string): Record<string, PropertyDef> {
  const properties: Record<string, PropertyDef> = {}

  const propMatches = body.matchAll(
    /(\w+)\s*:\s*z\.(\w+)\(([^)]*)\)([^,\n]*)/g
  )

  for (const match of propMatches) {
    const [, propName, zodType, , modifiers] = match
    if (!propName || !zodType) continue

    const { type, format, nullable, isRequired } = parseZodType(zodType, modifiers || '')

    properties[propName] = {
      name: propName,
      type,
      format,
      required: isRequired,
      nullable,
    }
  }

  return properties
}

/**
 * Parse interface body.
 */
function parseInterfaceBody(body: string): Record<string, PropertyDef> {
  const properties: Record<string, PropertyDef> = {}

  const propMatches = body.matchAll(
    /(\w+)(\??)\s*:\s*([^;\n]+)/g
  )

  for (const match of propMatches) {
    const [, propName, optional, propType] = match
    if (!propName || !propType) continue

    const { type, format } = parseTypeScriptType(propType.trim())
    const isRequired = !optional

    properties[propName] = {
      name: propName,
      type,
      format,
      required: isRequired,
      nullable: !isRequired,
    }
  }

  return properties
}

/**
 * Parse action parameters.
 */
function parseActionParams(params: string): Record<string, PropertyDef> {
  const properties: Record<string, PropertyDef> = {}

  // Pattern: paramName: Type
  const paramMatches = params.matchAll(
    /(\w+)\s*:\s*([^,]+)/g
  )

  for (const match of paramMatches) {
    const [, paramName, paramType] = match
    if (!paramName || !paramType) continue

    const { type, format } = parseTypeScriptType(paramType.trim())

    properties[paramName] = {
      name: paramName,
      type,
      format,
      required: true,
    }
  }

  return properties
}

/**
 * Parse a type annotation (e.g., return type).
 */
function parseTypeAnnotation(typeStr: string): Record<string, PropertyDef> | null {
  const cleanType = typeStr.trim()

  // Handle object literal type
  if (cleanType.startsWith('{') && cleanType.endsWith('}')) {
    return parseInterfaceBody(cleanType.slice(1, -1))
  }

  // Handle named type reference
  if (/^\w+$/.test(cleanType)) {
    return {
      data: {
        name: 'data',
        type: 'object',
        format: `ref:${cleanType}`,
        required: true,
      },
    }
  }

  return null
}

/**
 * Parse Zod type.
 */
function parseZodType(
  zodType: string,
  modifiers: string
): { type: PropertyType; format?: string; nullable: boolean; isRequired: boolean } {
  let type: PropertyType = 'string'
  let format: string | undefined
  let nullable = false
  let isRequired = true

  switch (zodType.toLowerCase()) {
    case 'string':
      type = 'string'
      break
    case 'number':
      type = 'number'
      break
    case 'boolean':
      type = 'boolean'
      break
    case 'date':
      type = 'string'
      format = 'date-time'
      break
    case 'array':
      type = 'array'
      break
    case 'object':
      type = 'object'
      break
    default:
      type = 'string'
  }

  if (modifiers.includes('.optional()')) isRequired = false
  if (modifiers.includes('.nullable()')) {
    nullable = true
    isRequired = false
  }
  if (modifiers.includes('.email()')) format = 'email'
  if (modifiers.includes('.url()')) format = 'uri'
  if (modifiers.includes('.uuid()')) format = 'uuid'

  return { type, format, nullable, isRequired }
}

/**
 * Parse TypeScript type.
 */
function parseTypeScriptType(typeStr: string): { type: PropertyType; format?: string } {
  const cleanType = typeStr.replace(/\s/g, '')

  switch (cleanType) {
    case 'string':
      return { type: 'string' }
    case 'number':
      return { type: 'number' }
    case 'boolean':
      return { type: 'boolean' }
    case 'Date':
      return { type: 'string', format: 'date-time' }
    default:
      if (cleanType.endsWith('[]')) {
        return { type: 'array' }
      }
      if (cleanType.startsWith('{')) {
        return { type: 'object' }
      }
      return { type: 'string' }
  }
}

/**
 * Convert to PascalCase.
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
}
