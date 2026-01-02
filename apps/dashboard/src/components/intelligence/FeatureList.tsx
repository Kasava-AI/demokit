/**
 * FeatureList Component
 *
 * Display detected features from AppIntelligence.
 * Shows feature name, description, related models, and data requirements.
 * Allows toggling features on/off for generation.
 */

import { useState, useMemo } from 'react'
import type { Feature, FeatureCategory } from '@intelligence'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Boxes,
  ChevronDown,
  Database,
  Settings,
  Zap,
  BarChart3,
  Link2,
  Shield,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface FeatureListProps {
  features: Feature[]
  selectedFeatureIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  /** Alternative to onSelectionChange for simple toggle */
  onFeatureToggle?: (featureId: string, selected: boolean) => void
  selectedFeatures?: string[]
  disabled?: boolean
  /** Show selection checkboxes */
  selectable?: boolean
  /** Compact mode - shows minimal UI without card wrapper */
  compact?: boolean
  /** Maximum features to show before "View all" link. Default 5 */
  maxVisible?: number
  /** Show loading skeleton */
  loading?: boolean
}

// Default number of features to show (design principle: 3-5 items)
const DEFAULT_MAX_VISIBLE = 5

// Skeleton for loading state
function FeatureItemSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-3 w-3 rounded" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-16 ml-auto" />
    </div>
  )
}

// ============================================================================
// Category Configuration
// ============================================================================

const CATEGORY_CONFIG: Record<
  FeatureCategory,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  core: { icon: Boxes, label: 'Core' },
  advanced: { icon: Zap, label: 'Advanced' },
  admin: { icon: Shield, label: 'Admin' },
  integration: { icon: Link2, label: 'Integration' },
  analytics: { icon: BarChart3, label: 'Analytics' },
  settings: { icon: Settings, label: 'Settings' },
}

// ============================================================================
// Component
// ============================================================================

export function FeatureList({
  features,
  selectedFeatureIds,
  onSelectionChange,
  onFeatureToggle,
  selectedFeatures,
  disabled = false,
  selectable = false,
  compact = false,
  maxVisible = DEFAULT_MAX_VISIBLE,
  loading = false,
}: FeatureListProps) {
  // Support both selectedFeatureIds and selectedFeatures props
  const effectiveSelectedIds = selectedFeatureIds ?? selectedFeatures
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

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

  const toggleFeature = (id: string) => {
    const currentSelection = effectiveSelectedIds || []
    const isCurrentlySelected = currentSelection.includes(id)

    // Use onFeatureToggle if available
    if (onFeatureToggle) {
      onFeatureToggle(id, !isCurrentlySelected)
      return
    }

    // Fall back to onSelectionChange
    if (!onSelectionChange) return

    if (isCurrentlySelected) {
      onSelectionChange(currentSelection.filter((fid) => fid !== id))
    } else {
      onSelectionChange([...currentSelection, id])
    }
  }

  const selectAll = () => {
    onSelectionChange?.(features.map((f) => f.id))
  }

  const selectNone = () => {
    onSelectionChange?.([])
  }

  const renderFeature = (feature: Feature) => {
    const isExpanded = expandedIds.has(feature.id)
    const isSelected = effectiveSelectedIds?.includes(feature.id) ?? true

    return (
      <Collapsible key={feature.id} open={isExpanded} onOpenChange={() => toggleExpanded(feature.id)}>
        <div
          className={`border rounded-lg transition-colors ${
            isSelected ? 'bg-background' : 'bg-muted/30 opacity-60'
          }`}
        >
          <div className="flex items-start gap-3 p-3">
            {selectable && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleFeature(feature.id)}
                disabled={disabled}
                className="mt-1"
              />
            )}
            <div className="flex-1 min-w-0">
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <span className="font-medium text-sm">{feature.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {Math.round(feature.confidence * 100)}% confidence
                </Badge>
                <ChevronDown
                  className={`h-4 w-4 ml-auto shrink-0 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {feature.description}
              </p>
            </div>
          </div>

          <CollapsibleContent>
            <div className="px-3 pb-3 pt-0 space-y-3 border-t mt-2">
              <p className="text-sm text-muted-foreground pt-3">
                {feature.description}
              </p>

              {/* Related Models */}
              {feature.relatedModels.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Related Models
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {feature.relatedModels.map((model) => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        <Database className="h-3 w-3 mr-1" />
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {feature.actions && feature.actions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    User Actions
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {feature.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Requirements */}
              {feature.dataRequirements && feature.dataRequirements.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Data Requirements
                  </p>
                  <div className="space-y-1">
                    {feature.dataRequirements.map((req, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{req.model}:</span>
                        <span>{req.suggestedCount} records</span>
                        {req.conditions && req.conditions.length > 0 && (
                          <span className="text-yellow-600">
                            ({req.conditions.join(', ')})
                          </span>
                        )}
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

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        <FeatureItemSkeleton />
        <FeatureItemSkeleton />
        <FeatureItemSkeleton />
        <FeatureItemSkeleton />
        <FeatureItemSkeleton />
      </div>
    )
  }

  if (features.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No features detected
      </p>
    )
  }

  // Compact mode - just show feature list without card wrapper
  if (compact) {
    return (
      <div className="space-y-2">
        {features.slice(0, 5).map((feature) => (
          <div key={feature.id} className="flex items-center gap-2 text-sm">
            <Boxes className="h-3 w-3 text-muted-foreground" />
            <span>{feature.name}</span>
            <Badge variant="outline" className="text-xs ml-auto">
              {feature.category}
            </Badge>
          </div>
        ))}
        {features.length > 5 && (
          <p className="text-xs text-muted-foreground">
            +{features.length - 5} more features
          </p>
        )}
      </div>
    )
  }

  // Progressive disclosure: limit visible features unless expanded
  const visibleFeatures = showAll ? features : features.slice(0, maxVisible)
  const hiddenCount = features.length - visibleFeatures.length

  // Group only visible features
  const visibleGroupedFeatures = useMemo(() => {
    const groups: Record<FeatureCategory, Feature[]> = {
      core: [],
      advanced: [],
      admin: [],
      integration: [],
      analytics: [],
      settings: [],
    }

    visibleFeatures.forEach((feature) => {
      groups[feature.category].push(feature)
    })

    return Object.entries(groups).filter(([_, feats]) => feats.length > 0) as [
      FeatureCategory,
      Feature[]
    ][]
  }, [visibleFeatures])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {features.length} feature{features.length !== 1 ? 's' : ''} detected
        </p>
        {selectable && onSelectionChange && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll} disabled={disabled}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone} disabled={disabled}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Feature list - no scroll area, use progressive disclosure */}
      <div className="space-y-3">
        {visibleGroupedFeatures.map(([category, categoryFeatures]) => {
          const config = CATEGORY_CONFIG[category]
          const Icon = config.icon

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
              </div>
              <div className="space-y-2 pl-5">
                {categoryFeatures.map(renderFeature)}
              </div>
            </div>
          )
        })}
      </div>

      {/* View all link - progressive disclosure */}
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(true)}
        >
          View all ({features.length})
        </Button>
      )}

      {/* Collapse link when expanded */}
      {showAll && features.length > maxVisible && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(false)}
        >
          Show less
        </Button>
      )}
    </div>
  )
}
