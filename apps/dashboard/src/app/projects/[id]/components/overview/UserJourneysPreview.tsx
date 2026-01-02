/**
 * UserJourneysPreview Component
 *
 * Displays a preview of detected user journeys for the overview page.
 * Shows journey summaries with personas and step counts.
 * Supports inline expand for progressive disclosure of steps.
 *
 * Now also supports journey selection for demo composition:
 * - Radio-style selection (single journey per demo)
 * - "Use this Journey" button when a journey is selected
 */

'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Footprints,
  ChevronDown,
  ChevronRight,
  User,
  UserCog,
  Users,
  Crown,
  ArrowRight,
  Globe,
  Database,
  Sparkles,
  Check,
} from 'lucide-react'

export interface JourneyStep {
  order: number
  action: string
  description: string
  endpoint?: string
  model?: string
}

export interface UserJourney {
  id: string
  name: string
  description: string | null
  persona: string | null
  steps: JourneyStep[] | null
  confidence: number | null
}

interface UserJourneysPreviewProps {
  journeys: UserJourney[]
  maxVisible?: number
  onViewAll?: () => void
  loading?: boolean
  /** Currently selected journey ID (single selection) */
  selectedId?: string | null
  /** Callback when selection changes */
  onSelect?: (journey: UserJourney | null) => void
  /** Callback to create a demo from selected journey */
  onCreateDemoFromJourney?: (journey: UserJourney) => void
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

function getPersonaIcon(persona?: string | null) {
  if (!persona) return PERSONA_ICONS.default
  return PERSONA_ICONS[persona.toLowerCase()] || PERSONA_ICONS.default
}

function getPersonaLabel(persona?: string | null) {
  if (!persona) return 'User'
  return PERSONA_LABELS[persona.toLowerCase()] || persona
}

interface JourneyCardProps {
  journey: UserJourney
  isExpanded: boolean
  onToggle: () => void
  isSelected: boolean
  onSelect: () => void
}

function JourneyCard({ journey, isExpanded, onToggle, isSelected, onSelect }: JourneyCardProps) {
  const PersonaIcon = getPersonaIcon(journey.persona)
  const steps = journey.steps || []
  const stepCount = steps.length

  // Get first few step actions for preview
  const stepPreview = steps
    .slice(0, 3)
    .map((s) => s.action.split(' ').slice(0, 2).join(' '))

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`rounded-lg border bg-card hover:bg-muted/30 transition-colors ${
        isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
      }`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Selection indicator - radio style */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
              className={`mt-0.5 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
              aria-label={`Select ${journey.name}`}
            >
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </button>

            {/* Collapsible trigger for the rest */}
            <CollapsibleTrigger className="flex-1 flex items-start gap-3 text-left">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <PersonaIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{journey.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {getPersonaLabel(journey.persona)}
                  </Badge>
                  <ChevronDown
                    className={`h-4 w-4 ml-auto shrink-0 text-muted-foreground transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                {!isExpanded && journey.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {journey.description}
                  </p>
                )}

                {/* Step preview as flow - only when collapsed */}
                {!isExpanded && stepPreview.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground overflow-hidden">
                    {stepPreview.map((step, index) => (
                      <span key={index} className="flex items-center gap-1 shrink-0">
                        <span className="truncate max-w-[80px]">{step}</span>
                        {index < stepPreview.length - 1 && (
                          <ArrowRight className="h-3 w-3 shrink-0" />
                        )}
                      </span>
                    ))}
                    {stepCount > 3 && (
                      <span className="text-muted-foreground shrink-0">
                        +{stepCount - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {stepCount} steps
              </Badge>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-4 border-t mx-4">
            {/* Full description */}
            {journey.description && (
              <p className="text-sm text-muted-foreground pt-4">
                {journey.description}
              </p>
            )}

            {/* Full step list */}
            {steps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Journey Steps
                </p>
                <div className="space-y-2">
                  {steps.map((step, index) => (
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
                        <div className="flex flex-wrap gap-2 mt-1">
                          {step.endpoint && (
                            <Badge variant="outline" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              {step.endpoint}
                            </Badge>
                          )}
                          {step.model && (
                            <Badge variant="secondary" className="text-xs">
                              <Database className="h-3 w-3 mr-1" />
                              {step.model}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function JourneyCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-5 w-14 shrink-0" />
      </div>
    </div>
  )
}

export function UserJourneysPreview({
  journeys,
  maxVisible = 4,
  onViewAll,
  loading = false,
  selectedId: controlledSelectedId,
  onSelect,
  onCreateDemoFromJourney,
}: UserJourneysPreviewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Internal selection state (used when not controlled)
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)

  // Use controlled or internal state
  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId

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

  const handleSelect = useCallback((journey: UserJourney) => {
    // Toggle selection (clicking again deselects)
    const newSelectedId = selectedId === journey.id ? null : journey.id
    const newSelectedJourney = newSelectedId ? journey : null

    if (onSelect) {
      onSelect(newSelectedJourney)
    } else {
      setInternalSelectedId(newSelectedId)
    }
  }, [selectedId, onSelect])

  const handleCreateDemo = useCallback(() => {
    if (onCreateDemoFromJourney && selectedId) {
      const journey = journeys.find((j) => j.id === selectedId)
      if (journey) {
        onCreateDemoFromJourney(journey)
      }
    }
  }, [onCreateDemoFromJourney, selectedId, journeys])

  const clearSelection = useCallback(() => {
    if (onSelect) {
      onSelect(null)
    } else {
      setInternalSelectedId(null)
    }
  }, [onSelect])

  const selectedJourney = selectedId ? journeys.find((j) => j.id === selectedId) : null

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">User Journeys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <JourneyCardSkeleton />
          <JourneyCardSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (journeys.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">User Journeys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Footprints className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No user journeys detected yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Run intelligence analysis to detect journeys
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by confidence and take top N
  const sortedJourneys = [...journeys]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, maxVisible)

  const remainingCount = journeys.length - sortedJourneys.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            User Journeys ({journeys.length})
          </CardTitle>
          {journeys.length > maxVisible && onViewAll && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onViewAll}>
              View All
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Selection Actions Bar - appears when a journey is selected */}
      {selectedJourney && (
        <div className="px-6 pb-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">
                {selectedJourney.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
            {onCreateDemoFromJourney && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleCreateDemo}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Create Demo
              </Button>
            )}
          </div>
        </div>
      )}

      <CardContent className="space-y-3">
        {sortedJourneys.map((journey) => (
          <JourneyCard
            key={journey.id}
            journey={journey}
            isExpanded={expandedIds.has(journey.id)}
            onToggle={() => toggleExpanded(journey.id)}
            isSelected={selectedId === journey.id}
            onSelect={() => handleSelect(journey)}
          />
        ))}
        {remainingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={onViewAll}
          >
            +{remainingCount} more journeys
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
