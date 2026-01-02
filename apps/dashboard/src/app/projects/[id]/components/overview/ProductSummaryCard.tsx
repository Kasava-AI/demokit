/**
 * ProductSummaryCard Component
 *
 * Displays the app identity information extracted from AI analysis.
 * Shows app name, description, domain, industry, and value proposition.
 * Also includes the active fixture selector for quick access.
 * Supports expandable sections for progressive disclosure.
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  Target,
  Sparkles,
  Globe,
  Users,
  ChevronDown,
  Zap,
  Database,
  Check,
  Plus,
  ExternalLink,
} from 'lucide-react'

interface AppIdentity {
  name: string | null
  description: string | null
  domain: string | null
  industry: string | null
  targetAudience: string | null
  valueProposition: string | null
  confidence: number | null
}

interface AnalysisSummary {
  featureCount: number
  journeyCount: number
  templateCount: number
  analyzedAt?: string | null
}

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

interface ProductSummaryCardProps {
  projectName: string
  projectDescription?: string | null
  appIdentity?: AppIdentity | null
  analysisSummary?: AnalysisSummary | null
  activeFixture?: ActiveFixture | null
  fixtures?: FixtureOption[]
  onSetActiveFixture?: (fixtureId: string | null) => void
  onCreateFixture?: () => void
  onViewFixtures?: () => void
  isSettingActiveFixture?: boolean
  loading?: boolean
}

// Domain icon mapping
const DOMAIN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'e-commerce': Globe,
  'healthcare': Building2,
  'fintech': Building2,
  'saas': Sparkles,
  'social': Users,
  'education': Building2,
  'default': Sparkles,
}

function getDomainIcon(domain?: string | null) {
  if (!domain) return DOMAIN_ICONS.default
  return DOMAIN_ICONS[domain.toLowerCase()] || DOMAIN_ICONS.default
}

// Threshold for showing "See more" on descriptions
const DESCRIPTION_TRUNCATE_LENGTH = 150

// Format relative time
function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function ProductSummaryCard({
  projectName,
  projectDescription,
  appIdentity,
  analysisSummary,
  activeFixture,
  fixtures = [],
  onSetActiveFixture,
  onCreateFixture,
  onViewFixtures,
  isSettingActiveFixture = false,
  loading = false,
}: ProductSummaryCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const [fixtureDropdownOpen, setFixtureDropdownOpen] = useState(false)

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-6">
            <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayName = appIdentity?.name || projectName
  const displayDescription = appIdentity?.description || projectDescription || 'No description provided'
  const DomainIcon = getDomainIcon(appIdentity?.domain)
  const isDescriptionLong = displayDescription.length > DESCRIPTION_TRUNCATE_LENGTH
  const hasExtendedDetails = appIdentity?.targetAudience || appIdentity?.valueProposition
  const hasAnalysisSummary = analysisSummary && (analysisSummary.featureCount > 0 || analysisSummary.journeyCount > 0 || analysisSummary.templateCount > 0)

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex gap-6 min-w-0">
          {/* Icon/Logo placeholder */}
          <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <DomainIcon className="h-10 w-10 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold tracking-tight">
                  {displayName}
                </h2>
                {/* Expandable description */}
                {isDescriptionLong ? (
                  <div className="mt-1">
                    <p className="text-sm text-muted-foreground">
                      {isDescriptionExpanded
                        ? displayDescription
                        : `${displayDescription.slice(0, DESCRIPTION_TRUNCATE_LENGTH)}...`}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    >
                      {isDescriptionExpanded ? 'See less' : 'See more'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {displayDescription}
                  </p>
                )}
              </div>

              {/* Confidence badge */}
              {appIdentity?.confidence && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {Math.round(appIdentity.confidence * 100)}% AI confidence
                </Badge>
              )}
            </div>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {appIdentity?.domain && (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {appIdentity.domain}
                </Badge>
              )}
              {appIdentity?.industry && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {appIdentity.industry}
                </Badge>
              )}
            </div>

            {/* AI Analysis Summary */}
            {hasAnalysisSummary && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">AI Analysis</p>
                  {analysisSummary.analyzedAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatTimeAgo(analysisSummary.analyzedAt)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Detected {analysisSummary.featureCount} feature{analysisSummary.featureCount !== 1 ? 's' : ''}, {' '}
                  {analysisSummary.journeyCount} user journey{analysisSummary.journeyCount !== 1 ? 's' : ''}, and{' '}
                  {analysisSummary.templateCount} template{analysisSummary.templateCount !== 1 ? 's' : ''} from schema analysis
                  {appIdentity?.confidence && (
                    <> with {Math.round(appIdentity.confidence * 100)}% overall confidence</>
                  )}.
                </p>
              </div>
            )}

            {/* Expandable details section */}
            {hasExtendedDetails && (
              <Collapsible open={isDetailsExpanded} onOpenChange={setIsDetailsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 gap-1 text-xs text-muted-foreground hover:text-foreground h-auto p-0"
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        isDetailsExpanded ? 'rotate-180' : ''
                      }`}
                    />
                    {isDetailsExpanded ? 'Hide details' : 'Show more details'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 space-y-3">
                    {/* Target audience */}
                    {appIdentity?.targetAudience && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs font-medium text-muted-foreground">
                            Target Audience
                          </p>
                        </div>
                        <p className="text-sm text-foreground">
                          {appIdentity.targetAudience}
                        </p>
                      </div>
                    )}

                    {/* Value proposition */}
                    {appIdentity?.valueProposition && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs font-medium text-muted-foreground">
                            Value Proposition
                          </p>
                        </div>
                        <p className="text-sm text-foreground">
                          {appIdentity.valueProposition}
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Active Fixture Section */}
            <ActiveFixtureSection
              activeFixture={activeFixture}
              fixtures={fixtures}
              onSetActiveFixture={onSetActiveFixture}
              onCreateFixture={onCreateFixture}
              onViewFixtures={onViewFixtures}
              isSettingActiveFixture={isSettingActiveFixture}
              fixtureDropdownOpen={fixtureDropdownOpen}
              setFixtureDropdownOpen={setFixtureDropdownOpen}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Active Fixture inline section component
function ActiveFixtureSection({
  activeFixture,
  fixtures,
  onSetActiveFixture,
  onCreateFixture,
  onViewFixtures,
  isSettingActiveFixture,
  fixtureDropdownOpen,
  setFixtureDropdownOpen,
}: {
  activeFixture?: ActiveFixture | null
  fixtures: FixtureOption[]
  onSetActiveFixture?: (fixtureId: string | null) => void
  onCreateFixture?: () => void
  onViewFixtures?: () => void
  isSettingActiveFixture: boolean
  fixtureDropdownOpen: boolean
  setFixtureDropdownOpen: (open: boolean) => void
}) {
  const hasFixtures = fixtures.length > 0
  const recordsByModel = activeFixture?.activeGeneration?.recordsByModel || {}
  const modelNames = Object.keys(recordsByModel)

  return (
    <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">Active Fixture</p>
        </div>
        {hasFixtures && onSetActiveFixture && (
          <DropdownMenu open={fixtureDropdownOpen} onOpenChange={setFixtureDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={isSettingActiveFixture}>
                {isSettingActiveFixture ? (
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
                    onSetActiveFixture(fixture.id)
                    setFixtureDropdownOpen(false)
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

      {activeFixture ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium truncate">{activeFixture.name}</h4>
              {activeFixture.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {activeFixture.description}
                </p>
              )}
            </div>
            {onViewFixtures && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewFixtures}
                className="shrink-0 h-7 text-xs"
              >
                View
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Record counts by model */}
          {modelNames.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {modelNames.slice(0, 4).map((model) => (
                <Badge key={model} variant="secondary" className="text-xs">
                  {model}: {recordsByModel[model]}
                </Badge>
              ))}
              {modelNames.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{modelNames.length - 4} more
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
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            No active fixture selected
          </p>
          {onSetActiveFixture && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Select fixture
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {fixtures.map((fixture) => (
                  <DropdownMenuItem
                    key={fixture.id}
                    onClick={() => onSetActiveFixture(fixture.id)}
                  >
                    <Database className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <span className="truncate">{fixture.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            No fixtures yet
          </p>
          {onCreateFixture && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCreateFixture}>
              <Plus className="h-3 w-3 mr-1" />
              Create Fixture
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
