import type { Framework, ScanResult, DetectedEndpoint } from '../types'
import { collectFiles } from './file-collector'
import { findFetchCalls } from './fetch-finder'
import { verbose } from '../utils/logger'
import { parseSchemaMultiFormat, type Endpoint } from '@demokit-ai/core'

/**
 * Scan a project for API endpoints and data models.
 *
 * Uses two strategies:
 * 1. Core schema parsers (for Next.js API routes, tRPC routers, Drizzle/Prisma schemas)
 * 2. Fetch-finder (for client-side fetch/useSWR/useQuery calls)
 */
export function scanProject(dir: string, framework: Framework): ScanResult {
  const files = collectFiles(dir)

  // Strategy 1: Parse schemas using core parsers
  let schemaEndpoints: DetectedEndpoint[] = []
  let models: string[] = []

  try {
    const result = parseSchemaMultiFormat(files)

    if (result.schema.endpoints.length > 0) {
      schemaEndpoints = result.schema.endpoints.map((ep: Endpoint) => ({
        method: ep.method,
        path: ep.path.replace(/\{(\w+)\}/g, ':$1'), // Convert {id} to :id
        source: 'schema' as const,
      }))
    }

    models = Object.keys(result.schema.models)
    verbose(`Schema parser found ${schemaEndpoints.length} endpoints, ${models.length} models`)
  } catch (err) {
    verbose(`Schema parsing failed: ${err instanceof Error ? err.message : 'unknown error'}`)
  }

  // Strategy 2: Find fetch calls in client code
  const fetchEndpoints = findFetchCalls(files)

  // Merge and deduplicate
  const allEndpoints = deduplicateEndpoints([...schemaEndpoints, ...fetchEndpoints])

  return {
    endpoints: allEndpoints,
    models,
    files: files.map((f) => f.path),
  }
}

function deduplicateEndpoints(endpoints: DetectedEndpoint[]): DetectedEndpoint[] {
  const seen = new Map<string, DetectedEndpoint>()

  for (const ep of endpoints) {
    const key = `${ep.method} ${ep.path}`
    const existing = seen.get(key)
    // Prefer schema-sourced endpoints over fetch-call-sourced
    if (!existing || (ep.source === 'schema' && existing.source !== 'schema')) {
      seen.set(key, ep)
    }
  }

  return Array.from(seen.values())
}
