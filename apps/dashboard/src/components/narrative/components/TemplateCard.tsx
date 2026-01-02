'use client'

import { Badge } from '@/components/ui/badge'
import { Sparkles, Check } from 'lucide-react'
import type { DynamicNarrativeTemplate } from './types'

interface TemplateCardProps {
  template: DynamicNarrativeTemplate
  isSelected: boolean
  disabled: boolean
  onClick: () => void
}

export function TemplateCard({ template, isSelected, disabled, onClick }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left p-3 rounded-lg border transition-all
        ${isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{template.name}</span>
            {template.relevanceScore >= 0.85 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Recommended
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {template.description}
          </p>
        </div>
        {isSelected && (
          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        )}
      </div>
    </button>
  )
}
