import { describe, it, expect } from 'vitest'
import { detectShapeDrift } from '../drift'
import type { DemokitSchema, DataModel, Endpoint, PropertyDef, ResponseDef, SchemaRef } from '../../types'
import type { ObservedShape, ShapeNode } from '../../../shape'

/** Build a minimal PropertyDef. */
function prop(name: string, type: PropertyDef['type'], overrides: Partial<PropertyDef> = {}): PropertyDef {
  return { name, type, ...overrides }
}

/** Build a minimal DataModel. */
function model(name: string, properties: Record<string, PropertyDef>): DataModel {
  return { name, type: 'object', properties }
}

/** Build a `responses` map with a single 200 JSON response. */
function jsonResponse(content: SchemaRef | DataModel, statusCode = '200'): Record<string, ResponseDef> {
  return { [statusCode]: { statusCode, content: { 'application/json': content } } }
}

/** Build a minimal Endpoint. */
function endpoint(
  method: Endpoint['method'],
  path: string,
  responses: Record<string, ResponseDef> = {}
): Endpoint {
  return { method, path, pathParams: [], queryParams: [], responses, tags: [] }
}

/** Build a minimal DemokitSchema. */
function schema(models: Record<string, DataModel>, endpoints: Endpoint[]): DemokitSchema {
  return {
    info: { title: 'Test API', version: '1.0.0' },
    endpoints,
    models,
    relationships: [],
  }
}

/** Build an observed shape for a GET /users/{id}-shaped request. */
function observed(method: string, path: string, shape: ShapeNode): ObservedShape {
  return { method, path, shape }
}

const USER_MODEL = model('User', {
  id: prop('id', 'string'),
  email: prop('email', 'string', { required: true }),
  age: prop('age', 'integer'),
})

const USER_REF: SchemaRef = { $ref: '#/components/schemas/User' }

const USER_LIST_MODEL: DataModel = { name: 'UserList', type: 'array', items: USER_REF }

const BASE = schema(
  { User: USER_MODEL, UserList: USER_LIST_MODEL },
  [endpoint('GET', '/users/{id}', jsonResponse(USER_REF))]
)

/** Clean observed shape matching USER_MODEL exactly. */
function cleanUserShape(): ShapeNode {
  return {
    t: 'object',
    keys: {
      id: { t: 'string' },
      email: { t: 'string' },
      age: { t: 'number' },
    },
  }
}

describe('detectShapeDrift', () => {
  it('reports zero findings for a clean match', () => {
    const result = detectShapeDrift(
      [observed('GET', '/users/1', cleanUserShape())],
      BASE
    )

    expect(result.findings).toEqual([])
    expect(result.observedCount).toBe(1)
    expect(result.matchedCount).toBe(1)
  })

  it('reports unknown_endpoint when no schema endpoint matches', () => {
    const result = detectShapeDrift(
      [observed('DELETE', '/nonexistent', { t: 'object', keys: {} })],
      BASE
    )

    expect(result.observedCount).toBe(1)
    expect(result.matchedCount).toBe(0)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      kind: 'unknown_endpoint',
      method: 'DELETE',
      path: '/nonexistent',
    })
    expect(result.findings[0]!.detail).toContain('DELETE')
    expect(result.findings[0]!.detail).toContain('/nonexistent')
  })

  it('reports missing_key when a declared property is absent from the observation', () => {
    const shape: ShapeNode = {
      t: 'object',
      keys: { id: { t: 'string' }, age: { t: 'number' } }, // email absent
    }

    const result = detectShapeDrift([observed('GET', '/users/1', shape)], BASE)

    expect(result.matchedCount).toBe(1)
    expect(result.findings).toEqual([
      expect.objectContaining({
        kind: 'missing_key',
        method: 'GET',
        path: '/users/1',
        endpointPath: '/users/{id}',
        key: 'email',
      }),
    ])
  })

  it('reports extra_key when an observed key is not declared on the model', () => {
    const shape: ShapeNode = {
      t: 'object',
      keys: {
        id: { t: 'string' },
        email: { t: 'string' },
        age: { t: 'number' },
        nickname: { t: 'string' },
      },
    }

    const result = detectShapeDrift([observed('GET', '/users/1', shape)], BASE)

    expect(result.findings).toEqual([
      expect.objectContaining({
        kind: 'extra_key',
        key: 'nickname',
        endpointPath: '/users/{id}',
      }),
    ])
  })

  it('reports type_mismatch when a shared key has an incompatible primitive type', () => {
    const shape: ShapeNode = {
      t: 'object',
      keys: {
        id: { t: 'string' },
        email: { t: 'number' }, // should be string
        age: { t: 'number' },
      },
    }

    const result = detectShapeDrift([observed('GET', '/users/1', shape)], BASE)

    expect(result.findings).toEqual([
      expect.objectContaining({
        kind: 'type_mismatch',
        key: 'email',
        expected: 'string',
        observed: 'number',
      }),
    ])
  })

  it('treats declared integer and observed number as compatible', () => {
    const shape = cleanUserShape() // age: { t: 'number' } against declared 'integer'
    const result = detectShapeDrift([observed('GET', '/users/1', shape)], BASE)

    expect(result.findings).toEqual([])
  })

  it('treats observed null as compatible with an optional (non-required) property', () => {
    const shape: ShapeNode = {
      t: 'object',
      keys: {
        id: { t: 'string' },
        email: { t: 'string' },
        age: { t: 'null' }, // age is not required -> null is fine
      },
    }

    const result = detectShapeDrift([observed('GET', '/users/1', shape)], BASE)

    expect(result.findings).toEqual([])
  })

  it('treats observed null as compatible with a nullable required property', () => {
    const nullableSchema = schema(
      {
        User: model('User', {
          id: prop('id', 'string'),
          email: prop('email', 'string', { required: true, nullable: true }),
        }),
      },
      [endpoint('GET', '/users/{id}', jsonResponse(USER_REF))]
    )

    const shape: ShapeNode = { t: 'object', keys: { id: { t: 'string' }, email: { t: 'null' } } }
    const result = detectShapeDrift([observed('GET', '/users/1', shape)], nullableSchema)

    expect(result.findings).toEqual([])
  })

  it('reports type_mismatch for observed null on a required, non-nullable property', () => {
    const strictSchema = schema(
      {
        User: model('User', {
          id: prop('id', 'string'),
          email: prop('email', 'string', { required: true, nullable: false }),
        }),
      },
      [endpoint('GET', '/users/{id}', jsonResponse(USER_REF))]
    )

    const shape: ShapeNode = { t: 'object', keys: { id: { t: 'string' }, email: { t: 'null' } } }
    const result = detectShapeDrift([observed('GET', '/users/1', shape)], strictSchema)

    expect(result.findings).toEqual([
      expect.objectContaining({ kind: 'type_mismatch', key: 'email', expected: 'string', observed: 'null' }),
    ])
  })

  it('never emits missing_key for keys absent from a truncated observed object', () => {
    const shape: ShapeNode = {
      t: 'object',
      truncated: true,
      keys: { id: { t: 'string' } }, // email/age absent, but truncated -> no missing_key
    }

    const result = detectShapeDrift([observed('GET', '/users/1', shape)], BASE)

    expect(result.findings).toEqual([])
  })

  it('still reports extra_key/type_mismatch on present keys of a truncated observed object', () => {
    const shape: ShapeNode = {
      t: 'object',
      truncated: true,
      keys: {
        id: { t: 'string' },
        email: { t: 'number' }, // present, wrong type
        nickname: { t: 'string' }, // present, undeclared
      },
    }

    const result = detectShapeDrift([observed('GET', '/users/1', shape)], BASE)

    expect(result.findings).toHaveLength(2)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'type_mismatch', key: 'email' }),
        expect.objectContaining({ kind: 'extra_key', key: 'nickname' }),
      ])
    )
  })

  it('matches a templated endpoint path against an observed path carrying an unmapped base prefix', () => {
    const templatedSchema = schema(
      { User: USER_MODEL },
      [endpoint('GET', '/users/{id}', jsonResponse(USER_REF))]
    )

    const result = detectShapeDrift(
      [observed('GET', '/api/users/42', cleanUserShape())],
      templatedSchema
    )

    expect(result.matchedCount).toBe(1)
    expect(result.findings).toEqual([])
  })

  it('unwraps a declared array-of-model response and the observed array before comparing keys', () => {
    const collectionSchema = schema(
      { User: USER_MODEL, UserList: USER_LIST_MODEL },
      [endpoint('GET', '/users', jsonResponse({ $ref: '#/components/schemas/UserList' }))]
    )

    const cleanList: ShapeNode = { t: 'array', items: cleanUserShape() }
    const result = detectShapeDrift([observed('GET', '/users', cleanList)], collectionSchema)

    expect(result.matchedCount).toBe(1)
    expect(result.findings).toEqual([])
  })

  it('surfaces key drift inside an unwrapped array-of-model response', () => {
    const collectionSchema = schema(
      { User: USER_MODEL, UserList: USER_LIST_MODEL },
      [endpoint('GET', '/users', jsonResponse({ $ref: '#/components/schemas/UserList' }))]
    )

    const badList: ShapeNode = {
      t: 'array',
      items: { t: 'object', keys: { id: { t: 'string' }, age: { t: 'number' } } }, // email missing
    }
    const result = detectShapeDrift([observed('GET', '/users', badList)], collectionSchema)

    expect(result.findings).toEqual([
      expect.objectContaining({ kind: 'missing_key', key: 'email' }),
    ])
  })

  it('reports zero findings and still counts a match for an observed empty array', () => {
    const collectionSchema = schema(
      { User: USER_MODEL, UserList: USER_LIST_MODEL },
      [endpoint('GET', '/users', jsonResponse({ $ref: '#/components/schemas/UserList' }))]
    )

    const emptyList: ShapeNode = { t: 'array' } // no `items` -> observed array was empty
    const result = detectShapeDrift([observed('GET', '/users', emptyList)], collectionSchema)

    expect(result.matchedCount).toBe(1)
    expect(result.findings).toEqual([])
  })

  it('returns an empty report for an empty observed list', () => {
    const result = detectShapeDrift([], BASE)

    expect(result).toEqual({ findings: [], observedCount: 0, matchedCount: 0 })
  })
})
