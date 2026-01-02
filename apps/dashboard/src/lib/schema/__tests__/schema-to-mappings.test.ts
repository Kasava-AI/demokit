/**
 * Tests for schema-to-mappings auto-inference
 */

import { describe, it, expect } from 'vitest'
import type { DemokitSchema } from '@demokit-ai/core'
import {
  normalizePathPattern,
  extractPathParams,
  extractModelFromPath,
  findMatchingModel,
  determineLookupField,
  determineResponseType,
  inferEndpointMappings,
  inferMappingsFromModels,
} from '../schema-to-mappings'

describe('normalizePathPattern', () => {
  it('converts OpenAPI {param} to Express :param', () => {
    expect(normalizePathPattern('/users/{id}')).toBe('/users/:id')
  })

  it('handles multiple parameters', () => {
    expect(normalizePathPattern('/users/{userId}/orders/{orderId}')).toBe(
      '/users/:userId/orders/:orderId'
    )
  })

  it('handles paths without parameters', () => {
    expect(normalizePathPattern('/users')).toBe('/users')
  })

  it('handles already normalized paths', () => {
    expect(normalizePathPattern('/users/:id')).toBe('/users/:id')
  })

  it('handles complex paths', () => {
    expect(normalizePathPattern('/api/v1/organizations/{orgId}/projects/{projectId}/members')).toBe(
      '/api/v1/organizations/:orgId/projects/:projectId/members'
    )
  })
})

describe('extractPathParams', () => {
  it('extracts single parameter', () => {
    expect(extractPathParams('/users/:id')).toEqual(['id'])
  })

  it('extracts multiple parameters', () => {
    expect(extractPathParams('/users/:userId/orders/:orderId')).toEqual(['userId', 'orderId'])
  })

  it('returns empty array for paths without parameters', () => {
    expect(extractPathParams('/users')).toEqual([])
  })

  it('handles underscores in parameter names', () => {
    expect(extractPathParams('/users/:user_id/posts/:post_id')).toEqual(['user_id', 'post_id'])
  })

  it('handles mixed alphanumeric parameter names', () => {
    expect(extractPathParams('/items/:item123Id')).toEqual(['item123Id'])
  })
})

describe('extractModelFromPath', () => {
  it('extracts model from simple path', () => {
    expect(extractModelFromPath('/users')).toBe('users')
  })

  it('extracts model from path with parameter', () => {
    expect(extractModelFromPath('/users/{id}')).toBe('users')
  })

  it('extracts model from versioned API path', () => {
    expect(extractModelFromPath('/api/v1/users')).toBe('users')
  })

  it('extracts model from nested resource path', () => {
    expect(extractModelFromPath('/users/{userId}/orders')).toBe('orders')
  })

  it('extracts model from deeply nested path', () => {
    expect(extractModelFromPath('/users/{userId}/orders/{orderId}/items')).toBe('items')
  })

  it('handles path ending with parameter (returns parent resource)', () => {
    expect(extractModelFromPath('/users/{userId}/orders/{orderId}')).toBe('orders')
  })

  it('returns null for paths with only parameters', () => {
    expect(extractModelFromPath('/{id}')).toBe(null)
  })

  it('handles uppercase in path', () => {
    expect(extractModelFromPath('/Products')).toBe('products')
  })
})

describe('findMatchingModel', () => {
  const availableModels = ['Users', 'products', 'OrderItems', 'user_profiles']

  it('finds exact match (case-insensitive)', () => {
    expect(findMatchingModel('users', availableModels)).toEqual({
      model: 'Users',
      confidence: 100,
    })
  })

  it('finds match with different case', () => {
    expect(findMatchingModel('PRODUCTS', availableModels)).toEqual({
      model: 'products',
      confidence: 100,
    })
  })

  it('finds singular/plural match', () => {
    expect(findMatchingModel('user', availableModels)).toEqual({
      model: 'Users',
      confidence: 90,
    })
  })

  it('finds camelCase match', () => {
    expect(findMatchingModel('order_items', availableModels)).toEqual({
      model: 'OrderItems',
      confidence: 80,
    })
  })

  it('finds snake_case match via normalized comparison', () => {
    // userprofiles (no underscore) matches user_profiles (with underscore) via normalized comparison
    expect(findMatchingModel('userprofiles', availableModels)).toEqual({
      model: 'user_profiles',
      confidence: 80,
    })
  })

  it('returns null for no match', () => {
    expect(findMatchingModel('categories', availableModels)).toBe(null)
  })

  it('returns null for empty model name', () => {
    expect(findMatchingModel('', availableModels)).toBe(null)
  })
})

describe('determineLookupField', () => {
  it('returns "id" for simple id parameter', () => {
    expect(determineLookupField(['id'], 'users')).toBe('id')
  })

  it('returns the param name for model-prefixed id parameter', () => {
    expect(determineLookupField(['userId'], 'user')).toBe('userId')
  })

  it('returns the param name for underscore id parameter', () => {
    expect(determineLookupField(['user_id'], 'users')).toBe('user_id')
  })

  it('returns the param name for non-id lookups', () => {
    expect(determineLookupField(['slug'], 'posts')).toBe('slug')
  })

  it('uses last parameter for nested paths', () => {
    expect(determineLookupField(['userId', 'orderId'], 'orders')).toBe('orderId')
  })

  it('returns "id" for empty params', () => {
    expect(determineLookupField([], 'users')).toBe('id')
  })
})

describe('determineResponseType', () => {
  it('returns "collection" for GET on collection path', () => {
    expect(determineResponseType('GET', '/users', [])).toBe('collection')
  })

  it('returns "single" for GET with path parameter', () => {
    expect(determineResponseType('GET', '/users/:id', ['id'])).toBe('single')
  })

  it('returns "single" for POST (creates new record)', () => {
    expect(determineResponseType('POST', '/users', [])).toBe('single')
  })

  it('returns "single" for PUT', () => {
    expect(determineResponseType('PUT', '/users/:id', ['id'])).toBe('single')
  })

  it('returns "single" for PATCH', () => {
    expect(determineResponseType('PATCH', '/users/:id', ['id'])).toBe('single')
  })

  it('returns "single" for DELETE', () => {
    expect(determineResponseType('DELETE', '/users/:id', ['id'])).toBe('single')
  })

  it('returns "collection" for GET on nested collection', () => {
    expect(determineResponseType('GET', '/users/:userId/orders', ['userId'])).toBe('collection')
  })

  it('returns "single" for GET on nested resource with id', () => {
    expect(determineResponseType('GET', '/users/:userId/orders/:orderId', ['userId', 'orderId'])).toBe(
      'single'
    )
  })
})

describe('inferEndpointMappings', () => {
  const createMockSchema = (endpoints: DemokitSchema['endpoints']): DemokitSchema => ({
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    endpoints,
    models: {},
    relationships: [],
  })

  const fixtureModels = ['users', 'products', 'orders', 'orderItems']

  it('maps simple GET collection endpoint', () => {
    const schema = createMockSchema([
      {
        method: 'GET',
        path: '/api/users',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(1)
    expect(result.mappings[0]).toMatchObject({
      method: 'GET',
      pattern: '/api/users',
      sourceModel: 'users',
      responseType: 'collection',
      isAutoGenerated: true,
    })
  })

  it('maps GET single-record endpoint with lookup config', () => {
    const schema = createMockSchema([
      {
        method: 'GET',
        path: '/api/users/{id}',
        pathParams: [{ name: 'id', in: 'path', required: true, type: 'string' }],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(1)
    expect(result.mappings[0]).toMatchObject({
      method: 'GET',
      pattern: '/api/users/:id',
      sourceModel: 'users',
      responseType: 'single',
      lookupField: 'id',
      lookupParam: 'id',
    })
  })

  it('handles model-prefixed path parameter', () => {
    const schema = createMockSchema([
      {
        method: 'GET',
        path: '/products/{productId}',
        pathParams: [{ name: 'productId', in: 'path', required: true, type: 'string' }],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings[0]).toMatchObject({
      method: 'GET',
      pattern: '/products/:productId',
      sourceModel: 'products',
      responseType: 'single',
      lookupField: 'productId', // Uses the actual param name
      lookupParam: 'productId',
    })
  })

  it('skips health check endpoints', () => {
    const schema = createMockSchema([
      {
        method: 'GET',
        path: '/health',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
      {
        method: 'GET',
        path: '/api/v1/health',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(0)
    expect(result.skipped).toHaveLength(2)
    expect(result.skipped[0].reason).toContain('skip pattern')
  })

  it('skips auth endpoints', () => {
    const schema = createMockSchema([
      {
        method: 'POST',
        path: '/auth/login',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
      {
        method: 'GET',
        path: '/oauth/callback',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(0)
    expect(result.skipped).toHaveLength(2)
  })

  it('skips HEAD and OPTIONS methods', () => {
    const schema = createMockSchema([
      {
        method: 'HEAD',
        path: '/users',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
      {
        method: 'OPTIONS',
        path: '/users',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(0)
    expect(result.skipped).toHaveLength(2)
  })

  it('adds unmapped endpoints when model not found', () => {
    const schema = createMockSchema([
      {
        method: 'GET',
        path: '/api/categories',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(0)
    expect(result.unmapped).toHaveLength(1)
    expect(result.unmapped[0]).toMatchObject({
      method: 'GET',
      path: '/api/categories',
      reason: 'No matching model found for "categories"',
      suggestedModel: 'categories',
    })
  })

  it('handles nested resources correctly', () => {
    const schema = createMockSchema([
      {
        method: 'GET',
        path: '/users/{userId}/orders',
        pathParams: [{ name: 'userId', in: 'path', required: true, type: 'string' }],
        queryParams: [],
        responses: {},
        tags: [],
      },
      {
        method: 'GET',
        path: '/users/{userId}/orders/{orderId}',
        pathParams: [
          { name: 'userId', in: 'path', required: true, type: 'string' },
          { name: 'orderId', in: 'path', required: true, type: 'string' },
        ],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(2)

    // First: GET /users/:userId/orders -> orders collection
    expect(result.mappings[0]).toMatchObject({
      method: 'GET',
      pattern: '/users/:userId/orders',
      sourceModel: 'orders',
      responseType: 'collection',
    })

    // Second: GET /users/:userId/orders/:orderId -> single order
    expect(result.mappings[1]).toMatchObject({
      method: 'GET',
      pattern: '/users/:userId/orders/:orderId',
      sourceModel: 'orders',
      responseType: 'single',
      lookupField: 'orderId',
      lookupParam: 'orderId',
    })
  })

  it('maps POST, PUT, PATCH, DELETE methods correctly', () => {
    const schema = createMockSchema([
      {
        method: 'POST',
        path: '/api/products',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
      {
        method: 'PUT',
        path: '/api/products/{id}',
        pathParams: [{ name: 'id', in: 'path', required: true, type: 'string' }],
        queryParams: [],
        responses: {},
        tags: [],
      },
      {
        method: 'PATCH',
        path: '/api/products/{id}',
        pathParams: [{ name: 'id', in: 'path', required: true, type: 'string' }],
        queryParams: [],
        responses: {},
        tags: [],
      },
      {
        method: 'DELETE',
        path: '/api/products/{id}',
        pathParams: [{ name: 'id', in: 'path', required: true, type: 'string' }],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(4)

    expect(result.mappings[0]).toMatchObject({
      method: 'POST',
      responseType: 'single',
    })
    expect(result.mappings[1]).toMatchObject({
      method: 'PUT',
      responseType: 'single',
      lookupField: 'id',
    })
    expect(result.mappings[2]).toMatchObject({
      method: 'PATCH',
      responseType: 'single',
      lookupField: 'id',
    })
    expect(result.mappings[3]).toMatchObject({
      method: 'DELETE',
      responseType: 'single',
      lookupField: 'id',
    })
  })

  it('returns available models in result', () => {
    const schema = createMockSchema([])
    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.availableModels).toEqual(fixtureModels)
  })

  it('assigns confidence scores based on match quality', () => {
    const schema = createMockSchema([
      {
        method: 'GET',
        path: '/users',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    // Exact match should have confidence 100
    expect(result.mappings[0].confidence).toBe(100)
  })

  it('skips webhook endpoints', () => {
    const schema = createMockSchema([
      {
        method: 'POST',
        path: '/webhook/stripe',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
      {
        method: 'POST',
        path: '/hooks/github',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(0)
    expect(result.skipped).toHaveLength(2)
  })

  it('skips graphql endpoint', () => {
    const schema = createMockSchema([
      {
        method: 'POST',
        path: '/graphql',
        pathParams: [],
        queryParams: [],
        responses: {},
        tags: [],
      },
    ])

    const result = inferEndpointMappings(schema, fixtureModels)

    expect(result.mappings).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
  })
})

describe('inferMappingsFromModels', () => {
  it('generates CRUD endpoints for each model', () => {
    const models = {
      users: {},
      products: {},
    }

    const mappings = inferMappingsFromModels(models)

    // 5 endpoints per model (GET collection, GET single, POST, PUT, DELETE)
    expect(mappings).toHaveLength(10)
  })

  it('uses default /api base path', () => {
    const models = { users: {} }
    const mappings = inferMappingsFromModels(models)

    expect(mappings[0].pattern).toBe('/api/users')
    expect(mappings[1].pattern).toBe('/api/users/:id')
  })

  it('uses custom base path when provided', () => {
    const models = { users: {} }
    const mappings = inferMappingsFromModels(models, { basePath: '/api/v2' })

    expect(mappings[0].pattern).toBe('/api/v2/users')
  })

  it('pluralizes model names correctly', () => {
    const models = { User: {}, Product: {} }
    const mappings = inferMappingsFromModels(models)

    expect(mappings[0].pattern).toBe('/api/users')
    expect(mappings[5].pattern).toBe('/api/products')
  })

  it('does not double-pluralize already plural names', () => {
    const models = { users: {} }
    const mappings = inferMappingsFromModels(models)

    expect(mappings[0].pattern).toBe('/api/users')
    expect(mappings[0].pattern).not.toBe('/api/userss')
  })

  it('sets correct response types for each method', () => {
    const models = { users: {} }
    const mappings = inferMappingsFromModels(models)

    const getMappings = mappings.filter((m) => m.method === 'GET')
    expect(getMappings[0].responseType).toBe('collection') // GET /users
    expect(getMappings[1].responseType).toBe('single') // GET /users/:id

    const postMapping = mappings.find((m) => m.method === 'POST')
    expect(postMapping?.responseType).toBe('single')

    const putMapping = mappings.find((m) => m.method === 'PUT')
    expect(putMapping?.responseType).toBe('single')

    const deleteMapping = mappings.find((m) => m.method === 'DELETE')
    expect(deleteMapping?.responseType).toBe('single')
  })

  it('sets lookup fields for single-record endpoints', () => {
    const models = { users: {} }
    const mappings = inferMappingsFromModels(models)

    const singleEndpoints = mappings.filter((m) => m.pattern.includes(':id'))

    singleEndpoints.forEach((m) => {
      expect(m.lookupField).toBe('id')
      expect(m.lookupParam).toBe('id')
    })
  })

  it('marks all mappings as auto-generated with confidence', () => {
    const models = { users: {} }
    const mappings = inferMappingsFromModels(models)

    mappings.forEach((m) => {
      expect(m.isAutoGenerated).toBe(true)
      expect(m.confidence).toBe(70)
      expect(m.reason).toContain('Auto-generated')
    })
  })

  it('preserves original model name in sourceModel', () => {
    const models = { Users: {}, OrderItems: {} }
    const mappings = inferMappingsFromModels(models)

    // Users model endpoints
    const userMappings = mappings.filter((m) => m.pattern.includes('/users'))
    expect(userMappings[0].sourceModel).toBe('Users')

    // OrderItems model endpoints
    const orderItemMappings = mappings.filter((m) => m.pattern.includes('/orderitems'))
    expect(orderItemMappings[0].sourceModel).toBe('OrderItems')
  })
})

describe('edge cases', () => {
  it('handles empty schema', () => {
    const schema: DemokitSchema = {
      info: { title: 'Empty API', version: '1.0.0' },
      endpoints: [],
      models: {},
      relationships: [],
    }

    const result = inferEndpointMappings(schema, ['users'])

    expect(result.mappings).toHaveLength(0)
    expect(result.unmapped).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })

  it('handles empty fixture models', () => {
    const schema: DemokitSchema = {
      info: { title: 'Test API', version: '1.0.0' },
      endpoints: [
        {
          method: 'GET',
          path: '/users',
          pathParams: [],
          queryParams: [],
          responses: {},
          tags: [],
        },
      ],
      models: {},
      relationships: [],
    }

    const result = inferEndpointMappings(schema, [])

    expect(result.mappings).toHaveLength(0)
    expect(result.unmapped).toHaveLength(1)
    expect(result.unmapped[0].suggestedModel).toBe('users')
  })

  it('handles very long paths', () => {
    const schema: DemokitSchema = {
      info: { title: 'Test API', version: '1.0.0' },
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/organizations/{orgId}/projects/{projectId}/environments/{envId}/deployments/{deploymentId}/logs',
          pathParams: [
            { name: 'orgId', in: 'path', required: true, type: 'string' },
            { name: 'projectId', in: 'path', required: true, type: 'string' },
            { name: 'envId', in: 'path', required: true, type: 'string' },
            { name: 'deploymentId', in: 'path', required: true, type: 'string' },
          ],
          queryParams: [],
          responses: {},
          tags: [],
        },
      ],
      models: {},
      relationships: [],
    }

    const result = inferEndpointMappings(schema, ['logs', 'deployments'])

    expect(result.mappings).toHaveLength(1)
    expect(result.mappings[0].sourceModel).toBe('logs')
    expect(result.mappings[0].pattern).toBe(
      '/api/v1/organizations/:orgId/projects/:projectId/environments/:envId/deployments/:deploymentId/logs'
    )
  })

  it('handles paths with special characters in segments', () => {
    const model = extractModelFromPath('/api/order-items')
    expect(model).toBe('order-items')
  })

  it('handles paths with multiple API versions', () => {
    expect(extractModelFromPath('/api/v1/users')).toBe('users')
    expect(extractModelFromPath('/api/v2/users')).toBe('users')
    expect(extractModelFromPath('/v3/users')).toBe('users')
  })
})
