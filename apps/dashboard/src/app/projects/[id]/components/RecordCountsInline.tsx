'use client'

/**
 * RecordCountsInline Component
 *
 * Ultra-minimal record count editor for progressive disclosure:
 * - Default: Single line "85 records total [Customize]"
 * - Expanded: Grid of model count inputs
 *
 * Designed to minimize visual noise until user needs to customize.
 */

import React, { useState, useMemo, useCallback } from 'react'
import type { ParseSchemaResult } from '@/app/actions/parse-schema'
import type { DynamicNarrativeTemplate } from '@intelligence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Database, ChevronDown, RefreshCw } from 'lucide-react'

// Use the schema type from the parse action
type DemokitSchema = NonNullable<ParseSchemaResult['schema']>

// ============================================================================
// Types
// ============================================================================

interface RecordCountsInlineProps {
  schema: DemokitSchema
  counts: Record<string, number>
  onChange: (counts: Record<string, number>) => void
  template?: DynamicNarrativeTemplate
  disabled?: boolean
}

// Default counts by common model names
const DEFAULT_COUNTS: Record<string, number> = {
  User: 5,
  Customer: 5,
  Product: 10,
  Order: 15,
  Item: 30,
  Category: 5,
}

const DEFAULT_COUNT = 5

// ============================================================================
// Component
// ============================================================================

export function RecordCountsInline({
  schema,
  counts,
  onChange,
  template,
  disabled = false,
}: RecordCountsInlineProps) {
  const [expanded, setExpanded] = useState(false)

  // Get models from schema
  const models = useMemo(() => {
    return Object.entries(schema.models)
      .filter(([_, model]) => model.type === 'object' && model.properties)
      .map(([name]) => name)
  }, [schema])

  // Calculate total
  const totalRecords = useMemo(() => {
    return Object.values(counts).reduce((sum, c) => sum + c, 0)
  }, [counts])

  // Get suggestions from template or defaults
  const suggestions = useMemo(() => {
    const result: Record<string, number> = {}
    models.forEach((model) => {
      if (template?.suggestedCounts?.[model]) {
        result[model] = template.suggestedCounts[model]
      } else if (DEFAULT_COUNTS[model]) {
        result[model] = DEFAULT_COUNTS[model]
      } else {
        result[model] = DEFAULT_COUNT
      }
    })
    return result
  }, [models, template])

  const handleCountChange = useCallback(
    (model: string, value: string) => {
      const num = parseInt(value, 10)
      if (!isNaN(num) && num >= 0) {
        onChange({ ...counts, [model]: num })
      }
    },
    [counts, onChange]
  )

  const resetToSuggestions = useCallback(() => {
    onChange(suggestions)
  }, [suggestions, onChange])

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      {/* Collapsed summary line */}
      <CollapsibleTrigger asChild>
        <button
          className="w-full flex items-center justify-between py-3 px-4 -mx-4 hover:bg-muted/30 transition-colors rounded-lg"
          disabled={disabled}
        >
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Record counts</span>
            <Badge variant="secondary" className="text-xs font-normal">
              {totalRecords} total
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {expanded ? 'Collapse' : 'Customize'}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>
      </CollapsibleTrigger>

      {/* Expanded editor */}
      <CollapsibleContent>
        <div className="pt-3 pb-1 space-y-4">
          {/* Reset button */}
          {template && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToSuggestions}
                disabled={disabled}
                className="text-xs text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Use template defaults
              </Button>
            </div>
          )}

          {/* Compact grid of inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {models.map((model) => {
              const currentCount = counts[model] ?? suggestions[model]

              return (
                <div key={model} className="flex items-center gap-2">
                  <Label
                    htmlFor={`inline-count-${model}`}
                    className="text-xs text-muted-foreground min-w-0 truncate flex-1"
                  >
                    {model}
                  </Label>
                  <Input
                    id={`inline-count-${model}`}
                    type="number"
                    min={0}
                    value={currentCount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCountChange(model, e.target.value)}
                    disabled={disabled}
                    className="w-16 h-7 text-xs text-center"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
