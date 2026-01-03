#!/usr/bin/env npx tsx
/**
 * OpenAPI Schema & Endpoint Validation Script
 *
 * Validates that TypeScript types and API endpoints in example apps match the OpenAPI spec.
 * Checks property names, required fields, enum values, and endpoint paths.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'yaml'

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples')
const OPENAPI_PATH = path.join(EXAMPLES_DIR, 'openapi.yaml')
const DEBUG = process.argv.includes('--debug')

// Example apps and their configuration
interface AppConfig {
  name: string
  typesPath: string
  apiPattern: 'hooks' | 'trpc' | 'routes'
  scanPaths: string[]
}

const EXAMPLE_APPS: AppConfig[] = [
  {
    name: 'nextjs-ecommerce',
    typesPath: 'app/types/index.ts',
    apiPattern: 'hooks',
    scanPaths: ['lib/', 'app/'],
  },
  {
    name: 'react-router-ecommerce',
    typesPath: 'src/types/index.ts',
    apiPattern: 'hooks',
    scanPaths: ['src/lib/', 'src/routes/'],
  },
  {
    name: 'remix-ecommerce',
    typesPath: 'app/types/index.ts',
    apiPattern: 'routes',
    scanPaths: ['app/routes/', 'app/demo/'],
  },
  {
    name: 'swr-ecommerce',
    typesPath: 'src/types/index.ts',
    apiPattern: 'hooks',
    scanPaths: ['src/hooks/', 'src/lib/'],
  },
  {
    name: 'tanstack-query-ecommerce',
    typesPath: 'src/types/index.ts',
    apiPattern: 'hooks',
    scanPaths: ['src/hooks/', 'src/lib/'],
  },
  {
    name: 'trpc-ecommerce',
    typesPath: 'app/types/index.ts',
    apiPattern: 'trpc',
    scanPaths: ['src/server/'],
  },
]

// Core schemas from OpenAPI that should be validated
const CORE_SCHEMAS = ['Product', 'CartItem', 'Address', 'Order']

// OpenAPI endpoints to validate (normalized paths)
interface OpenAPIEndpoint {
  path: string
  method: string
  operationId?: string
  description?: string
}

// Mapping from OpenAPI paths to expected API patterns
const ENDPOINT_MAPPINGS: Record<string, { patterns: string[]; resource: string }> = {
  'GET /products': { patterns: ['/api/products', '/products', 'product.list'], resource: 'products' },
  'GET /products/{id}': {
    patterns: ['/api/products/', '/products/', 'product.get'],
    resource: 'product',
  },
  'GET /cart': { patterns: ['/api/cart', '/cart', 'cart.get'], resource: 'cart' },
  'POST /cart/items': { patterns: ['/api/cart', '/cart', 'cart.addItem'], resource: 'cart' },
  'GET /orders': { patterns: ['/api/orders', '/orders', 'order.list'], resource: 'orders' },
  'GET /orders/{orderId}': { patterns: ['/api/orders/', '/orders/', 'order.get'], resource: 'order' },
  'POST /checkout': { patterns: ['/api/checkout', '/checkout', 'order.create'], resource: 'checkout' },
  'GET /addresses': { patterns: ['/api/addresses', '/addresses', 'address.list'], resource: 'addresses' },
  'POST /addresses': {
    patterns: ['/api/addresses', '/addresses', 'address.create'],
    resource: 'address',
  },
  'POST /auth/register': { patterns: ['/api/auth/register', '/auth/register'], resource: 'auth' },
  'POST /auth/login': { patterns: ['/api/auth/login', '/auth/login'], resource: 'auth' },
}

interface OpenAPIProperty {
  type: string
  format?: string
  enum?: string[]
  items?: { $ref?: string; type?: string }
  $ref?: string
}

interface OpenAPISchema {
  type: string
  required?: string[]
  properties: Record<string, OpenAPIProperty>
}

interface ValidationError {
  app: string
  schema: string
  field: string
  issue: string
  expected?: string
  actual?: string
  file?: string
  line?: number
  category: 'schema' | 'endpoint' | 'component'
}

// Field name mappings that should use snake_case per OpenAPI spec
const FIELD_MAPPINGS: Record<string, string> = {
  productId: 'product_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  imageUrl: 'image_url',
  totalAmount: 'total_amount',
  postalCode: 'postal_code',
  addressId: 'address_id',
  paymentMethodId: 'payment_method_id',
  orderId: 'order_id',
}

// Patterns to detect component field usage issues
interface ComponentFieldViolation {
  pattern: string
  file: string
  line: number
  camelCase: string
  snakeCase: string
  context: string
}

interface ParsedInterface {
  name: string
  properties: Map<string, { type: string; optional: boolean }>
}

/**
 * Parse OpenAPI YAML and extract schema definitions
 */
function parseOpenAPISpec(filePath: string): Record<string, OpenAPISchema> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const spec = yaml.parse(content)
  return spec.components?.schemas || {}
}

/**
 * Parse TypeScript file and extract interface definitions
 */
function parseTypeScriptInterfaces(filePath: string): Map<string, ParsedInterface> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const interfaces = new Map<string, ParsedInterface>()

  // Match interface definitions with balanced braces
  const interfaceStartRegex = /export\s+interface\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g

  let match
  while ((match = interfaceStartRegex.exec(content)) !== null) {
    const name = match[1]
    const startIndex = match.index + match[0].length

    // Find matching closing brace
    let braceCount = 1
    let endIndex = startIndex
    while (braceCount > 0 && endIndex < content.length) {
      if (content[endIndex] === '{') braceCount++
      if (content[endIndex] === '}') braceCount--
      endIndex++
    }

    const body = content.slice(startIndex, endIndex - 1)
    const properties = new Map<string, { type: string; optional: boolean }>()

    // Parse properties from interface body (handle multi-line)
    // Match property name, optional marker, and type
    const lines = body.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip comments and empty lines
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed === '') continue

      // Match: propertyName?: Type
      const propMatch = trimmed.match(/^(\w+)(\?)?:\s*(.+?)\s*(?:\/\/.*)?$/)
      if (propMatch) {
        const [, propName, optional, propType] = propMatch
        properties.set(propName, {
          type: propType.replace(/;$/, '').trim(),
          optional: !!optional,
        })
      }
    }

    interfaces.set(name, { name, properties })
  }

  return interfaces
}

/**
 * Convert OpenAPI type to TypeScript equivalent
 */
function openAPITypeToTS(prop: OpenAPIProperty): string {
  if (prop.$ref) {
    const refName = prop.$ref.split('/').pop()
    return refName || 'unknown'
  }

  switch (prop.type) {
    case 'string':
      if (prop.enum) {
        return prop.enum.map((v) => `'${v}'`).join(' | ')
      }
      return 'string'
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      if (prop.items?.$ref) {
        const itemType = prop.items.$ref.split('/').pop()
        return `${itemType}[]`
      }
      return 'unknown[]'
    case 'object':
      return 'object'
    default:
      return 'unknown'
  }
}

/**
 * Validate a single example app's types against the OpenAPI spec
 */
function validateAppTypes(
  appName: string,
  typesPath: string,
  schemas: Record<string, OpenAPISchema>
): ValidationError[] {
  const errors: ValidationError[] = []
  const fullPath = path.join(EXAMPLES_DIR, appName, typesPath)

  if (!fs.existsSync(fullPath)) {
    errors.push({
      app: appName,
      schema: 'N/A',
      field: 'N/A',
      issue: `Types file not found: ${typesPath}`,
      category: 'schema',
    })
    return errors
  }

  const interfaces = parseTypeScriptInterfaces(fullPath)

  if (DEBUG) {
    console.log(`  ${appName} interfaces:`)
    for (const [name, iface] of interfaces) {
      if (CORE_SCHEMAS.includes(name)) {
        const props = Array.from(iface.properties.entries())
          .map(([k, v]) => `${k}${v.optional ? '?' : ''}`)
          .join(', ')
        console.log(`    ${name}: ${props}`)
      }
    }
  }

  for (const schemaName of CORE_SCHEMAS) {
    const schema = schemas[schemaName]
    if (!schema) continue

    const tsInterface = interfaces.get(schemaName)
    if (!tsInterface) {
      errors.push({
        app: appName,
        schema: schemaName,
        field: 'N/A',
        issue: `Interface "${schemaName}" not found in types file`,
        category: 'schema',
      })
      continue
    }

    // Check required fields exist
    const requiredFields = schema.required || []
    for (const field of requiredFields) {
      const tsProp = tsInterface.properties.get(field)
      if (!tsProp) {
        // Check for camelCase variant
        const camelField = snakeToCamel(field)
        const camelProp = tsInterface.properties.get(camelField)
        if (camelProp) {
          errors.push({
            app: appName,
            schema: schemaName,
            field,
            issue: 'Property uses camelCase instead of snake_case',
            expected: field,
            actual: camelField,
            category: 'schema',
          })
        } else {
          errors.push({
            app: appName,
            schema: schemaName,
            field,
            issue: 'Required property missing',
            expected: field,
            category: 'schema',
          })
        }
      } else if (tsProp.optional) {
        errors.push({
          app: appName,
          schema: schemaName,
          field,
          issue: 'Property should be required but is marked optional',
          category: 'schema',
        })
      }
    }

    // Check for property name mismatches (snake_case vs camelCase)
    for (const [openApiField, openApiProp] of Object.entries(schema.properties)) {
      const tsProp = tsInterface.properties.get(openApiField)
      const camelField = snakeToCamel(openApiField)

      if (!tsProp && tsInterface.properties.has(camelField)) {
        // Already reported above for required fields, skip duplicates
        if (!requiredFields.includes(openApiField)) {
          errors.push({
            app: appName,
            schema: schemaName,
            field: openApiField,
            issue: 'Property uses camelCase instead of snake_case',
            expected: openApiField,
            actual: camelField,
            category: 'schema',
          })
        }
      }

      // Check enum values match
      if (openApiProp.enum && tsProp) {
        const expectedEnum = openApiProp.enum.map((v) => `'${v}'`).join(' | ')
        const actualType = tsProp.type

        // Parse actual enum values from the type
        const actualEnumMatch = actualType.match(/'[^']+'/g)
        if (actualEnumMatch) {
          const actualEnumValues = actualEnumMatch.map((v) => v.replace(/'/g, ''))
          const expectedEnumValues = openApiProp.enum

          for (const expected of expectedEnumValues) {
            if (!actualEnumValues.includes(expected)) {
              errors.push({
                app: appName,
                schema: schemaName,
                field: openApiField,
                issue: `Missing enum value`,
                expected: expected,
                actual: actualType,
                category: 'schema',
              })
            }
          }
        }
      }

      // Check field naming (common issues like 'image' vs 'image_url')
      if (openApiField === 'image_url' && tsInterface.properties.has('image')) {
        errors.push({
          app: appName,
          schema: schemaName,
          field: openApiField,
          issue: 'Property renamed incorrectly',
          expected: 'image_url',
          actual: 'image',
          category: 'schema',
        })
      }

      if (openApiField === 'total_amount' && tsInterface.properties.has('total')) {
        errors.push({
          app: appName,
          schema: schemaName,
          field: openApiField,
          issue: 'Property renamed incorrectly',
          expected: 'total_amount',
          actual: 'total',
          category: 'schema',
        })
      }
    }
  }

  return errors
}

/**
 * Recursively get all TypeScript files in a directory
 */
function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      files.push(...getTypeScriptFiles(fullPath))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Scan files for API endpoint patterns
 */
function findEndpointPatterns(appDir: string, scanPaths: string[]): Map<string, string[]> {
  const patterns = new Map<string, string[]>()

  for (const scanPath of scanPaths) {
    const fullScanPath = path.join(appDir, scanPath)
    const files = getTypeScriptFiles(fullScanPath)

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relativePath = path.relative(appDir, file)

      // Find URL patterns in fetch calls, useSWR, useQuery, etc.
      // Match patterns like '/api/products', `/api/products/${id}`, etc.
      const urlPatterns = content.matchAll(/['"`](\/api\/[^'"`\s$]+|\/products|\/cart|\/orders|\/checkout|\/addresses|\/auth)/g)
      for (const match of urlPatterns) {
        const pattern = match[1]
        if (!patterns.has(pattern)) {
          patterns.set(pattern, [])
        }
        patterns.get(pattern)!.push(relativePath)
      }

      // Find tRPC procedure patterns (e.g., product.list, cart.get)
      const trpcPatterns = content.matchAll(/\b(product|cart|order|address|auth)\.(list|get|create|update|delete|addItem|removeItem|clear)\b/g)
      for (const match of trpcPatterns) {
        const pattern = match[0]
        if (!patterns.has(pattern)) {
          patterns.set(pattern, [])
        }
        patterns.get(pattern)!.push(relativePath)
      }

      // For tRPC router files, detect router structure
      if (content.includes('router({') && content.includes('publicProcedure')) {
        // Check for product router with list/get
        if (content.includes('product:') && content.includes('list:')) {
          patterns.set('product.list', [relativePath])
        }
        if (content.includes('product:') && content.includes('get:')) {
          patterns.set('product.get', [relativePath])
        }
        // Check for cart router
        if (content.includes('cart:') && content.includes('get:')) {
          patterns.set('cart.get', [relativePath])
        }
        if (content.includes('cart:') && content.includes('addItem:')) {
          patterns.set('cart.addItem', [relativePath])
        }
        // Check for order router
        if (content.includes('order:') && content.includes('list:')) {
          patterns.set('order.list', [relativePath])
        }
        if (content.includes('order:') && content.includes('get:')) {
          patterns.set('order.get', [relativePath])
        }
        if (content.includes('order:') && content.includes('create:')) {
          patterns.set('order.create', [relativePath])
        }
      }
    }
  }

  return patterns
}

/**
 * Parse OpenAPI paths section
 */
function parseOpenAPIPaths(filePath: string): OpenAPIEndpoint[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const spec = yaml.parse(content)
  const endpoints: OpenAPIEndpoint[] = []

  const paths = spec.paths || {}
  for (const [pathStr, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods as Record<string, unknown>)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        endpoints.push({
          path: pathStr,
          method: method.toUpperCase(),
          operationId: (details as Record<string, unknown>)?.operationId as string | undefined,
          description: (details as Record<string, unknown>)?.summary as string | undefined,
        })
      }
    }
  }

  return endpoints
}

/**
 * Validate endpoints for an app
 */
function validateAppEndpoints(app: AppConfig, openApiEndpoints: OpenAPIEndpoint[]): ValidationError[] {
  const errors: ValidationError[] = []
  const appDir = path.join(EXAMPLES_DIR, app.name)

  if (!fs.existsSync(appDir)) {
    return errors
  }

  const foundPatterns = findEndpointPatterns(appDir, app.scanPaths)

  if (DEBUG) {
    console.log(`  ${app.name} found patterns:`)
    for (const [pattern, files] of foundPatterns) {
      console.log(`    ${pattern} -> ${files.join(', ')}`)
    }
  }

  // Check core endpoints are implemented
  const coreEndpoints = [
    'GET /products',
    'GET /products/{id}',
    'GET /cart',
    'POST /cart/items',
    'GET /orders',
    'POST /checkout',
  ]

  for (const endpoint of coreEndpoints) {
    const mapping = ENDPOINT_MAPPINGS[endpoint]
    if (!mapping) continue

    // Check if any of the expected patterns are found
    const found = mapping.patterns.some((pattern) => {
      for (const foundPattern of foundPatterns.keys()) {
        if (foundPattern.includes(pattern) || pattern.includes(foundPattern)) {
          return true
        }
      }
      return false
    })

    if (!found) {
      errors.push({
        app: app.name,
        schema: 'endpoints',
        field: endpoint,
        issue: `Endpoint not found`,
        expected: mapping.patterns.join(' or '),
        category: 'endpoint',
      })
    }
  }

  return errors
}

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Scan component files for camelCase field usage violations
 */
function findComponentFieldViolations(appDir: string): ComponentFieldViolation[] {
  const violations: ComponentFieldViolation[] = []

  // Scan all tsx/ts files in src, app, components directories
  const scanDirs = ['src', 'app', 'components']
  for (const dir of scanDirs) {
    const fullDir = path.join(appDir, dir)
    if (!fs.existsSync(fullDir)) continue

    const files = getTypeScriptFiles(fullDir)
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      const relativePath = path.relative(appDir, file)

      // Skip type definition files (they're validated separately)
      if (relativePath.includes('types/index.ts') || relativePath.includes('types.ts')) {
        continue
      }

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum]

        // Check for each camelCase field mapping
        for (const [camelCase, snakeCase] of Object.entries(FIELD_MAPPINGS)) {
          // Pattern 1: Object property access like .productId, .createdAt
          const propAccessPattern = new RegExp(`\\.${camelCase}\\b`, 'g')
          let match
          while ((match = propAccessPattern.exec(line)) !== null) {
            violations.push({
              pattern: 'property_access',
              file: relativePath,
              line: lineNum + 1,
              camelCase,
              snakeCase,
              context: line.trim().substring(0, 80),
            })
          }

          // Pattern 2: Object literal key like { productId: value } or productId:
          const objKeyPattern = new RegExp(`\\b${camelCase}\\s*:(?!:)`, 'g')
          while ((match = objKeyPattern.exec(line)) !== null) {
            // Skip if it's a type annotation like (productId: string)
            const before = line.substring(0, match.index)
            if (before.match(/\(\s*$/) || before.match(/,\s*$/)) {
              // Looks like a function parameter, skip
              continue
            }
            violations.push({
              pattern: 'object_literal',
              file: relativePath,
              line: lineNum + 1,
              camelCase,
              snakeCase,
              context: line.trim().substring(0, 80),
            })
          }

          // Pattern 3: FormData.append or set with camelCase key
          const formDataPattern = new RegExp(`(append|set)\\s*\\(\\s*['"\`]${camelCase}['"\`]`, 'g')
          while ((match = formDataPattern.exec(line)) !== null) {
            violations.push({
              pattern: 'formdata',
              file: relativePath,
              line: lineNum + 1,
              camelCase,
              snakeCase,
              context: line.trim().substring(0, 80),
            })
          }

          // Pattern 4: Destructuring like { productId } from API response
          const destructurePattern = new RegExp(`\\{[^}]*\\b${camelCase}\\b[^}]*\\}\\s*=`, 'g')
          while ((match = destructurePattern.exec(line)) !== null) {
            violations.push({
              pattern: 'destructuring',
              file: relativePath,
              line: lineNum + 1,
              camelCase,
              snakeCase,
              context: line.trim().substring(0, 80),
            })
          }
        }
      }
    }
  }

  return violations
}

/**
 * Validate component field usage for an app
 */
function validateAppComponents(app: AppConfig): ValidationError[] {
  const errors: ValidationError[] = []
  const appDir = path.join(EXAMPLES_DIR, app.name)

  if (!fs.existsSync(appDir)) {
    return errors
  }

  const violations = findComponentFieldViolations(appDir)

  if (DEBUG) {
    console.log(`  ${app.name} component field violations:`)
    for (const v of violations) {
      console.log(`    ${v.file}:${v.line} [${v.pattern}] ${v.camelCase} -> ${v.snakeCase}`)
    }
  }

  // Group violations by file/field for cleaner output
  const grouped = new Map<string, ComponentFieldViolation[]>()
  for (const v of violations) {
    const key = `${v.file}:${v.camelCase}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(v)
  }

  for (const [, fileViolations] of grouped) {
    const first = fileViolations[0]
    const lineNumbers = fileViolations.map((v) => v.line).join(', ')
    errors.push({
      app: app.name,
      schema: 'component',
      field: first.camelCase,
      issue: `Uses camelCase "${first.camelCase}" instead of snake_case (lines: ${lineNumbers})`,
      expected: first.snakeCase,
      actual: first.camelCase,
      file: first.file,
      line: first.line,
      category: 'component',
    })
  }

  return errors
}

/**
 * Format validation errors for output
 */
function formatErrors(errors: ValidationError[], category?: 'schema' | 'endpoint' | 'component'): string {
  const filtered = category ? errors.filter((e) => e.category === category) : errors

  if (filtered.length === 0) {
    return category === 'schema'
      ? '\n  All types match the OpenAPI spec!'
      : category === 'endpoint'
        ? '\n  All endpoints match the OpenAPI spec!'
        : category === 'component'
          ? '\n  All component fields use correct naming!'
          : '\n  All validations passed!'
  }

  const grouped = new Map<string, ValidationError[]>()
  for (const error of filtered) {
    const key = error.app
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(error)
  }

  let output = ''
  for (const [app, appErrors] of grouped) {
    output += `\n  ${app}:\n`
    for (const error of appErrors) {
      if (error.category === 'component' && error.file) {
        output += `    - [${error.file}] ${error.field}: ${error.issue}`
      } else {
        output += `    - [${error.schema}] ${error.field}: ${error.issue}`
      }
      if (error.expected && error.category !== 'component') {
        output += ` (expected: ${error.expected}`
        if (error.actual) {
          output += `, got: ${error.actual}`
        }
        output += ')'
      }
      output += '\n'
    }
  }

  return output
}

/**
 * Main validation function
 */
function main(): void {
  const validateAll = process.argv.includes('--all')
  const endpointsOnly = process.argv.includes('--endpoints-only')
  const componentsOnly = process.argv.includes('--components-only')
  const validateEndpoints = process.argv.includes('--endpoints') || validateAll || endpointsOnly
  const validateComponents = process.argv.includes('--components') || validateAll || componentsOnly
  const validateSchemas = !endpointsOnly && !componentsOnly

  console.log('OpenAPI Validation')
  console.log('==================\n')

  // Parse OpenAPI spec
  if (!fs.existsSync(OPENAPI_PATH)) {
    console.error(`Error: OpenAPI spec not found at ${OPENAPI_PATH}`)
    process.exit(1)
  }

  const schemas = parseOpenAPISpec(OPENAPI_PATH)
  const openApiEndpoints = parseOpenAPIPaths(OPENAPI_PATH)

  console.log(`Found ${Object.keys(schemas).length} schemas in OpenAPI spec`)
  console.log(`Found ${openApiEndpoints.length} endpoints in OpenAPI spec`)

  const validating = [
    validateSchemas ? 'schemas' : '',
    validateEndpoints ? 'endpoints' : '',
    validateComponents ? 'components' : '',
  ].filter(Boolean).join(' + ')
  console.log(`Validating: ${validating}\n`)

  if (DEBUG) {
    console.log('OpenAPI Schemas:')
    for (const [name, schema] of Object.entries(schemas)) {
      if (CORE_SCHEMAS.includes(name)) {
        console.log(`  ${name}:`)
        console.log(`    required: ${schema.required?.join(', ') || 'none'}`)
        console.log(`    properties: ${Object.keys(schema.properties).join(', ')}`)
      }
    }
    console.log()

    console.log('OpenAPI Endpoints:')
    for (const endpoint of openApiEndpoints) {
      console.log(`  ${endpoint.method} ${endpoint.path}`)
    }
    console.log()
  }

  const allErrors: ValidationError[] = []

  // Validate schemas
  if (validateSchemas) {
    for (const app of EXAMPLE_APPS) {
      const errors = validateAppTypes(app.name, app.typesPath, schemas)
      allErrors.push(...errors)
    }
  }

  // Validate endpoints
  if (validateEndpoints) {
    for (const app of EXAMPLE_APPS) {
      const errors = validateAppEndpoints(app, openApiEndpoints)
      allErrors.push(...errors)
    }
  }

  // Validate component field usage
  if (validateComponents) {
    for (const app of EXAMPLE_APPS) {
      const errors = validateAppComponents(app)
      allErrors.push(...errors)
    }
  }

  // Output results
  const schemaErrors = allErrors.filter((e) => e.category === 'schema')
  const endpointErrors = allErrors.filter((e) => e.category === 'endpoint')
  const componentErrors = allErrors.filter((e) => e.category === 'component')

  if (validateSchemas) {
    console.log('Schema Validation Results:')
    console.log(formatErrors(allErrors, 'schema'))
  }

  if (validateEndpoints) {
    console.log('\nEndpoint Validation Results:')
    console.log(formatErrors(allErrors, 'endpoint'))
  }

  if (validateComponents) {
    console.log('\nComponent Field Validation Results:')
    console.log(formatErrors(allErrors, 'component'))
  }

  // Summary
  console.log('\n------------------------')
  if (allErrors.length === 0) {
    console.log('All example apps match the OpenAPI specification.')
    process.exit(0)
  } else {
    if (schemaErrors.length > 0) {
      console.log(`Found ${schemaErrors.length} schema error(s).`)
    }
    if (endpointErrors.length > 0) {
      console.log(`Found ${endpointErrors.length} endpoint error(s).`)
    }
    if (componentErrors.length > 0) {
      console.log(`Found ${componentErrors.length} component field error(s).`)
    }
    console.log('\nTo fix these issues, update the code to match the OpenAPI spec.')
    process.exit(1)
  }
}

main()
