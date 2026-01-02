/**
 * DynamicTemplateGrid Component
 *
 * Grid display of generated narrative templates.
 * Shows template name, scenario, key points. Allows selection and customization.
 */

import React, { useState, useMemo } from 'react'
import type { DynamicNarrativeTemplate, TemplateCategory } from '@intelligence'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  GraduationCap,
  Presentation,
  RefreshCw,
  ArrowRight,
  ArrowRightLeft,
  Check,
  Star,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface DynamicTemplateGridProps {
  templates: DynamicNarrativeTemplate[]
  /** Array of selected template IDs for multi-select */
  selectedTemplateIds?: string[]
  onSelect?: (template: DynamicNarrativeTemplate) => void
  onCustomize?: (template: DynamicNarrativeTemplate) => void
  disabled?: boolean
  /** Maximum templates to show before "View all" link. Default 4 */
  maxVisible?: number
  /** Compact mode - reduces visual density */
  compact?: boolean
  /** Show loading skeleton */
  loading?: boolean
}

// Skeleton for loading state
function TemplateCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

// Default number of templates to show (design principle: 3-5 items)
const DEFAULT_MAX_VISIBLE = 4

// ============================================================================
// Category Configuration
// ============================================================================

const CATEGORY_CONFIG: Record<
  TemplateCategory,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  onboarding: { icon: Users, label: 'Onboarding', color: 'bg-primary/10 text-primary' },
  happyPath: { icon: Check, label: 'Happy Path', color: 'bg-success/10 text-success' },
  edgeCase: { icon: AlertTriangle, label: 'Edge Case', color: 'bg-warning/10 text-warning' },
  recovery: { icon: RefreshCw, label: 'Recovery', color: 'bg-warning/10 text-warning' },
  growth: { icon: TrendingUp, label: 'Growth', color: 'bg-success/10 text-success' },
  decline: { icon: TrendingDown, label: 'Decline', color: 'bg-destructive/10 text-destructive' },
  comparison: { icon: ArrowRight, label: 'Comparison', color: 'bg-primary/10 text-primary' },
  demo: { icon: Presentation, label: 'Demo', color: 'bg-primary/10 text-primary' },
  training: { icon: GraduationCap, label: 'Training', color: 'bg-primary/10 text-primary' },
  migration: { icon: ArrowRightLeft, label: 'Migration', color: 'bg-primary/10 text-primary' },
}

// ============================================================================
// Component
// ============================================================================

export function DynamicTemplateGrid({
  templates,
  selectedTemplateIds = [],
  onSelect,
  // onCustomize - reserved for future use
  disabled = false,
  maxVisible = DEFAULT_MAX_VISIBLE,
  compact = false,
  loading = false,
}: DynamicTemplateGridProps) {
  const selectedIds = useMemo(() => new Set(selectedTemplateIds), [selectedTemplateIds])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all')
  const [showAll, setShowAll] = useState(false)

  // Get unique categories from templates
  const availableCategories = useMemo(() => {
    const categories = new Set(templates.map((t) => t.category))
    return Array.from(categories) as TemplateCategory[]
  }, [templates])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Category filter
      if (categoryFilter !== 'all' && template.category !== categoryFilter) {
        return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.narrative.scenario.toLowerCase().includes(query) ||
          template.narrative.keyPoints.some((p) => p.toLowerCase().includes(query))
        )
      }

      return true
    })
  }, [templates, categoryFilter, searchQuery])

  // Sort by relevance score
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => b.relevanceScore - a.relevanceScore)
  }, [filteredTemplates])

  // Progressive disclosure: limit visible templates unless expanded or searching
  const visibleTemplates = useMemo(() => {
    // Show all when searching, filtering by category, or explicitly expanded
    if (showAll || searchQuery.trim() || categoryFilter !== 'all') {
      return sortedTemplates
    }
    return sortedTemplates.slice(0, maxVisible)
  }, [sortedTemplates, showAll, searchQuery, categoryFilter, maxVisible])

  const hiddenCount = sortedTemplates.length - visibleTemplates.length

  const renderTemplateCard = (template: DynamicNarrativeTemplate) => {
    const isSelected = selectedIds.has(template.id)
    const categoryConfig = CATEGORY_CONFIG[template.category]

    return (
      <div
        key={template.id}
        className={`
          cursor-pointer transition-colors rounded-lg border bg-card p-4
          ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border hover:bg-muted/30'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => !disabled && onSelect?.(template)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{template.name}</h4>
              {template.relevanceScore >= 0.8 && (
                <Star className="h-3 w-3 fill-warning text-warning shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {template.description}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {categoryConfig.label}
          </Badge>
        </div>

        {/* Scenario preview - simplified */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {template.narrative.scenario}
        </p>

        {/* Key points - show only 2 in compact mode */}
        {!compact && (
          <div className="space-y-1">
            {template.narrative.keyPoints.slice(0, 2).map((point, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-muted-foreground text-xs">•</span>
                <p className="text-xs text-muted-foreground line-clamp-1">{point}</p>
              </div>
            ))}
            {template.narrative.keyPoints.length > 2 && (
              <p className="text-xs text-muted-foreground/70">
                +{template.narrative.keyPoints.length - 2} more
              </p>
            )}
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-1 text-xs text-primary">
            <Check className="h-3 w-3" />
            Selected
          </div>
        )}
      </div>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TemplateCardSkeleton />
          <TemplateCardSkeleton />
          <TemplateCardSkeleton />
          <TemplateCardSkeleton />
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No templates available yet</p>
        <p className="text-xs mt-1">Upload an API schema to generate templates</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>

        {/* Category filter */}
        {availableCategories.length > 1 && (
          <Tabs
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as TemplateCategory | 'all')}
          >
            <AnimatedTabsList variant="underline" layoutId="template-category-tabs">
              <AnimatedTabsTrigger variant="underline" value="all" isActive={categoryFilter === 'all'} layoutId="template-category-indicator">All</AnimatedTabsTrigger>
              {availableCategories.slice(0, 4).map((category) => {
                const config = CATEGORY_CONFIG[category]
                return (
                  <AnimatedTabsTrigger key={category} variant="underline" value={category} isActive={categoryFilter === category} layoutId="template-category-indicator">
                    {config.label}
                  </AnimatedTabsTrigger>
                )
              })}
            </AnimatedTabsList>
          </Tabs>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {sortedTemplates.length} template{sortedTemplates.length !== 1 ? 's' : ''}
          {categoryFilter !== 'all' && ` in ${CATEGORY_CONFIG[categoryFilter].label}`}
        </span>
        {selectedIds.size > 0 && (
          <span className="flex items-center gap-1">
            <Check className="h-4 w-4 text-primary" />
            {selectedIds.size} selected
          </span>
        )}
      </div>

      {/* Grid - no scroll area, use progressive disclosure instead */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleTemplates.map(renderTemplateCard)}
      </div>

      {/* View all link - progressive disclosure */}
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(true)}
        >
          View all ({sortedTemplates.length})
        </Button>
      )}

      {/* Collapse link when expanded */}
      {showAll && sortedTemplates.length > maxVisible && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(false)}
        >
          Show less
        </Button>
      )}

      {/* Empty search state - minimal */}
      {visibleTemplates.length === 0 && searchQuery && (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">No matching templates</p>
          <Button variant="link" size="sm" onClick={() => setSearchQuery('')}>
            Clear search
          </Button>
        </div>
      )}
    </div>
  )
}
