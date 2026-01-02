/**
 * DemoScenariosPreview Component
 *
 * Unified view of demo scenarios combining templates with their linked journeys.
 * Primary action: Create fixtures from scenarios.
 * Secondary: Understand and customize app flows.
 *
 * Uses progressive disclosure: collapsed shows scenario snippet and mini journey flow,
 * expanded reveals full narrative, key points, characters, timeline, and journey steps.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Plus,
  User,
  UserCog,
  Users,
  Crown,
  Calendar,
  Users2,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react'

interface JourneyStep {
  order: number
  action: string
  description?: string
  endpoint?: string
  model?: string
}

interface UserJourney {
  id: string
  name: string
  description: string | null
  persona: string | null
  steps: JourneyStep[] | null
  confidence: number | null
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  relevanceScore: number | null
  narrative: {
    scenario: string
    keyPoints: string[]
    tone?: string
    targetAudience?: string
  } | null
  instructions: {
    recordCounts?: Record<string, number>
  } | null
  // Joined journey data
  journey?: UserJourney | null
}

interface Fixture {
  id: string
  name: string
  templateId: string | null
  recordCount: number | null
  status: string | null
}

interface DemoScenariosPreviewProps {
  templates: Template[]
  fixtures?: Fixture[]
  maxVisible?: number
  onViewAll?: () => void
  onCreateFromTemplate?: (templateId: string) => void
  onViewFixture?: (fixtureId: string) => void
  loading?: boolean
}

// Persona icon mapping
const PERSONA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_user: User,
  power_user: UserCog,
  admin: Crown,
  team: Users,
  default: User,
}

const PERSONA_LABELS: Record<string, string> = {
  new_user: 'New User',
  power_user: 'Power User',
  admin: 'Admin',
  team: 'Team',
}

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  happyPath: 'Happy Path',
  edgeCase: 'Edge Case',
  recovery: 'Recovery',
  growth: 'Growth',
  decline: 'Decline',
  comparison: 'Comparison',
  demo: 'Demo',
  training: 'Training',
  migration: 'Migration',
}

function getPersonaIcon(persona?: string | null) {
  if (!persona) return PERSONA_ICONS.default
  return PERSONA_ICONS[persona.toLowerCase()] || PERSONA_ICONS.default
}

function getPersonaLabel(persona?: string | null) {
  if (!persona) return 'User'
  return PERSONA_LABELS[persona.toLowerCase()] || persona
}

function getCategoryLabel(category?: string | null) {
  if (!category) return 'Demo'
  return CATEGORY_LABELS[category] || category
}

function getRelevanceColor(score: number | null) {
  if (!score) return 'text-muted-foreground'
  if (score >= 0.8) return 'text-green-600'
  if (score >= 0.6) return 'text-yellow-600'
  return 'text-muted-foreground'
}

interface ScenarioCardProps {
  template: Template
  fixtures: Fixture[]
  isExpanded: boolean
  onToggle: () => void
  onCreateFixture?: () => void
  onViewFixture?: (fixtureId: string) => void
}

function ScenarioCard({ template, fixtures, isExpanded, onToggle, onCreateFixture, onViewFixture }: ScenarioCardProps) {
  const relevancePercent = template.relevanceScore
    ? Math.round(template.relevanceScore * 100)
    : null
  const PersonaIcon = getPersonaIcon(template.journey?.persona)

  // Get journey steps for mini flow preview
  const journeySteps = template.journey?.steps || []
  const miniFlowSteps = journeySteps.slice(0, 4).map((s) => {
    // Extract first 2-3 words of action
    const words = s.action.split(' ')
    return words.slice(0, 2).join(' ')
  })

  // Get scenario snippet (first ~100 chars)
  const scenarioSnippet = template.narrative?.scenario
    ? template.narrative.scenario.length > 120
      ? template.narrative.scenario.slice(0, 120) + '...'
      : template.narrative.scenario
    : template.description || ''

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer">
            {/* Header row: Icon, Name, Relevance badge, Chevron */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-primary/10 shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{template.name}</span>
                  {relevancePercent && (
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${getRelevanceColor(template.relevanceScore)}`}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {relevancePercent}% match
                    </Badge>
                  )}
                </div>

                {/* Category and Persona tags */}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {getCategoryLabel(template.category)}
                  </Badge>
                  {template.journey?.persona && (
                    <Badge variant="outline" className="text-xs">
                      <PersonaIcon className="h-3 w-3 mr-1" />
                      {getPersonaLabel(template.journey.persona)}
                    </Badge>
                  )}
                </div>

                {/* Scenario snippet - only when collapsed */}
                {!isExpanded && scenarioSnippet && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    "{scenarioSnippet}"
                  </p>
                )}

                {/* Mini journey flow - only when collapsed */}
                {!isExpanded && miniFlowSteps.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground overflow-hidden">
                    {miniFlowSteps.map((step, index) => (
                      <span key={index} className="flex items-center gap-1 shrink-0">
                        <span className="truncate max-w-[80px]">{step}</span>
                        {index < miniFlowSteps.length - 1 && (
                          <ArrowRight className="h-3 w-3 shrink-0" />
                        )}
                      </span>
                    ))}
                    {journeySteps.length > 4 && (
                      <span className="text-muted-foreground shrink-0">
                        +{journeySteps.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Fixtures created from this scenario - only when collapsed */}
                {!isExpanded && fixtures.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Database className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-1 flex-wrap">
                      {fixtures.slice(0, 3).map((fixture) => (
                        <Badge
                          key={fixture.id}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewFixture?.(fixture.id)
                          }}
                        >
                          {fixture.name}
                          {fixture.recordCount && (
                            <span className="ml-1 text-muted-foreground">
                              ({fixture.recordCount})
                            </span>
                          )}
                        </Badge>
                      ))}
                      {fixtures.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{fixtures.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right side: Create button (collapsed) and Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                {!isExpanded && onCreateFixture && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateFixture()
                    }}
                  >
                    Create
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-4 border-t mx-4">
            {/* Full Scenario */}
            {template.narrative?.scenario && (
              <div className="pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Scenario
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {template.narrative.scenario}
                </p>
              </div>
            )}

            {/* Key Points */}
            {template.narrative?.keyPoints && template.narrative.keyPoints.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Key Points
                </p>
                <ul className="space-y-1">
                  {template.narrative.keyPoints.map((point, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Characters and Timeline - side by side if both present */}
            {(template.narrative?.targetAudience || template.narrative?.tone) && (
              <div className="grid grid-cols-2 gap-4">
                {template.narrative?.targetAudience && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Users2 className="h-3 w-3" />
                      Target Audience
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {template.narrative.targetAudience}
                    </p>
                  </div>
                )}
                {template.narrative?.tone && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Tone
                    </p>
                    <p className="text-sm text-muted-foreground">{template.narrative.tone}</p>
                  </div>
                )}
              </div>
            )}

            {/* Journey Steps */}
            {journeySteps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Journey Steps ({journeySteps.length})
                </p>
                <div className="space-y-2">
                  {journeySteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-xs font-medium shrink-0">
                        {step.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{step.action}</p>
                        {step.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Record counts (for power users) */}
            {template.instructions?.recordCounts &&
              Object.keys(template.instructions.recordCounts).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Suggested Data
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(template.instructions.recordCounts).map(([model, count]) => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        {count} {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {/* Fixtures created from this scenario */}
            {fixtures.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Fixtures ({fixtures.length})
                </p>
                <div className="space-y-2">
                  {fixtures.map((fixture) => (
                    <div
                      key={fixture.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewFixture?.(fixture.id)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{fixture.name}</span>
                        {fixture.recordCount && (
                          <Badge variant="secondary" className="text-xs">
                            {fixture.recordCount} records
                          </Badge>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Fixture CTA */}
            {onCreateFixture && (
              <div className="pt-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateFixture()
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Fixture from Scenario
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function ScenarioCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-16 shrink-0" />
      </div>
    </div>
  )
}

export function DemoScenariosPreview({
  templates,
  fixtures = [],
  maxVisible = 4,
  onViewAll,
  onCreateFromTemplate,
  onViewFixture,
  loading = false,
}: DemoScenariosPreviewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Group fixtures by templateId for quick lookup
  const fixturesByTemplateId = fixtures.reduce((acc, fixture) => {
    if (fixture.templateId) {
      if (!acc[fixture.templateId]) {
        acc[fixture.templateId] = []
      }
      acc[fixture.templateId].push(fixture)
    }
    return acc
  }, {} as Record<string, Fixture[]>)

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demo Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScenarioCardSkeleton />
          <ScenarioCardSkeleton />
          <ScenarioCardSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demo Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No demo scenarios available yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run intelligence analysis to generate scenarios
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by relevance and take top N
  const sortedTemplates = [...templates]
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, maxVisible)

  const remainingCount = templates.length - sortedTemplates.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Demo Scenarios ({templates.length})</CardTitle>
          {templates.length > maxVisible && onViewAll && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onViewAll}>
              View All
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedTemplates.map((template) => (
          <ScenarioCard
            key={template.id}
            template={template}
            fixtures={fixturesByTemplateId[template.id] || []}
            isExpanded={expandedIds.has(template.id)}
            onToggle={() => toggleExpanded(template.id)}
            onCreateFixture={
              onCreateFromTemplate ? () => onCreateFromTemplate(template.id) : undefined
            }
            onViewFixture={onViewFixture}
          />
        ))}
        {remainingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={onViewAll}
          >
            +{remainingCount} more scenarios
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
