/**
 * DemoStore — the canonical dataset runtime (spec §3).
 *
 * Holds one dataset (entities + relationships). Mutations validate against the
 * pruned DataModel (types, enums, required) and the relationship graph; invalid
 * mutations throw StoreError, which the interceptor maps to a mock 4xx.
 */
import type { DemoData } from '../services/codegen/types'
import type { DataModel, PropertyDef } from '../services/schema/types'
import {
  StoreError,
  type DemoStore,
  type DemoStoreOptions,
  type ModelHandle,
  type Row,
  type StoreOp,
} from './types'

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Default value for a required property that was not provided. */
function defaultForProperty(prop: PropertyDef): unknown {
  if (prop.default !== undefined) return prop.default
  if (prop.enum && prop.enum.length > 0) return prop.enum[0]
  switch (prop.type) {
    case 'number':
    case 'integer':
      return 0
    case 'boolean':
      return false
    case 'array':
      return []
    case 'object':
      return {}
    default:
      if (prop.format === 'date-time' || prop.format === 'date') {
        return new Date().toISOString()
      }
      return ''
  }
}

function primitiveTypeMatches(prop: PropertyDef, value: unknown): boolean {
  switch (prop.type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
    case 'integer':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
    default:
      return true // arrays/objects/refs: not validated at this layer
  }
}

export function createDemoStore(options: DemoStoreOptions): DemoStore {
  const { models, relationships = [], idField = 'id' } = options
  const published: DemoData = deepCopy(options.data)
  let data: DemoData = deepCopy(options.data)
  let seqCounter = 0
  const listeners = new Set<(op: StoreOp) => void>()

  function emit(op: StoreOp): void {
    for (const listener of listeners) listener(op)
  }

  /** Non-mutating: returns empty array if model doesn't exist, without creating key. */
  function rows(model: string): Row[] {
    return (data[model] as Row[]) ?? []
  }

  /** Creates the model key if it doesn't exist; used only for mutations. */
  function ensureRows(model: string): Row[] {
    if (!data[model]) data[model] = []
    return data[model] as Row[]
  }

  function findRow(model: string, id: string): Row | undefined {
    return rows(model).find((r) => String(r[idField]) === String(id))
  }

  function modelDef(name: string): DataModel | undefined {
    return models?.[name]
  }

  function validateAttrs(model: string, attrs: Record<string, unknown>): void {
    const def = modelDef(model)
    if (!def?.properties) return
    for (const [key, value] of Object.entries(attrs)) {
      const prop = def.properties[key]
      if (!prop || value === null || value === undefined) continue
      if (!primitiveTypeMatches(prop, value)) {
        throw new StoreError(`${model}.${key}: expected ${prop.type}`)
      }
      if (prop.enum && prop.enum.length > 0 && !prop.enum.includes(value)) {
        throw new StoreError(`${model}.${key}: value not in enum`)
      }
    }
    // FK resolution for any provided relationship-source fields
    for (const rel of relationships) {
      if (rel.from.model !== model) continue
      const value = attrs[rel.from.field]
      if (value === null || value === undefined) continue
      const target = rows(rel.to.model).find(
        (r) => String(r[rel.to.field]) === String(value)
      )
      if (!target) {
        throw new StoreError(
          `${model}.${rel.from.field}: no ${rel.to.model} with ${rel.to.field}=${String(value)}`
        )
      }
    }
  }

  function doCreate(model: string, attrs: Partial<Row>): Row {
    if (models && !modelDef(model) && !published[model]) {
      throw new StoreError(`Unknown model: ${model}`, 404)
    }
    const def = modelDef(model)
    const row: Row = { ...attrs }
    if (row[idField] === undefined || row[idField] === null) {
      row[idField] = generateId()
    }
    // Fill defaults for missing required properties
    if (def?.required && def.properties) {
      for (const name of def.required) {
        if (row[name] === undefined || row[name] === null) {
          const prop = def.properties[name]
          const isFk = relationships.some(
            (rel) => rel.from.model === model && rel.from.field === name
          )
          if (isFk || !prop) {
            throw new StoreError(`${model}.${name} is required`)
          }
          row[name] = defaultForProperty(prop)
        }
      }
    }
    validateAttrs(model, row)
    ensureRows(model).push(row)
    return deepCopy(row)
  }

  function doUpdate(model: string, id: string, patch: Partial<Row>): Row {
    const row = findRow(model, id)
    if (!row) throw new StoreError(`${model} ${id} not found`, 404)
    if (
      patch[idField] !== undefined &&
      String(patch[idField]) !== String(row[idField])
    ) {
      throw new StoreError(`${model}.${idField} is immutable`)
    }
    validateAttrs(model, patch as Record<string, unknown>)
    Object.assign(row, patch)
    return deepCopy(row)
  }

  function doDelete(model: string, id: string): void {
    const list = rows(model)
    const index = list.findIndex((r) => String(r[idField]) === String(id))
    if (index === -1) throw new StoreError(`${model} ${id} not found`, 404)
    list.splice(index, 1)
    // Dependents: relationships whose target is this model
    for (const rel of relationships) {
      if (rel.to.model !== model) continue
      const dependents = rows(rel.from.model).filter(
        (r) => String(r[rel.from.field]) === String(id)
      )
      for (const dep of dependents) {
        if (rel.required) {
          doDelete(rel.from.model, String(dep[idField])) // cascade (recursive)
        } else {
          dep[rel.from.field] = null
        }
      }
    }
  }

  function record(op: Omit<StoreOp, 'seq'>): StoreOp {
    const full: StoreOp = { ...op, seq: ++seqCounter }
    emit(full)
    return full
  }

  const store: DemoStore = {
    model(name: string): ModelHandle {
      return {
        all: () => deepCopy(rows(name)),
        find: (id) => {
          const row = findRow(name, id)
          return row ? deepCopy(row) : undefined
        },
        where: (pred) => {
          const matches =
            typeof pred === 'function'
              ? rows(name).filter(pred)
              : rows(name).filter((r) =>
                  Object.entries(pred).every(([k, v]) => String(r[k]) === String(v))
                )
          return deepCopy(matches)
        },
        create: (attrs) => {
          const row = doCreate(name, attrs)
          record({ model: name, op: 'create', id: String(row[idField]), attrs: deepCopy(row) })
          return row
        },
        update: (id, patch) => {
          const row = doUpdate(name, id, patch)
          record({ model: name, op: 'update', id, attrs: deepCopy(patch) as Record<string, unknown> })
          return row
        },
        delete: (id) => {
          doDelete(name, id)
          record({ model: name, op: 'delete', id })
        },
      }
    },

    snapshot: () => deepCopy(data),

    reset(): void {
      data = deepCopy(published)
      seqCounter = 0
    },

    applyOpLog(ops: StoreOp[]): void {
      for (const op of ops) {
        try {
          if (op.op === 'create') doCreate(op.model, op.attrs ?? {})
          else if (op.op === 'update') doUpdate(op.model, op.id, op.attrs ?? {})
          else doDelete(op.model, op.id)
          seqCounter = Math.max(seqCounter, op.seq)
        } catch (error) {
          // Deterministic replay onto the same seed should never fail; tolerate
          // tampered/stale storage rather than breaking the demo session.
          console.warn('[DemoKit] Skipping unreplayable op:', op, error)
        }
      }
    },

    loadSnapshot(next: DemoData, seq = seqCounter): void {
      data = deepCopy(next)
      seqCounter = seq
    },

    onOp(listener): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    seq: () => seqCounter,
  }

  return store
}
