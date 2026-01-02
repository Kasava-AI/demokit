/**
 * ActiveFixtureCard Component
 *
 * Displays the currently active fixture for the project.
 * Shows fixture name, record counts, and quick actions.
 * Allows selecting a different fixture as active.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Database,
  ChevronDown,
  Check,
  Plus,
  ExternalLink,
  Zap,
} from 'lucide-react'

interface ActiveFixture {
  id: string
  name: string
  description: string | null
  recordCount: number | null
  activeGeneration: {
    id: string
    data: Record<string, unknown[]> | null
    recordCount: number | null
    recordsByModel: Record<string, number> | null
  } | null
}

interface FixtureOption {
  id: string
  name: string
  recordCount: number | null
}

interface ActiveFixtureCardProps {
  activeFixture: ActiveFixture | null
  fixtures: FixtureOption[]
  onSetActive: (fixtureId: string | null) => void
  onCreateFixture: () => void
  onViewFixtures: () => void
  isSettingActive?: boolean
  loading?: boolean
}

export function ActiveFixtureCard({
  activeFixture,
  fixtures,
  onSetActive,
  onCreateFixture,
  onViewFixtures,
  isSettingActive = false,
  loading = false,
}: ActiveFixtureCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  const hasFixtures = fixtures.length > 0
  const recordsByModel = activeFixture?.activeGeneration?.recordsByModel || {}
  const modelNames = Object.keys(recordsByModel)

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Active Fixture</CardTitle>
          </div>
          {hasFixtures && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isSettingActive}>
                  {isSettingActive ? (
                    'Setting...'
                  ) : (
                    <>
                      Change
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {fixtures.map((fixture) => (
                  <DropdownMenuItem
                    key={fixture.id}
                    onClick={() => {
                      onSetActive(fixture.id)
                      setDropdownOpen(false)
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{fixture.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {fixture.recordCount && (
                        <span className="text-xs text-muted-foreground">
                          {fixture.recordCount} records
                        </span>
                      )}
                      {activeFixture?.id === fixture.id && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreateFixture}>
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Create new fixture
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <CardDescription>
          The fixture used as default for API calls in demo mode
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeFixture ? (
          <div className="space-y-3">
            {/* Fixture info */}
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h4 className="font-medium truncate">{activeFixture.name}</h4>
                {activeFixture.description && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {activeFixture.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewFixtures}
                className="shrink-0"
              >
                View
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>

            {/* Record counts by model */}
            {modelNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {modelNames.slice(0, 5).map((model) => (
                  <Badge key={model} variant="secondary" className="text-xs">
                    {model}: {recordsByModel[model]}
                  </Badge>
                ))}
                {modelNames.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{modelNames.length - 5} more
                  </Badge>
                )}
              </div>
            )}

            {/* Total records */}
            {activeFixture.activeGeneration?.recordCount && (
              <p className="text-xs text-muted-foreground">
                {activeFixture.activeGeneration.recordCount} total records
              </p>
            )}
          </div>
        ) : hasFixtures ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No active fixture selected
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Select a fixture
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {fixtures.map((fixture) => (
                  <DropdownMenuItem
                    key={fixture.id}
                    onClick={() => onSetActive(fixture.id)}
                  >
                    <Database className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <span className="truncate">{fixture.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="text-center py-4">
            <Database className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No fixtures yet. Create one to use in demo mode.
            </p>
            <Button variant="outline" size="sm" onClick={onCreateFixture}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Fixture
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
