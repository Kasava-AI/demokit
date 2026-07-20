import { describe, it, expect } from 'vitest'
import { pruneModelsForRuntime } from './prune'
import type { DataModel } from '../services/schema/types'

describe('pruneModelsForRuntime', () => {
  it('keeps runtime-relevant fields and drops docs/examples', () => {
    const models: Record<string, DataModel> = {
      users: {
        name: 'users',
        type: 'object',
        description: 'A very long description that should not ship',
        example: { id: 'u1' },
        required: ['id'],
        properties: {
          id: { name: 'id', type: 'string', format: 'uuid', required: true, description: 'drop me', example: 'u1' },
          role: { name: 'role', type: 'string', enum: ['admin', 'member'], nullable: true },
          orgId: { name: 'orgId', type: 'string', $ref: '#/components/schemas/Org' },
        },
      },
    }
    const pruned = pruneModelsForRuntime(models)
    const user = pruned.users!
    expect(user.description).toBeUndefined()
    expect(user.example).toBeUndefined()
    expect(user.required).toEqual(['id'])
    expect(user.properties!.id).toEqual({ name: 'id', type: 'string', format: 'uuid', required: true })
    expect(user.properties!.role).toEqual({ name: 'role', type: 'string', enum: ['admin', 'member'], nullable: true })
    expect(user.properties!.orgId!.$ref).toBe('#/components/schemas/Org')
  })

  it('preserves a property default', () => {
    const models: Record<string, DataModel> = {
      widgets: {
        name: 'widgets',
        type: 'object',
        properties: {
          status: { name: 'status', type: 'string', default: 'x' },
        },
      },
    }
    const pruned = pruneModelsForRuntime(models)
    expect(pruned.widgets!.properties!.status!.default).toBe('x')
  })

  it('does not add a default key when the source property has none', () => {
    const models: Record<string, DataModel> = {
      widgets: {
        name: 'widgets',
        type: 'object',
        properties: {
          label: { name: 'label', type: 'string' },
        },
      },
    }
    const pruned = pruneModelsForRuntime(models)
    expect('default' in pruned.widgets!.properties!.label!).toBe(false)
  })
})
