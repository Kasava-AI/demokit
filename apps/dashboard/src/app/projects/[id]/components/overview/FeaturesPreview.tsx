/**
 * FeaturesPreview Component
 *
 * Displays a preview of detected features for the overview page.
 * Shows top features with confidence scores and a "View All" link.
 * Supports inline expand for progressive disclosure.
 *
 * Now also supports feature selection for demo composition:
 * - Checkboxes are always visible for selection
 * - "Create Demo from Selected" button appears when features are selected
 */

'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Database,
  Zap,
  Shield,
  Link2,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react'

export interface Feature {
  id: string
  name: string
  description: string | null
  category: string | null
  relatedModels: string[] | null
  confidence: number | null
}

interface FeaturesPreviewProps {
  features: Feature[]
  maxVisible?: number
  onViewAll?: () => void
  loading?: boolean
  /** Currently selected feature IDs (controlled) */
  selectedIds?: Set<string>
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void
  /** Callback to create a demo from selected features */
  onCreateDemoFromSelected?: (selectedFeatures: Feature[]) => void
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  core: Boxes,
  advanced: Zap,
  admin: Shield,
  integration: Link2,
  analytics: BarChart3,
  settings: Settings,
  default: Boxes,
}

function getCategoryIcon(category?: string | null) {
  if (!category) return CATEGORY_ICONS.default
  return CATEGORY_ICONS[category.toLowerCase()] || CATEGORY_ICONS.default
}

interface FeatureItemProps {
  feature: Feature
  isExpanded: boolean
  onToggle: () => void
  isSelected: boolean
  onSelectionChange: (checked: boolean) => void
}

function FeatureItem({ feature, isExpanded, onToggle, isSelected, onSelectionChange }: FeatureItemProps) {
  const CategoryIcon = getCategoryIcon(feature.category)
  const confidencePercent = feature.confidence ? Math.round(feature.confidence * 100) : null

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`rounded-lg border bg-card hover:bg-muted/30 transition-colors ${
        isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
      }`}>
        <div className="flex items-start gap-3 p-3">
          {/* Checkbox - always visible for selection */}
          <div
            className="pt-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              aria-label={`Select ${feature.name}`}
            />
          </div>

          {/* Collapsible trigger for the rest */}
          <CollapsibleTrigger className="flex-1 flex items-start gap-3 text-left">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <CategoryIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{feature.name}</span>
                {confidencePercent && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {confidencePercent}%
                  </Badge>
                )}
                <ChevronDown
                  className={`h-4 w-4 ml-auto shrink-0 text-muted-foreground transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {!isExpanded && feature.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {feature.description}
                </p>
              )}
            </div>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3 border-t mx-3">
            {/* Full description */}
            {feature.description && (
              <p className="text-sm text-muted-foreground pt-3">
                {feature.description}
              </p>
            )}

            {/* Category */}
            {feature.category && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Category</p>
                <Badge variant="secondary" className="text-xs">
                  {feature.category}
                </Badge>
              </div>
            )}

            {/* Related Models */}
            {feature.relatedModels && feature.relatedModels.length > 0 && (
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function FeatureItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <Skeleton className="h-7 w-7 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

export function FeaturesPreview({
  features,
  maxVisible = 4,
  onViewAll,
  loading = false,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  onCreateDemoFromSelected,
}: FeaturesPreviewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Internal selection state (used when not controlled)
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set())

  // Use controlled or internal state
  const selectedIds = controlledSelectedIds ?? internalSelectedIds
  const setSelectedIds = useCallback((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    const newValue = typeof updater === 'function' ? updater(selectedIds) : updater
    if (onSelectionChange) {
      onSelectionChange(newValue)
    } else {
      setInternalSelectedIds(newValue)
    }
  }, [selectedIds, onSelectionChange])

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

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [setSelectedIds])

  const handleCreateDemo = useCallback(() => {
    if (onCreateDemoFromSelected && selectedIds.size > 0) {
      const selectedFeatures = features.filter((f) => selectedIds.has(f.id))
      onCreateDemoFromSelected(selectedFeatures)
    }
  }, [onCreateDemoFromSelected, selectedIds, features])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [setSelectedIds])

  const selectAll = useCallback(() => {
    const allIds = new Set(features.map((f) => f.id))
    setSelectedIds(allIds)
  }, [features, setSelectedIds])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detected Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <FeatureItemSkeleton />
          <FeatureItemSkeleton />
          <FeatureItemSkeleton />
          <FeatureItemSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (features.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detected Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Boxes className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No features detected yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Run intelligence analysis to detect features
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by confidence and take top N
  const sortedFeatures = [...features]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, maxVisible)

  const remainingCount = features.length - sortedFeatures.length

  const hasSelection = selectedIds.size > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Detected Features ({features.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            {features.length > maxVisible && onViewAll && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onViewAll}>
                View All
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Selection Actions Bar - appears when features are selected */}
      {hasSelection && (
        <div className="px-6 pb-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">
                {selectedIds.size} feature{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={clearSelection}
              >
                Clear
              </Button>
              {selectedIds.size < features.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={selectAll}
                >
                  Select All
                </Button>
              )}
            </div>
            {onCreateDemoFromSelected && (
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

      <CardContent className="space-y-2">
        {sortedFeatures.map((feature) => (
          <FeatureItem
            key={feature.id}
            feature={feature}
            isExpanded={expandedIds.has(feature.id)}
            onToggle={() => toggleExpanded(feature.id)}
            isSelected={selectedIds.has(feature.id)}
            onSelectionChange={(checked) => toggleSelection(feature.id, checked as boolean)}
          />
        ))}
        {remainingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={onViewAll}
          >
            +{remainingCount} more features
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
