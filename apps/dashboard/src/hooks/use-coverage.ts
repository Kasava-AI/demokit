import { useQuery } from '@tanstack/react-query'
import type { DriftFinding } from '@demokit-ai/core'

export interface CoverageTotals {
  eventType: string
  count: number
}

export interface CoveragePathRow {
  eventType: string
  method: string | null
  path: string | null
  count: number
}

/**
 * A shape-drift finding rolled up across concrete paths that share the same
 * templated endpoint (Phase 5 Task 6) — see the coverage route's
 * `rollupFindings`. `occurrences` is always >= 1.
 */
export type DriftRow = DriftFinding & { occurrences: number }

/**
 * Shape-drift report (Phase 5 Task 5/6): observed response shapes on
 * `unmatched_request` events, diffed against the project's synced schema.
 * `null` when the project has no schema synced — distinct from a synced
 * schema with zero findings.
 */
export interface CoverageDrift {
  findings: DriftRow[]
  observedCount: number
  matchedCount: number
}

export interface CoverageReport {
  since: string
  totals: CoverageTotals[]
  topPaths: CoveragePathRow[]
  drift: CoverageDrift | null
}

async function fetchCoverage(projectId: string, fixtureId: string): Promise<CoverageReport> {
  const res = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/coverage`)
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch coverage')
  }
  return res.json()
}

/**
 * Hook to fetch the coverage-health aggregate for a fixture (spec §8):
 * unmatched requests, blocked mutations, unregistered transforms, and
 * projection errors over the last 7 days, plus a top-paths breakdown.
 */
export function useCoverage(projectId: string, fixtureId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId, 'fixtures', fixtureId, 'coverage'],
    queryFn: () => fetchCoverage(projectId, fixtureId!),
    enabled: !!projectId && !!fixtureId,
    staleTime: 60 * 1000,
  })
}
