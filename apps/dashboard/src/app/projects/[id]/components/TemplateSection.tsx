'use client'

/**
 * TemplateSection Component
 *
 * Progressive disclosure template picker:
 * - Expanded: Shows 3 template cards + "View all" link
 * - Collapsed: Shows selected template as a banner
 *
 * Automatically collapses after template selection to reduce visual noise.
 */

import { useState, useMemo } from 'react'
import type { DynamicNarrativeTemplate, TemplateCategory } from '@intelligence'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Check,
  Sparkles,
} from 'lucide-react'
import { DynamicTemplateGrid } from '@/components/intelligence/DynamicTemplateGrid'

// ============================================================================
// Types
// ============================================================================

interface TemplateSectionProps {
  templates: DynamicNarrativeTemplate[]
  selected?: DynamicNarrativeTemplate
  onSelect: (template: DynamicNarrativeTemplate) => void
  onClear: () => void
  onStartFromScratch?: () => void
  disabled?: boolean
  loading?: boolean
}

// Category config for badge colors
const CATEGORY_LABELS: Record<TemplateCategory, string> = {
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

// ============================================================================
// Quick Pick Card Component
// ============================================================================

interface QuickPickCardProps {
  template: DynamicNarrativeTemplate
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}

function QuickPickCard({ template, isSelected, onClick, disabled }: QuickPickCardProps) {
  return (
    <div
      className={`
        cursor-pointer transition-all rounded-lg border p-4 h-full
        ${isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border/50 hover:border-border hover:bg-muted/30'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && onClick()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm line-clamp-1">{template.name}</h4>
        {template.relevanceScore >= 0.8 && (
          <Star className="h-3 w-3 fill-warning text-warning shrink-0" />
        )}
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {template.description}
      </p>

      <Badge variant="secondary" className="text-xs">
        {CATEGORY_LABELS[template.category]}
      </Badge>

      {isSelected && (
        <div className="mt-3 pt-2 border-t flex items-center gap-1 text-xs text-primary">
          <Check className="h-3 w-3" />
          Selected
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Selected Template Banner Component
// ============================================================================

interface SelectedBannerProps {
  template: DynamicNarrativeTemplate
  onClear: () => void
  onBrowse: () => void
  disabled?: boolean
}

function SelectedBanner({ template, onClear, onBrowse, disabled }: SelectedBannerProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {template.name}
                </p>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {CATEGORY_LABELS[template.category]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {template.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBrowse}
              disabled={disabled}
            >
              Browse
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              disabled={disabled}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TemplateSection({
  templates,
  selected,
  onSelect,
  onClear,
  onStartFromScratch,
  disabled = false,
  loading = false,
}: TemplateSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  // Get top 3 templates by relevance score
  const quickPickTemplates = useMemo((): DynamicNarrativeTemplate[] => {
    return [...templates]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3)
  }, [templates])

  const handleSelect = (template: DynamicNarrativeTemplate) => {
    onSelect(template)
    setSheetOpen(false)
  }

  const handleClear = () => {
    onClear()
  }

  const handleBrowse = () => {
    setSheetOpen(true)
  }

  // If a template is selected, show collapsed banner
  if (selected) {
    return (
      <>
        <SelectedBanner
          template={selected}
          onClear={handleClear}
          onBrowse={handleBrowse}
          disabled={disabled}
        />

        {/* Full template browser sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent open={sheetOpen} className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Choose a Template</SheetTitle>
              <SheetDescription>
                Pre-configured narratives for common demo scenarios
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <DynamicTemplateGrid
                templates={templates}
                selectedTemplateIds={selected ? [selected.id] : []}
                onSelect={handleSelect}
                disabled={disabled}
                maxVisible={20}
              />
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // No template selected - show quick pick cards
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Choose a template</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pre-configured narratives for common demo scenarios
          </p>
        </div>
        {templates.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSheetOpen(true)}
            disabled={disabled}
          >
            View all ({templates.length})
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Quick pick cards - always 3 cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4 h-32 animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : quickPickTemplates.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {quickPickTemplates.map((template) => (
            <QuickPickCard
              key={template.id}
              template={template}
              isSelected={false}
              onClick={() => handleSelect(template)}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No templates available. Run intelligence analysis in Settings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Start from scratch option */}
      {onStartFromScratch && (
        <div className="text-center">
          <Button
            variant="link"
            size="sm"
            onClick={onStartFromScratch}
            disabled={disabled}
            className="text-muted-foreground"
          >
            or start from scratch
          </Button>
        </div>
      )}

      {/* Full template browser sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent open={sheetOpen} className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Choose a Template</SheetTitle>
            <SheetDescription>
              Pre-configured narratives for common demo scenarios
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <DynamicTemplateGrid
              templates={templates}
              selectedTemplateIds={[]}
              onSelect={handleSelect}
              disabled={disabled}
              maxVisible={20}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
