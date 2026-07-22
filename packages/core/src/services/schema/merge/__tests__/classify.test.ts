import { describe, it, expect } from 'vitest'
import { classifySchemaDiff } from '../classify'
import type { DemokitSchema, DataModel, Endpoint, PropertyDef } from '../../types'

/** Build a minimal PropertyDef. */
function prop(name: string, type: PropertyDef['type'], overrides: Partial<PropertyDef> = {}): PropertyDef {
  return { name, type, ...overrides }
}

/** Build a minimal DataModel. */
function model(name: string, properties: Record<string, PropertyDef>): DataModel {
  return { name, type: 'object', properties }
}

/** Build a minimal Endpoint. */
function endpoint(method: Endpoint['method'], path: string): Endpoint {
  return {
    method,
    path,
    pathParams: [],
    queryParams: [],
    responses: {},
    tags: [],
  }
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

/** Deep clone via JSON round-trip (fixtures are plain data). */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const BASE = schema(
  {
    User: model('User', {
      id: prop('id', 'string'),
      email: prop('email', 'string', { required: true }),
    }),
    Order: model('Order', {
      id: prop('id', 'string'),
      total: prop('total', 'number'),
    }),
  },
  [endpoint('GET', '/users'), endpoint('GET', '/users/{id}'), endpoint('POST', '/orders')]
)

describe('classifySchemaDiff', () => {
  it('returns empty arrays for a no-op diff', () => {
    const updated = clone(BASE)
    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([])
    expect(result.breaking).toEqual([])
    expect(result.additive).toEqual([])
    expect(result.hasBreaking).toBe(false)
    expect(result.hasAdditive).toBe(false)
  })

  it('classifies a removed model as breaking', () => {
    const updated = clone(BASE)
    delete updated.models.Order

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'breaking',
        kind: 'model_removed',
        model: 'Order',
        detail: '`Order` model removed',
      },
    ])
    expect(result.hasBreaking).toBe(true)
    expect(result.hasAdditive).toBe(false)
  })

  it('classifies an added model as additive', () => {
    const updated = clone(BASE)
    updated.models.Product = model('Product', { id: prop('id', 'string') })

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'additive',
        kind: 'model_added',
        model: 'Product',
        detail: '`Product` model added',
      },
    ])
    expect(result.hasBreaking).toBe(false)
    expect(result.hasAdditive).toBe(true)
  })

  it('classifies a removed property as breaking', () => {
    const updated = clone(BASE)
    delete updated.models.User!.properties!.email

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'breaking',
        kind: 'property_removed',
        model: 'User',
        property: 'email',
        detail: '`User.email` property removed',
      },
    ])
  })

  it('classifies a property type change as breaking', () => {
    const updated = clone(BASE)
    updated.models.Order!.properties!.total = prop('total', 'string')

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'breaking',
        kind: 'property_type_changed',
        model: 'Order',
        property: 'total',
        detail: '`Order.total` type changed: number → string',
      },
    ])
  })

  it('classifies a property becoming required as breaking', () => {
    const updated = clone(BASE)
    updated.models.User!.properties!.id = prop('id', 'string', { required: true })

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'breaking',
        kind: 'property_required_added',
        model: 'User',
        property: 'id',
        detail: '`User.id` is now required',
      },
    ])
  })

  it('classifies an added property as additive', () => {
    const updated = clone(BASE)
    updated.models.User!.properties!.name = prop('name', 'string')

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'additive',
        kind: 'property_added',
        model: 'User',
        property: 'name',
        detail: '`User.name` property added',
      },
    ])
  })

  it('classifies a new required property on an existing model as breaking', () => {
    const updated = clone(BASE)
    updated.models.User!.properties!.apiKey = prop('apiKey', 'string', { required: true })

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'breaking',
        kind: 'property_required_added',
        model: 'User',
        property: 'apiKey',
        detail: '`User.apiKey` added as a required property',
      },
    ])
    expect(result.hasBreaking).toBe(true)
    expect(result.hasAdditive).toBe(false)
  })

  it('emits both property_type_changed and property_required_added for one modified property', () => {
    const updated = clone(BASE)
    updated.models.Order!.properties!.total = prop('total', 'string', { required: true })

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'breaking',
        kind: 'property_type_changed',
        model: 'Order',
        property: 'total',
        detail: '`Order.total` type changed: number → string',
      },
      {
        severity: 'breaking',
        kind: 'property_required_added',
        model: 'Order',
        property: 'total',
        detail: '`Order.total` is now required',
      },
    ])
    expect(result.hasBreaking).toBe(true)
    expect(result.hasAdditive).toBe(false)
  })

  it('classifies a removed endpoint as breaking', () => {
    const updated = clone(BASE)
    updated.endpoints = updated.endpoints.filter(
      (e) => !(e.method === 'POST' && e.path === '/orders')
    )

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'breaking',
        kind: 'endpoint_removed',
        endpoint: 'POST /orders',
        detail: '`POST /orders` endpoint removed',
      },
    ])
  })

  it('classifies an added endpoint as additive', () => {
    const updated = clone(BASE)
    updated.endpoints.push(endpoint('DELETE', '/orders/{id}'))

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes).toEqual([
      {
        severity: 'additive',
        kind: 'endpoint_added',
        endpoint: 'DELETE /orders/{id}',
        detail: '`DELETE /orders/{id}` endpoint added',
      },
    ])
  })

  it('orders a mixed diff breaking-first, then additive, in diff-encounter order', () => {
    const updated = clone(BASE)

    // Breaking changes, in the order they'll be encountered:
    // 1. model removed (Order)
    // 2. property removed (User.email)
    // 3. endpoint removed (POST /orders — dragged along with the Order model removal)
    delete updated.models.Order
    delete updated.models.User!.properties!.email
    updated.endpoints = updated.endpoints.filter(
      (e) => !(e.method === 'POST' && e.path === '/orders')
    )

    // Additive changes, in the order they'll be encountered:
    // 1. model added (Product)
    // 2. property added (User.name)
    // 3. endpoint added (DELETE /users/{id})
    updated.models.Product = model('Product', { id: prop('id', 'string') })
    updated.models.User!.properties!.name = prop('name', 'string')
    updated.endpoints.push(endpoint('DELETE', '/users/{id}'))

    const result = classifySchemaDiff(BASE, updated)

    expect(result.changes.map((c) => c.kind)).toEqual([
      'model_removed',
      'property_removed',
      'endpoint_removed',
      'model_added',
      'property_added',
      'endpoint_added',
    ])
    expect(result.changes.map((c) => c.severity)).toEqual([
      'breaking',
      'breaking',
      'breaking',
      'additive',
      'additive',
      'additive',
    ])
    expect(result.breaking).toHaveLength(3)
    expect(result.additive).toHaveLength(3)
    expect(result.hasBreaking).toBe(true)
    expect(result.hasAdditive).toBe(true)
  })
})
