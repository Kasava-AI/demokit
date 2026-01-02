'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Sparkles, ChevronRight } from 'lucide-react'
import { TemplateCard } from './TemplateCard'
import type { DynamicNarrativeTemplate } from './types'
import { TEMPLATES_VISIBLE_COUNT } from './types'

interface TemplatePickerProps {
  templates: DynamicNarrativeTemplate[]
  selectedTemplate?: DynamicNarrativeTemplate
  disabled: boolean
  onTemplateClick: (template: DynamicNarrativeTemplate) => void
  onClearTemplate: () => void
}

export function TemplatePicker({
  templates,
  selectedTemplate,
  disabled,
  onTemplateClick,
  onClearTemplate,
}: TemplatePickerProps) {
  const [showAllTemplates, setShowAllTemplates] = useState(false)

  const visibleTemplates = templates.slice(0, TEMPLATES_VISIBLE_COUNT)
  const hasMoreTemplates = templates.length > TEMPLATES_VISIBLE_COUNT

  const handleTemplateClick = (template: DynamicNarrativeTemplate) => {
    onTemplateClick(template)
    setShowAllTemplates(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Quick Start from Template
        </Label>
        {selectedTemplate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearTemplate}
            disabled={disabled}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Compact template grid */}
      <div className="grid grid-cols-2 gap-2">
        {visibleTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate?.id === template.id}
            disabled={disabled}
            onClick={() => handleTemplateClick(template)}
          />
        ))}
      </div>

      {/* View all link - progressive disclosure */}
      {hasMoreTemplates && (
        <Dialog open={showAllTemplates} onOpenChange={setShowAllTemplates}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              View all ({templates.length})
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>All Templates</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="grid grid-cols-2 gap-3 pr-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    disabled={disabled}
                    onClick={() => handleTemplateClick(template)}
                  />
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or write your own
          </span>
        </div>
      </div>
    </div>
  )
}
