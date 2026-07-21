import { useQuery } from '@tanstack/react-query'

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

export interface CoverageReport {
  since: string
  totals: CoverageTotals[]
  topPaths: CoveragePathRow[]
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
