'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Settings2, Hash, Type, ToggleLeft, ListFilter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import type { DemokitSchema } from '../types'
import { FieldRuleEditor } from './FieldRuleEditor'
import { DatasetManager } from './DatasetManager'

// Column types that can be inferred or selected
type ColumnType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'url' | 'email'

// Local type definitions matching the codegen types
interface Dataset {
  id: string
  name: string
  columns: string[]
  columnTypes?: ColumnType[]
  rows: string[][]
  createdAt: string
  description?: string
}

interface GenerationRulesConfig {
  version: 1
  fieldRules: Record<string, FieldRule>
  datasets?: Record<string, Dataset>
}

type FieldRule =
  | { type: 'string'; strategy: 'oneOf' | 'pattern'; values?: string[]; pattern?: string }
  | { type: 'number'; strategy: 'range' | 'fixed'; min?: number; max?: number; precision?: number; value?: number }
  | { type: 'integer'; strategy: 'range' | 'fixed'; min?: number; max?: number; value?: number }
  | { type: 'boolean'; strategy: 'fixed' | 'weighted'; value?: boolean; trueProbability?: number }
  | { type: 'enum'; strategy: 'subset' | 'weighted'; allowedValues?: string[]; weights?: Record<string, number> }
  | { type: 'array'; minItems?: number; maxItems?: number; uniqueItems?: boolean }
  | { type: 'fromDataset'; datasetId: string; column: string }

interface GenerationRulesTabProps {
  schema: DemokitSchema | undefined
  generationRules: GenerationRulesConfig | undefined
  onRulesChange: (rules: GenerationRulesConfig) => void
}

interface FieldInfo {
  name: string
  type: string
  enumValues?: unknown[]
  format?: string
}

function getFieldTypeIcon(type: string) {
  switch (type) {
    case 'string':
      return <Type className="h-3.5 w-3.5" />
    case 'number':
    case 'integer':
      return <Hash className="h-3.5 w-3.5" />
    case 'boolean':
      return <ToggleLeft className="h-3.5 w-3.5" />
    default:
      return <ListFilter className="h-3.5 w-3.5" />
  }
}

function getRuleDescription(rule: FieldRule | undefined, datasets?: Record<string, Dataset>): string {
  if (!rule) return 'Default'

  switch (rule.type) {
    case 'string':
      if (rule.strategy === 'oneOf' && rule.values?.length) {
        return `One of: ${rule.values.length} values`
      }
      if (rule.strategy === 'pattern' && rule.pattern) {
        return `Pattern: ${rule.pattern}`
      }
      return 'Custom string'

    case 'number':
    case 'integer':
      if (rule.strategy === 'fixed' && rule.value !== undefined) {
        return `Fixed: ${rule.value}`
      }
      if (rule.strategy === 'range') {
        return `Range: ${rule.min ?? 0} - ${rule.max ?? 100}`
      }
      return 'Custom number'

    case 'boolean':
      if (rule.strategy === 'fixed') {
        return `Always: ${rule.value ? 'true' : 'false'}`
      }
      if (rule.strategy === 'weighted') {
        return `${Math.round((rule.trueProbability ?? 0.5) * 100)}% true`
      }
      return 'Custom boolean'

    case 'enum':
      if (rule.strategy === 'subset' && rule.allowedValues?.length) {
        return `Subset: ${rule.allowedValues.length} values`
      }
      if (rule.strategy === 'weighted') {
        return 'Weighted selection'
      }
      return 'Custom enum'

    case 'fromDataset': {
      const dataset = datasets?.[rule.datasetId]
      if (dataset) {
        return `From: ${dataset.name}.${rule.column}`
      }
      return 'From dataset'
    }

    case 'array': {
      const min = rule.minItems ?? 1
      const max = rule.maxItems ?? 3
      if (min === max) {
        return `${min} item${min !== 1 ? 's' : ''}${rule.uniqueItems ? ' (unique)' : ''}`
      }
      return `${min}-${max} items${rule.uniqueItems ? ' (unique)' : ''}`
    }

    default:
      return 'Custom rule'
  }
}

export function GenerationRulesTab({ schema, generationRules, onRulesChange }: GenerationRulesTabProps) {
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set())
  const [editingField, setEditingField] = useState<{ model: string; field: FieldInfo } | null>(null)

  // Extract models and their fields from schema
  const models = useMemo(() => {
    if (!schema?.models) return []

    return Object.entries(schema.models)
      .filter(([, model]) => model.type === 'object' && model.properties)
      .map(([name, model]) => ({
        name,
        fields: Object.entries(model.properties || {}).map(([fieldName, prop]) => ({
          name: fieldName,
          type: prop.type || 'string',
          enumValues: prop.enum,
          format: prop.format,
        })),
      }))
  }, [schema])

  const toggleModel = (modelName: string) => {
    setExpandedModels(prev => {
      const next = new Set(prev)
      if (next.has(modelName)) {
        next.delete(modelName)
      } else {
        next.add(modelName)
      }
      return next
    })
  }

  const handleFieldRuleChange = (modelName: string, fieldName: string, rule: FieldRule | null) => {
    const ruleKey = `${modelName}.${fieldName}`
    const currentRules = generationRules ?? { version: 1, fieldRules: {} }

    const newFieldRules = { ...currentRules.fieldRules }
    if (rule === null) {
      delete newFieldRules[ruleKey]
    } else {
      newFieldRules[ruleKey] = rule
    }

    onRulesChange({
      ...currentRules,
      fieldRules: newFieldRules,
    })
    setEditingField(null)
  }

  const handleDatasetsChange = (datasets: Record<string, Dataset>) => {
    const currentRules = generationRules ?? { version: 1, fieldRules: {} }
    onRulesChange({
      ...currentRules,
      datasets,
    })
  }

  if (!schema || models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Settings2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No Schema Available</h3>
        <p className="text-sm text-muted-foreground">
          Upload an OpenAPI schema to configure custom generation rules.
        </p>
      </div>
    )
  }

  const rulesCount = Object.keys(generationRules?.fieldRules ?? {}).length

  return (
    <div className="space-y-6">
      {/* Dataset Manager */}
      <DatasetManager
        datasets={generationRules?.datasets ?? {}}
        onDatasetsChange={handleDatasetsChange}
        fieldRules={generationRules?.fieldRules ?? {}}
      />

      <Separator />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Field Generation Rules</h3>
          <p className="text-sm text-muted-foreground">
            Customize how values are generated for each field
          </p>
        </div>
        {rulesCount > 0 && (
          <Badge variant="secondary">
            {rulesCount} custom {rulesCount === 1 ? 'rule' : 'rules'}
          </Badge>
        )}
      </div>

      {/* Models list */}
      <div className="space-y-2 border rounded-lg">
        {models.map((model) => {
          const isExpanded = expandedModels.has(model.name)
          const modelRulesCount = model.fields.filter(
            f => generationRules?.fieldRules?.[`${model.name}.${f.name}`]
          ).length

          return (
            <Collapsible
              key={model.name}
              open={isExpanded}
              onOpenChange={() => toggleModel(model.name)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{model.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {model.fields.length} fields
                    </Badge>
                  </div>
                  {modelRulesCount > 0 && (
                    <Badge variant="default" className="text-xs">
                      {modelRulesCount} custom
                    </Badge>
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  {model.fields.map((field) => {
                    const ruleKey = `${model.name}.${field.name}`
                    const rule = generationRules?.fieldRules?.[ruleKey]
                    const hasRule = !!rule

                    return (
                      <div
                        key={field.name}
                        className="flex items-center justify-between px-3 py-2 pl-9 hover:bg-muted/30 transition-colors border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-muted-foreground">
                            {getFieldTypeIcon(field.type)}
                          </span>
                          <span className="font-mono text-sm truncate">{field.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {field.enumValues ? 'enum' : field.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${hasRule ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {getRuleDescription(rule, generationRules?.datasets)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setEditingField({ model: model.name, field })}
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>

      {/* Field rule editor dialog */}
      {editingField && (
        <FieldRuleEditor
          open={!!editingField}
          onOpenChange={(open) => !open && setEditingField(null)}
          modelName={editingField.model}
          field={editingField.field}
          currentRule={generationRules?.fieldRules?.[`${editingField.model}.${editingField.field.name}`]}
          onSave={(rule) => handleFieldRuleChange(editingField.model, editingField.field.name, rule)}
          datasets={generationRules?.datasets}
        />
      )}
    </div>
  )
}
