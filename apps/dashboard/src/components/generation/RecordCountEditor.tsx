/**
 * RecordCountEditor Component
 *
 * Editor for specifying record counts per model.
 * Shows schema models with count inputs.
 * Suggests defaults based on relationships and narrative needs.
 */

import React, { useState, useMemo, useCallback } from 'react'
import type { ParseSchemaResult } from '@/app/actions/parse-schema'

// Use the schema type from the parse action to avoid @demokit-ai/core webpack issues
type DemokitSchema = NonNullable<ParseSchemaResult['schema']>
import type { DynamicNarrativeTemplate } from '@intelligence'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Database,
  RefreshCw,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface RecordCountEditorProps {
  schema: DemokitSchema
  counts: Record<string, number>
  onChange: (counts: Record<string, number>) => void
  /** Template to get suggested counts from */
  template?: DynamicNarrativeTemplate
  disabled?: boolean
  /** Start collapsed (design principle: progressive disclosure) */
  defaultCollapsed?: boolean
}

// ============================================================================
// Default Counts
// ============================================================================

const DEFAULT_COUNTS: Record<string, number> = {
  // Generic defaults by common model names
  User: 5,
  Customer: 5,
  Product: 10,
  Order: 15,
  Item: 30,
  Category: 5,
  Tag: 10,
  Comment: 20,
  Post: 10,
  Message: 25,
}

const DEFAULT_COUNT = 5

// ============================================================================
// Component
// ============================================================================

export function RecordCountEditor({
  schema,
  counts,
  onChange,
  template,
  disabled = false,
  defaultCollapsed = true,
}: RecordCountEditorProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed)
  // Get models sorted by dependencies (parent models first)
  const sortedModels = useMemo(() => {
    const models = Object.entries(schema.models)
      .filter(([_, model]) => model.type === 'object' && model.properties)
      .map(([name]) => name)

    // Simple sort: put models without relationships first
    const dependencyCount: Record<string, number> = {}
    models.forEach((model) => {
      dependencyCount[model] = schema.relationships.filter(
        (r) => r.from.model === model
      ).length
    })

    return models.sort((a, b) => dependencyCount[a] - dependencyCount[b])
  }, [schema])

  // Get suggestions from template or defaults
  const suggestions = useMemo(() => {
    const result: Record<string, number> = {}

    sortedModels.forEach((model) => {
      if (template?.suggestedCounts?.[model]) {
        result[model] = template.suggestedCounts[model]
      } else if (DEFAULT_COUNTS[model]) {
        result[model] = DEFAULT_COUNTS[model]
      } else {
        result[model] = DEFAULT_COUNT
      }
    })

    return result
  }, [sortedModels, template])

  // Get relationship info for each model
  const relationshipInfo = useMemo(() => {
    const info: Record<string, { dependsOn: string[]; dependedBy: string[] }> = {}

    sortedModels.forEach((model) => {
      info[model] = {
        dependsOn: schema.relationships
          .filter((r) => r.from.model === model)
          .map((r) => r.to.model),
        dependedBy: schema.relationships
          .filter((r) => r.to.model === model)
          .map((r) => r.from.model),
      }
    })

    return info
  }, [sortedModels, schema.relationships])

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

  const resetToDefaults = useCallback(() => {
    const defaults: Record<string, number> = {}
    sortedModels.forEach((model) => {
      defaults[model] = DEFAULT_COUNTS[model] || DEFAULT_COUNT
    })
    onChange(defaults)
  }, [sortedModels, onChange])

  // Check for potential issues
  const warnings = useMemo(() => {
    const result: Record<string, string> = {}

    sortedModels.forEach((model) => {
      const count = counts[model] || 0
      const deps = relationshipInfo[model]

      // Check if parent has fewer records than child expects
      deps.dependsOn.forEach((parent) => {
        const parentCount = counts[parent] || 0
        if (parentCount > 0 && count > parentCount * 10) {
          result[model] = `High ratio to ${parent} (${count}:${parentCount})`
        }
      })

      // Check for zero counts
      if (count === 0 && deps.dependedBy.length > 0) {
        result[model] = 'Referenced by other models but has 0 records'
      }
    })

    return result
  }, [counts, sortedModels, relationshipInfo])

  const totalRecords = useMemo(() => {
    return Object.values(counts).reduce((sum, c) => sum + c, 0)
  }, [counts])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        {/* Header - always visible */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Record Counts</p>
                <p className="text-xs text-muted-foreground">
                  {sortedModels.length} models · {totalRecords} total records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Object.keys(warnings).length > 0 && (
                <Badge variant="outline" className="text-warning border-warning/50">
                  {Object.keys(warnings).length} warnings
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Collapsible content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t">
            {/* Actions */}
            <div className="flex justify-end gap-2 py-3 border-b mb-4">
              {template && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToSuggestions}
                  disabled={disabled}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Use Template
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                disabled={disabled}
              >
                Reset
              </Button>
            </div>

            {/* Model list - no scroll area, show all */}
            <div className="space-y-4">
              {sortedModels.map((model) => {
                const deps = relationshipInfo[model]
                const warning = warnings[model]
                const currentCount = counts[model] ?? suggestions[model]
                const suggestion = suggestions[model]

                return (
                  <div key={model} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={`count-${model}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        {model}
                      </Label>
                      {deps.dependsOn.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          → {deps.dependsOn.join(', ')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        id={`count-${model}`}
                        type="number"
                        min={0}
                        value={currentCount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCountChange(model, e.target.value)}
                        disabled={disabled}
                        className={`w-20 h-8 text-sm ${warning ? 'border-warning' : ''}`}
                      />
                      {currentCount !== suggestion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onChange({ ...counts, [model]: suggestion })}
                          disabled={disabled}
                          className="text-xs text-muted-foreground h-8"
                        >
                          Use {suggestion}
                        </Button>
                      )}
                    </div>

                    {warning && (
                      <p className="text-xs text-warning flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {warning}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
