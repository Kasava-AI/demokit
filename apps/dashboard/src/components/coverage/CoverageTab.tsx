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

import { useMemo, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFixtures } from '@/hooks/use-fixtures'
import { useCoverage } from '@/hooks/use-coverage'
import { cn } from '@/lib/utils'

interface CoverageTabProps {
  projectId: string
}

const STAT_DEFS = [
  { eventType: 'unmatched_request', label: 'Unmatched requests' },
  { eventType: 'blocked_mutation', label: 'Blocked mutations' },
  { eventType: 'unregistered_transform', label: 'Unregistered transforms' },
  { eventType: 'projection_error', label: 'Projection errors' },
] as const

const EVENT_META: Record<string, { label: string; dot: string }> = {
  // `bg-warning` is this app's established semantic token for exactly this
  // meaning (see e.g. PublishSection.tsx's identical status-dot pattern) —
  // not raw `bg-amber-500`.
  unmatched_request: { label: 'Unmatched', dot: 'bg-warning' },
  blocked_mutation: { label: 'Blocked', dot: 'bg-destructive' },
  // No semantic violet/info token exists in this app; `bg-violet-500` matches
  // the precedent already used for a similar tile in GenerateStep.tsx.
  unregistered_transform: { label: 'No transform', dot: 'bg-violet-500' },
  projection_error: { label: 'Error', dot: 'bg-destructive' },
}

export function CoverageTab({ projectId }: CoverageTabProps) {
  const { data: fixtures = [] } = useFixtures(projectId)
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | undefined>(undefined)

  // Default to the first fixture with a hosted-API key — coverage events
  // only ever land for fixtures the hosted API has actually served, so
  // picking one arbitrarily would frequently land on a guaranteed-empty tab.
  const defaultFixtureId = useMemo(() => {
    if (fixtures.length === 0) return undefined
    const withApiKey = fixtures.find((f) => !!f.apiKey)
    return (withApiKey ?? fixtures[0]).id
  }, [fixtures])

  // Self-healing selection: Next's App Router does not remount this tree on
  // a changing `[id]` route segment, so `selectedFixtureId` state can survive
  // a project-to-project navigation and point at a fixture the new project
  // doesn't have. Deriving the effective id from the current fixtures list
  // (instead of trusting raw state) means a stale id silently falls back to
  // the new project's default rather than sending a foreign fixtureId to
  // `useCoverage` and rendering its 404 as a false "no events yet".
  const effectiveFixtureId = useMemo(() => {
    if (selectedFixtureId && fixtures.some((f) => f.id === selectedFixtureId)) {
      return selectedFixtureId
    }
    return defaultFixtureId
  }, [selectedFixtureId, fixtures, defaultFixtureId])

  const {
    data: coverage,
    isLoading,
    isError,
    error,
    refetch,
  } = useCoverage(projectId, effectiveFixtureId ?? null)

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
          <Select value={effectiveFixtureId} onValueChange={setSelectedFixtureId}>
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

        {effectiveFixtureId && (
          <>
            {isError ? (
              <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      Failed to load coverage data
                    </p>
                    <p className="mt-1 text-sm text-destructive/80">
                      {error instanceof Error ? error.message : 'Something went wrong.'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="mr-2 size-3.5" />
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
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
