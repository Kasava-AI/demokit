/**
 * TemplatesPreview Component
 *
 * Displays a preview of available templates for the overview page.
 * Shows template name, category, and relevance score.
 * Supports inline expand for progressive disclosure.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FileCode,
  ChevronDown,
  ChevronRight,
  Layers,
  Zap,
  ShieldCheck,
  Database,
  Users,
  Settings,
  Sparkles,
} from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  relevanceScore: number | null
}

interface TemplatesPreviewProps {
  templates: Template[]
  maxVisible?: number
  onViewAll?: () => void
  loading?: boolean
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  crud: Database,
  auth: ShieldCheck,
  admin: Settings,
  user: Users,
  api: Zap,
  workflow: Layers,
  default: FileCode,
}

const CATEGORY_LABELS: Record<string, string> = {
  crud: 'CRUD Operations',
  auth: 'Authentication',
  admin: 'Admin Panel',
  user: 'User Management',
  api: 'API Integration',
  workflow: 'Workflow',
}

function getCategoryIcon(category?: string | null) {
  if (!category) return CATEGORY_ICONS.default
  return CATEGORY_ICONS[category.toLowerCase()] || CATEGORY_ICONS.default
}

function getCategoryLabel(category?: string | null) {
  if (!category) return 'General'
  return CATEGORY_LABELS[category.toLowerCase()] || category
}

function getRelevanceColor(score: number | null) {
  if (!score) return 'text-muted-foreground'
  if (score >= 0.8) return 'text-green-600'
  if (score >= 0.6) return 'text-yellow-600'
  return 'text-muted-foreground'
}

interface TemplateItemProps {
  template: Template
  isExpanded: boolean
  onToggle: () => void
}

function TemplateItem({ template, isExpanded, onToggle }: TemplateItemProps) {
  const CategoryIcon = getCategoryIcon(template.category)
  const relevancePercent = template.relevanceScore
    ? Math.round(template.relevanceScore * 100)
    : null

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start gap-3 p-3">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <CategoryIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{template.name}</span>
                {relevancePercent && (
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${getRelevanceColor(template.relevanceScore)}`}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {relevancePercent}% match
                  </Badge>
                )}
                <ChevronDown
                  className={`h-4 w-4 ml-auto shrink-0 text-muted-foreground transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {!isExpanded && template.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {template.description}
                </p>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3 border-t mx-3">
            {/* Full description */}
            {template.description && (
              <p className="text-sm text-muted-foreground pt-3">{template.description}</p>
            )}

            {/* Category */}
            {template.category && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Category</p>
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(template.category)}
                </Badge>
              </div>
            )}

            {/* Relevance explanation */}
            {relevancePercent && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  AI Relevance Score
                </p>
                <p className="text-xs text-muted-foreground">
                  This template is {relevancePercent}% relevant to your project based on schema
                  analysis
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function TemplateItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <Skeleton className="h-7 w-7 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

export function TemplatesPreview({
  templates,
  maxVisible = 4,
  onViewAll,
  loading = false,
}: TemplatesPreviewProps) {
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

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demo Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <TemplateItemSkeleton />
          <TemplateItemSkeleton />
          <TemplateItemSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demo Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <FileCode className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No templates available yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Templates will be suggested based on your schema
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
          <CardTitle className="text-base">Demo Templates ({templates.length})</CardTitle>
          {templates.length > maxVisible && onViewAll && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onViewAll}>
              View All
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedTemplates.map((template) => (
          <TemplateItem
            key={template.id}
            template={template}
            isExpanded={expandedIds.has(template.id)}
            onToggle={() => toggleExpanded(template.id)}
          />
        ))}
        {remainingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={onViewAll}
          >
            +{remainingCount} more templates
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
