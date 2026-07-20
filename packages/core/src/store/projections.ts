/**
 * Projection layer (spec §4): compiles cloud EndpointMappings into FixtureMap
 * handlers that read/mutate the DemoStore. Supersedes buildFixtureMap when the
 * payload ships models + relationships.
 */
import type {
  EndpointMapping,
  FixtureHandler,
  FixtureMap,
  QueryParamConfig,
  RequestContext,
} from '../types'
import { demoResponse } from '../interceptor'
import { StoreError, type DemoStore, type Row, type TransformRegistry } from './types'

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

function applyQueryParams(
  rows: Row[],
  config: QueryParamConfig | null | undefined,
  searchParams: URLSearchParams
): unknown {
  if (!config) return rows

  let result = rows
  if (config.filters) {
    for (const [param, field] of Object.entries(config.filters)) {
      const value = searchParams.get(param)
      if (value !== null && value !== '') {
        result = result.filter((row) => String(row[field]) === value)
      }
    }
  }

  if (config.sortParam) {
    const sort = searchParams.get(config.sortParam)
    if (sort) {
      const desc = sort.startsWith('-')
      const field = desc ? sort.slice(1) : sort
      result = [...result].sort((a, b) => {
        const cmp = compareValues(a[field], b[field])
        return desc ? -cmp : cmp
      })
    }
  }

  const total = result.length
  let page = 1
  if (config.pagination) {
    const p = config.pagination
    if (p.style === 'offset') {
      // Clamp so a negative limit/offset query param can't reach .slice()
      // with negative indices (which slice from the end of the array).
      const limit = Math.max(1, Number(searchParams.get(p.limitParam ?? 'limit')) || p.defaultLimit || 25)
      const offset = Math.max(0, Number(searchParams.get(p.offsetParam ?? 'offset')) || 0)
      page = Math.floor(offset / limit) + 1
      result = result.slice(offset, offset + limit)
    } else {
      const perPage = Math.max(1, Number(searchParams.get(p.limitParam ?? 'perPage')) || p.defaultLimit || 25)
      page = Math.max(1, Number(searchParams.get(p.pageParam ?? 'page')) || 1)
      result = result.slice((page - 1) * perPage, page * perPage)
    }
  }

  if (config.envelope === 'data-total-page') {
    return { data: result, total, page }
  }
  return result
}

/** Dedupe key: mappings that already warned about an all-NaN aggregate don't warn again. */
const warnedAllNaNAggregates = new Set<string>()

function warnIfAllNaNAggregate(rows: Row[], mapping: EndpointMapping, field: string | undefined): void {
  if (rows.length === 0) return
  const allNaN = rows.every((row) => Number.isNaN(Number(row[field ?? ''])))
  if (!allNaN) return
  const key = `${mapping.method} ${mapping.pattern}`
  if (warnedAllNaNAggregates.has(key)) return
  warnedAllNaNAggregates.add(key)
  console.warn(
    `[DemoKit] Aggregate ${mapping.aggregateConfig?.function} on field "${field ?? '(none)'}" for ${key} found no numeric values in any row — check aggregateConfig.field.`
  )
}

function aggregate(rows: Row[], mapping: EndpointMapping): unknown {
  const config = mapping.aggregateConfig
  if (!config) {
    throw new StoreError(`Aggregate mapping ${mapping.pattern} has no aggregateConfig`, 500)
  }
  const num = (row: Row): number => Number(row[config.field ?? '']) || 0

  // An all-NaN aggregate (every row missing/non-numeric on `field`) is a
  // config error, never data noise — warn once per mapping, not per call.
  if (config.function === 'sum' || config.function === 'avg') {
    warnIfAllNaNAggregate(rows, mapping, config.field)
  }

  if (config.groupBy) {
    const groups = new Map<unknown, Row[]>()
    for (const row of rows) {
      const key = row[config.groupBy]
      const bucket = groups.get(key)
      if (bucket) bucket.push(row)
      else groups.set(key, [row])
    }
    return {
      groups: Array.from(groups.entries()).map(([key, bucket]) => {
        if (config.function === 'sum') return { key, sum: bucket.reduce((s, r) => s + num(r), 0) }
        if (config.function === 'avg') {
          return { key, avg: bucket.length ? bucket.reduce((s, r) => s + num(r), 0) / bucket.length : 0 }
        }
        return { key, count: bucket.length }
      }),
    }
  }

  switch (config.function) {
    case 'count':
      return { count: rows.length }
    case 'sum':
      return { sum: rows.reduce((s, r) => s + num(r), 0) }
    case 'avg':
      return { avg: rows.length ? rows.reduce((s, r) => s + num(r), 0) / rows.length : 0 }
    default:
      throw new StoreError(`Unknown aggregate function for ${mapping.pattern}`, 500)
  }
}

function lookupId(mapping: EndpointMapping, context: RequestContext): string {
  const param = mapping.lookupParam ?? 'id'
  const value = context.params[param]
  if (value === undefined) {
    throw new StoreError(`Missing URL param :${param} for ${mapping.pattern}`, 500)
  }
  return value
}

function createProjectionHandler(
  mapping: EndpointMapping,
  store: DemoStore,
  transforms?: TransformRegistry
): FixtureHandler | undefined {
  const model = () => store.model(mapping.sourceModel)

  switch (mapping.responseType) {
    case 'collection':
      return (context: RequestContext) =>
        applyQueryParams(model().all(), mapping.queryParamConfig, context.searchParams)

    case 'single':
      return (context: RequestContext) => {
        const field = mapping.lookupField ?? 'id'
        const value = lookupId(mapping, context)
        const row = model()
          .all()
          .find((r) => String(r[field]) === value)
        if (!row) {
          throw new StoreError(`${mapping.sourceModel} ${value} not found`, 404)
        }
        return row
      }

    case 'create':
      return (context: RequestContext) =>
        demoResponse(model().create((context.body ?? {}) as Partial<Row>), 201)

    case 'update':
      return (context: RequestContext) =>
        model().update(lookupId(mapping, context), (context.body ?? {}) as Partial<Row>)

    case 'delete':
      return (context: RequestContext) => {
        model().delete(lookupId(mapping, context))
        return demoResponse(null, 204)
      }

    case 'aggregate':
      return () => aggregate(model().all(), mapping)

    case 'transform': {
      const name = mapping.transformName
      const fn = name ? transforms?.[name] : undefined
      if (!fn) {
        console.warn(
          `[DemoKit] Mapping ${mapping.method} ${mapping.pattern} names unregistered transform "${name ?? '(none)'}" — falling back to the unmatched policy.`
        )
        return undefined
      }
      return (context: RequestContext) =>
        fn({
          store,
          params: context.params,
          searchParams: context.searchParams,
          body: context.body,
          method: context.method,
          url: context.url,
        })
    }

    default:
      console.warn(
        `[DemoKit] Unknown response type "${mapping.responseType}" for pattern: ${mapping.pattern}`
      )
      return undefined
  }
}

/**
 * Compile endpoint mappings into store-backed fixture handlers.
 * Mappings that cannot be served (unregistered transform, unknown type) are
 * omitted so the interceptor's unmatched policy applies (spec §4.2).
 */
export function buildProjectionMap(
  mappings: EndpointMapping[],
  store: DemoStore,
  transforms?: TransformRegistry
): FixtureMap {
  const map: FixtureMap = {}
  for (const mapping of mappings) {
    const handler = createProjectionHandler(mapping, store, transforms)
    if (handler !== undefined) {
      map[`${mapping.method} ${mapping.pattern}`] = handler
    }
  }
  return map
}
