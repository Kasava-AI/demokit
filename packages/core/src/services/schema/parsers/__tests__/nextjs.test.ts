import { describe, it, expect } from 'vitest'
import { parseNextJS } from '../nextjs'
import { detectShapeDrift } from '../../drift'
import type { CodebaseFile } from '../types'
import type { DemokitSchema } from '../../types'
import type { ObservedShape } from '../../../shape'

/** Build a minimal App Router `route.ts` file with a GET handler at `path`. */
function appRouterFile(path: string): CodebaseFile {
  return {
    path,
    content: `
export async function GET(request: Request) {
  return Response.json({ ok: true })
}
`,
  }
}

/** Build a minimal Pages Router API file at `path`. */
function pagesRouterFile(path: string): CodebaseFile {
  return {
    path,
    content: `
export default function handler(req, res) {
  res.status(200).json({ ok: true })
}
`,
  }
}

describe('parseNextJS — bracket-to-brace path conversion', () => {
  it('converts a single dynamic segment [id] to {id}', () => {
    const result = parseNextJS([appRouterFile('app/api/users/[id]/route.ts')])

    const paths = result.schema.endpoints.map((e) => e.path)
    expect(paths).toContain('/api/users/{id}')
    expect(paths.some((p) => p.includes('['))).toBe(false)
  })

  it('converts multiple dynamic segments in one path ([orgId]/[userId])', () => {
    const result = parseNextJS([
      appRouterFile('app/api/orgs/[orgId]/users/[userId]/route.ts'),
    ])

    const endpoint = result.schema.endpoints.find((e) => e.method === 'GET')
    expect(endpoint?.path).toBe('/api/orgs/{orgId}/users/{userId}')
    expect(endpoint?.pathParams.map((p) => p.name)).toEqual(['orgId', 'userId'])
  })

  it('converts a catch-all segment [...slug] to a single {slug} param', () => {
    // Chosen mapping: the schema's brace grammar has no multi-segment param
    // representation, so a catch-all collapses to the same single-segment
    // {param} template as a plain dynamic segment (see convertBracketsToBraces
    // in ../nextjs.ts for the full rationale).
    const result = parseNextJS([appRouterFile('app/api/files/[...slug]/route.ts')])

    const endpoint = result.schema.endpoints.find((e) => e.method === 'GET')
    expect(endpoint?.path).toBe('/api/files/{slug}')
    expect(endpoint?.pathParams.map((p) => p.name)).toEqual(['slug'])
  })

  it('converts an optional catch-all segment [[...slug]] to a single {slug} param', () => {
    const result = parseNextJS([appRouterFile('app/api/docs/[[...slug]]/route.ts')])

    const endpoint = result.schema.endpoints.find((e) => e.method === 'GET')
    expect(endpoint?.path).toBe('/api/docs/{slug}')
    expect(endpoint?.pathParams.map((p) => p.name)).toEqual(['slug'])
    expect(endpoint?.path.includes('[')).toBe(false)
  })

  it('leaves a static route path unchanged', () => {
    const result = parseNextJS([appRouterFile('app/api/health/route.ts')])

    const endpoint = result.schema.endpoints.find((e) => e.method === 'GET')
    expect(endpoint?.path).toBe('/api/health')
    expect(endpoint?.pathParams).toEqual([])
  })

  it('also converts brackets for Pages Router routes', () => {
    const result = parseNextJS([pagesRouterFile('pages/api/users/[id].ts')])

    const paths = result.schema.endpoints.map((e) => e.path)
    expect(paths).toContain('/api/users/{id}')
  })

  it('matches a converted bracket endpoint in detectShapeDrift instead of reporting unknown_endpoint', () => {
    const parsed = parseNextJS([appRouterFile('app/api/users/[id]/route.ts')])
    const schema: DemokitSchema = parsed.schema

    const observed: ObservedShape[] = [
      { method: 'GET', path: '/api/users/42', shape: { t: 'object', keys: {} } },
    ]

    const result = detectShapeDrift(observed, schema)

    expect(result.matchedCount).toBe(1)
    expect(result.findings.some((f) => f.kind === 'unknown_endpoint')).toBe(false)
  })
})
