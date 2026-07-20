/**
 * Prune DataModels to the properties the store needs at runtime:
 * types, enums, required, relationship targets (spec §3.1). Server-side
 * payload builders call this so descriptions/examples never ship.
 */
import type { DataModel, PropertyDef } from '../services/schema/types'

function prunePropertyDef(prop: PropertyDef): PropertyDef {
  const pruned: PropertyDef = { name: prop.name, type: prop.type }
  if (prop.format !== undefined) pruned.format = prop.format
  if (prop.required !== undefined) pruned.required = prop.required
  if (prop.nullable !== undefined) pruned.nullable = prop.nullable
  if (prop.enum !== undefined) pruned.enum = prop.enum
  if (prop.$ref !== undefined) pruned.$ref = prop.$ref
  return pruned
}

export function pruneModelsForRuntime(
  models: Record<string, DataModel>
): Record<string, DataModel> {
  const result: Record<string, DataModel> = {}
  for (const [name, model] of Object.entries(models)) {
    const pruned: DataModel = { name: model.name, type: model.type }
    if (model.required !== undefined) pruned.required = model.required
    if (model.enum !== undefined) pruned.enum = model.enum
    if (model.properties) {
      pruned.properties = Object.fromEntries(
        Object.entries(model.properties).map(([key, prop]) => [key, prunePropertyDef(prop)])
      )
    }
    result[name] = pruned
  }
  return result
}
