/**
 * JourneyList Component
 *
 * Display detected user journeys from AppIntelligence.
 * Shows journey name, steps, and data touched at each step.
 */

import { useState } from 'react'
import type { UserJourney } from '@intelligence'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Users,
  ChevronDown,
  ArrowRight,
  Database,
  Footprints,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface JourneyListProps {
  journeys: UserJourney[]
  selectedJourneyId?: string
  onSelect?: (journey: UserJourney) => void
  disabled?: boolean
  /** Compact mode - shows minimal UI without card wrapper */
  compact?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function JourneyList({
  journeys,
  selectedJourneyId,
  onSelect,
  disabled = false,
  compact = false,
}: JourneyListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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

  const renderJourney = (journey: UserJourney) => {
    const isExpanded = expandedIds.has(journey.id)
    const isSelected = selectedJourneyId === journey.id

    return (
      <Collapsible
        key={journey.id}
        open={isExpanded}
        onOpenChange={() => toggleExpanded(journey.id)}
      >
        <div
          className={`border rounded-lg transition-all ${
            isSelected ? 'ring-2 ring-primary' : ''
          } ${disabled ? 'opacity-50' : 'hover:border-primary/50 cursor-pointer'}`}
          onClick={() => !disabled && onSelect?.(journey)}
        >
          <div className="p-4">
            <CollapsibleTrigger
              className="flex items-start gap-3 w-full text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{journey.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {journey.persona}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {journey.steps.length} steps
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(journey.confidence * 100)}% confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {journey.description}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <Separator />
            <div className="p-4 space-y-4">
              {/* Steps */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Journey Steps
                </p>
                <div className="space-y-3">
                  {journey.steps.map((step, index) => (
                    <div key={index} className="flex gap-3">
                      {/* Step number */}
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {step.order}
                        </div>
                        {index < journey.steps.length - 1 && (
                          <div className="w-0.5 flex-1 bg-muted my-1" />
                        )}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 pb-3">
                        <p className="text-sm font-medium">{step.action}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <ArrowRight className="h-3 w-3" />
                          {step.outcome}
                        </p>
                        {step.modelsAffected.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {step.modelsAffected.map((model) => (
                              <Badge
                                key={model}
                                variant="outline"
                                className="text-xs"
                              >
                                <Database className="h-3 w-3 mr-1" />
                                {model}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features Used */}
              {journey.featuresUsed.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Features Used
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {journey.featuresUsed.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Flow */}
              {journey.dataFlow.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Data Flow
                  </p>
                  <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
                    {journey.dataFlow.map((entity, index) => (
                      <span key={entity} className="flex items-center">
                        <span className="font-mono">{entity}</span>
                        {index < journey.dataFlow.length - 1 && (
                          <ArrowRight className="h-3 w-3 mx-1" />
                        )}
                      </span>
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

  if (journeys.length === 0) {
    if (compact) {
      return <p className="text-sm text-muted-foreground py-4 text-center">No user journeys detected</p>
    }
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Footprints className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No user journeys detected</p>
        </CardContent>
      </Card>
    )
  }

  // Compact mode - just show journey list without card wrapper
  if (compact) {
    return (
      <div className="space-y-2">
        {journeys.slice(0, 3).map((journey) => (
          <div key={journey.id} className="flex items-center gap-2 text-sm">
            <Footprints className="h-3 w-3 text-muted-foreground" />
            <span>{journey.name}</span>
            <Badge variant="outline" className="text-xs ml-auto">
              {journey.steps.length} steps
            </Badge>
          </div>
        ))}
        {journeys.length > 3 && (
          <p className="text-xs text-muted-foreground">
            +{journeys.length - 3} more journeys
          </p>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          User Journeys ({journeys.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {journeys.map(renderJourney)}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
