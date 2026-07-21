'use client'

/**
 * CoverageTab (Phase 3 Task 11)
 *
 * Coverage-health tab (spec §8): per-fixture unmatched requests, blocked
 * mutations, unregistered transforms, and projection errors over the last
 * 7 days, sourced from Task 4's aggregate route
 * (`/api/projects/[id]/fixtures/[fixtureId]/coverage`).
 *
 * Note: this is a top-level tab component, matching the sibling pattern in
 * `app/projects/[id]/components/` (FixturesTab, IntegrationsTab,
 * GenerationRulesTabWrapper) — it owns its own `<TabsContent value="coverage">`
 * wrapper rather than page.tsx wrapping it inline, since that's how every
 * other tab body is actually structured there.
 */

import { useEffect, useMemo, useState } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFixtures, type FixtureWithRelations } from '@/hooks/use-fixtures'
import { useCoverage } from '@/hooks/use-coverage'
import { cn } from '@/lib/utils'

interface CoverageTabProps {
  projectId: string
}

/**
 * The fixtures list route (`GET /api/projects/[id]/fixtures`) selects the
 * full `fixtures` row (no column projection), so `apiKey` is present on the
 * wire even though the hand-maintained `Fixture` interface in
 * `use-fixtures.ts` doesn't declare it (same gap Task 9 found for
 * `demoId`/`variantId`). Extended locally here rather than widening the
 * shared hook type, since this is the only consumer that needs it.
 */
type FixtureWithApiKey = FixtureWithRelations & { apiKey?: string | null }

const STAT_DEFS = [
  { eventType: 'unmatched_request', label: 'Unmatched requests' },
  { eventType: 'blocked_mutation', label: 'Blocked mutations' },
  { eventType: 'unregistered_transform', label: 'Unregistered transforms' },
  { eventType: 'projection_error', label: 'Projection errors' },
] as const

const EVENT_META: Record<string, { label: string; dot: string }> = {
  unmatched_request: { label: 'Unmatched', dot: 'bg-amber-500' },
  blocked_mutation: { label: 'Blocked', dot: 'bg-destructive' },
  unregistered_transform: { label: 'No transform', dot: 'bg-violet-500' },
  projection_error: { label: 'Error', dot: 'bg-destructive' },
}

export function CoverageTab({ projectId }: CoverageTabProps) {
  const { data: fixtures = [] } = useFixtures(projectId)
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | undefined>(undefined)

  // Default to the first fixture with a hosted-API key — coverage events
  // only ever land for fixtures the hosted API has actually served, so
  // picking one arbitrarily would frequently land on a guaranteed-empty tab.
  useEffect(() => {
    if (selectedFixtureId || fixtures.length === 0) return
    const withApiKey = fixtures.find((f) => !!(f as FixtureWithApiKey).apiKey)
    setSelectedFixtureId((withApiKey ?? fixtures[0]).id)
  }, [fixtures, selectedFixtureId])

  const {
    data: coverage,
    isLoading,
  } = useCoverage(projectId, selectedFixtureId ?? null)

  const countsByType = useMemo(() => {
    const map = new Map<string, number>()
    for (const total of coverage?.totals ?? []) {
      map.set(total.eventType, total.count)
    }
    return map
  }, [coverage?.totals])

  const hasEvents = !!coverage && (coverage.totals.length > 0 || coverage.topPaths.length > 0)

  return (
    <TabsContent value="coverage" className="flex-1 overflow-y-auto mt-0">
      <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Fixture:</span>
          <Select value={selectedFixtureId} onValueChange={setSelectedFixtureId}>
            <SelectTrigger className="w-64 h-8">
              <SelectValue placeholder="Select fixture" />
            </SelectTrigger>
            <SelectContent>
              {fixtures.map((fixture) => (
                <SelectItem key={fixture.id} value={fixture.id}>
                  {fixture.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedFixtureId && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {STAT_DEFS.map((stat) => (
                  <Skeleton key={stat.eventType} className="h-16" />
                ))}
              </div>
            ) : !hasEvents ? (
              <p className="text-sm text-muted-foreground">
                No coverage events yet. Events appear when a demo session runs against this
                fixture&apos;s hosted API.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {STAT_DEFS.map((stat) => (
                    <Card key={stat.eventType} className="bg-background">
                      <CardContent className="p-4">
                        <p className="text-2xl font-semibold">
                          {countsByType.get(stat.eventType) ?? 0}
                        </p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coverage?.topPaths.map((row, index) => {
                      const meta = EVENT_META[row.eventType] ?? {
                        label: row.eventType,
                        dot: 'bg-muted-foreground',
                      }
                      return (
                        <TableRow key={`${row.eventType}-${row.method}-${row.path}-${index}`}>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <span
                                className={cn('h-2 w-2 rounded-full shrink-0', meta.dot)}
                                aria-hidden
                              />
                              {meta.label}
                            </span>
                          </TableCell>
                          <TableCell>{row.method ?? '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{row.path ?? '—'}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {coverage && (
                  <p className="text-xs text-muted-foreground">
                    Since {new Date(coverage.since).toLocaleDateString()} · counts over the last 7
                    days
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </TabsContent>
  )
}
