'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Database } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

type FieldRule =
  | { type: 'string'; strategy: 'oneOf' | 'pattern'; values?: string[]; pattern?: string }
  | { type: 'number'; strategy: 'range' | 'fixed'; min?: number; max?: number; precision?: number; value?: number }
  | { type: 'integer'; strategy: 'range' | 'fixed'; min?: number; max?: number; value?: number }
  | { type: 'boolean'; strategy: 'fixed' | 'weighted'; value?: boolean; trueProbability?: number }
  | { type: 'enum'; strategy: 'subset' | 'weighted'; allowedValues?: string[]; weights?: Record<string, number> }
  | { type: 'array'; minItems?: number; maxItems?: number; uniqueItems?: boolean }
  | { type: 'fromDataset'; datasetId: string; column: string }

interface FieldInfo {
  name: string
  type: string
  enumValues?: unknown[]
  format?: string
}

interface FieldRuleEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelName: string
  field: FieldInfo
  currentRule: FieldRule | undefined
  onSave: (rule: FieldRule | null) => void
  datasets?: Record<string, Dataset>
}

type Strategy = 'default' | 'oneOf' | 'pattern' | 'range' | 'fixed' | 'weighted' | 'subset' | 'fromDataset'

function getCurrentStrategy(rule: FieldRule | undefined, type: string, hasEnum: boolean): Strategy {
  if (!rule) return 'default'

  // Handle fromDataset rule
  if (rule.type === 'fromDataset') {
    return 'fromDataset'
  }

  if (hasEnum && rule.type === 'enum') {
    return rule.strategy
  }

  switch (rule.type) {
    case 'string':
      return rule.strategy
    case 'number':
    case 'integer':
      return rule.strategy
    case 'boolean':
      return rule.strategy
    case 'enum':
      return rule.strategy
    case 'array':
      return 'range' // Array rules always use the 'range' strategy (custom item count)
    default:
      return 'default'
  }
}

export function FieldRuleEditor({
  open,
  onOpenChange,
  modelName,
  field,
  currentRule,
  onSave,
  datasets,
}: FieldRuleEditorProps) {
  const hasEnum = !!field.enumValues && field.enumValues.length > 0
  const effectiveType = hasEnum ? 'enum' : field.type

  // Check if datasets are available (only show fromDataset option for string fields with datasets)
  const hasDatasets = datasets && Object.keys(datasets).length > 0
  const canUseDataset = field.type === 'string' && hasDatasets

  // State for the rule being edited
  const [strategy, setStrategy] = useState<Strategy>(() =>
    getCurrentStrategy(currentRule, field.type, hasEnum)
  )

  // String state
  const [stringValues, setStringValues] = useState<string[]>(() => {
    if (currentRule?.type === 'string' && currentRule.strategy === 'oneOf') {
      return currentRule.values ?? []
    }
    return []
  })
  const [pattern, setPattern] = useState(() => {
    if (currentRule?.type === 'string' && currentRule.strategy === 'pattern') {
      return currentRule.pattern ?? ''
    }
    return ''
  })
  const [newStringValue, setNewStringValue] = useState('')

  // Number state
  const [numberMin, setNumberMin] = useState(() => {
    if (currentRule?.type === 'number' || currentRule?.type === 'integer') {
      return currentRule.min ?? 0
    }
    return 0
  })
  const [numberMax, setNumberMax] = useState(() => {
    if (currentRule?.type === 'number' || currentRule?.type === 'integer') {
      return currentRule.max ?? 100
    }
    return 100
  })
  const [numberPrecision, setNumberPrecision] = useState(() => {
    if (currentRule?.type === 'number' && currentRule.strategy === 'range') {
      return currentRule.precision ?? 2
    }
    return 2
  })
  const [fixedNumber, setFixedNumber] = useState(() => {
    if ((currentRule?.type === 'number' || currentRule?.type === 'integer') && currentRule.strategy === 'fixed') {
      return currentRule.value ?? 0
    }
    return 0
  })

  // Boolean state
  const [fixedBoolean, setFixedBoolean] = useState(() => {
    if (currentRule?.type === 'boolean' && currentRule.strategy === 'fixed') {
      return currentRule.value ?? true
    }
    return true
  })
  const [trueProbability, setTrueProbability] = useState(() => {
    if (currentRule?.type === 'boolean' && currentRule.strategy === 'weighted') {
      return (currentRule.trueProbability ?? 0.5) * 100
    }
    return 50
  })

  // Enum state
  const [allowedEnumValues, setAllowedEnumValues] = useState<string[]>(() => {
    if (currentRule?.type === 'enum' && currentRule.strategy === 'subset') {
      return currentRule.allowedValues ?? []
    }
    return field.enumValues?.map(String) ?? []
  })
  const [enumWeights, setEnumWeights] = useState<Record<string, number>>(() => {
    if (currentRule?.type === 'enum' && currentRule.strategy === 'weighted') {
      return currentRule.weights ?? {}
    }
    const weights: Record<string, number> = {}
    field.enumValues?.forEach((v) => {
      weights[String(v)] = 1
    })
    return weights
  })

  // Dataset state for fromDataset strategy
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => {
    if (currentRule?.type === 'fromDataset') {
      return currentRule.datasetId
    }
    return ''
  })
  const [selectedColumn, setSelectedColumn] = useState<string>(() => {
    if (currentRule?.type === 'fromDataset') {
      return currentRule.column
    }
    return ''
  })

  // Array state
  const [arrayMinItems, setArrayMinItems] = useState<number>(() => {
    if (currentRule?.type === 'array') {
      return currentRule.minItems ?? 1
    }
    return 1
  })
  const [arrayMaxItems, setArrayMaxItems] = useState<number>(() => {
    if (currentRule?.type === 'array') {
      return currentRule.maxItems ?? 3
    }
    return 3
  })
  const [arrayUniqueItems, setArrayUniqueItems] = useState<boolean>(() => {
    if (currentRule?.type === 'array') {
      return currentRule.uniqueItems ?? false
    }
    return false
  })

  // Get columns for selected dataset
  const selectedDatasetColumns = useMemo(() => {
    if (!selectedDatasetId || !datasets) return []
    return datasets[selectedDatasetId]?.columns ?? []
  }, [selectedDatasetId, datasets])

  // Reset state when field changes
  useEffect(() => {
    setStrategy(getCurrentStrategy(currentRule, field.type, hasEnum))

    if (currentRule?.type === 'string' && currentRule.strategy === 'oneOf') {
      setStringValues(currentRule.values ?? [])
    } else {
      setStringValues([])
    }

    if (currentRule?.type === 'string' && currentRule.strategy === 'pattern') {
      setPattern(currentRule.pattern ?? '')
    } else {
      setPattern('')
    }

    if (currentRule?.type === 'number' || currentRule?.type === 'integer') {
      setNumberMin(currentRule.min ?? 0)
      setNumberMax(currentRule.max ?? 100)
      if (currentRule.type === 'number' && currentRule.strategy === 'range') {
        setNumberPrecision(currentRule.precision ?? 2)
      }
      if (currentRule.strategy === 'fixed') {
        setFixedNumber(currentRule.value ?? 0)
      }
    }

    if (currentRule?.type === 'boolean') {
      if (currentRule.strategy === 'fixed') {
        setFixedBoolean(currentRule.value ?? true)
      }
      if (currentRule.strategy === 'weighted') {
        setTrueProbability((currentRule.trueProbability ?? 0.5) * 100)
      }
    }

    if (currentRule?.type === 'enum') {
      if (currentRule.strategy === 'subset') {
        setAllowedEnumValues(currentRule.allowedValues ?? [])
      }
      if (currentRule.strategy === 'weighted') {
        setEnumWeights(currentRule.weights ?? {})
      }
    } else {
      setAllowedEnumValues(field.enumValues?.map(String) ?? [])
      const weights: Record<string, number> = {}
      field.enumValues?.forEach((v) => {
        weights[String(v)] = 1
      })
      setEnumWeights(weights)
    }

    // Handle fromDataset rule
    if (currentRule?.type === 'fromDataset') {
      setSelectedDatasetId(currentRule.datasetId)
      setSelectedColumn(currentRule.column)
    } else {
      setSelectedDatasetId('')
      setSelectedColumn('')
    }

    // Handle array rule
    if (currentRule?.type === 'array') {
      setArrayMinItems(currentRule.minItems ?? 1)
      setArrayMaxItems(currentRule.maxItems ?? 3)
      setArrayUniqueItems(currentRule.uniqueItems ?? false)
    } else {
      setArrayMinItems(1)
      setArrayMaxItems(3)
      setArrayUniqueItems(false)
    }
  }, [currentRule, field, hasEnum])

  const handleAddStringValue = () => {
    if (newStringValue.trim() && !stringValues.includes(newStringValue.trim())) {
      setStringValues([...stringValues, newStringValue.trim()])
      setNewStringValue('')
    }
  }

  const handleRemoveStringValue = (value: string) => {
    setStringValues(stringValues.filter((v) => v !== value))
  }

  const handleToggleEnumValue = (value: string) => {
    if (allowedEnumValues.includes(value)) {
      setAllowedEnumValues(allowedEnumValues.filter((v) => v !== value))
    } else {
      setAllowedEnumValues([...allowedEnumValues, value])
    }
  }

  const handleEnumWeightChange = (value: string, weight: number) => {
    setEnumWeights({ ...enumWeights, [value]: weight })
  }

  const handleSave = () => {
    if (strategy === 'default') {
      onSave(null)
      return
    }

    // Handle fromDataset strategy (works for any string field)
    if (strategy === 'fromDataset') {
      if (!selectedDatasetId || !selectedColumn) {
        // Invalid - need both dataset and column
        return
      }
      const rule: FieldRule = {
        type: 'fromDataset',
        datasetId: selectedDatasetId,
        column: selectedColumn,
      }
      onSave(rule)
      return
    }

    let rule: FieldRule

    switch (effectiveType) {
      case 'string':
        if (strategy === 'oneOf') {
          rule = { type: 'string', strategy: 'oneOf', values: stringValues }
        } else {
          rule = { type: 'string', strategy: 'pattern', pattern }
        }
        break

      case 'number':
        if (strategy === 'fixed') {
          rule = { type: 'number', strategy: 'fixed', value: fixedNumber }
        } else {
          rule = { type: 'number', strategy: 'range', min: numberMin, max: numberMax, precision: numberPrecision }
        }
        break

      case 'integer':
        if (strategy === 'fixed') {
          rule = { type: 'integer', strategy: 'fixed', value: Math.round(fixedNumber) }
        } else {
          rule = { type: 'integer', strategy: 'range', min: Math.round(numberMin), max: Math.round(numberMax) }
        }
        break

      case 'boolean':
        if (strategy === 'fixed') {
          rule = { type: 'boolean', strategy: 'fixed', value: fixedBoolean }
        } else {
          rule = { type: 'boolean', strategy: 'weighted', trueProbability: trueProbability / 100 }
        }
        break

      case 'enum':
        if (strategy === 'subset') {
          rule = { type: 'enum', strategy: 'subset', allowedValues: allowedEnumValues }
        } else {
          rule = { type: 'enum', strategy: 'weighted', weights: enumWeights }
        }
        break

      case 'array':
        rule = {
          type: 'array',
          minItems: arrayMinItems,
          maxItems: arrayMaxItems,
          uniqueItems: arrayUniqueItems,
        }
        break

      default:
        onSave(null)
        return
    }

    onSave(rule)
  }

  const handleReset = () => {
    onSave(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Field Rule</DialogTitle>
          <DialogDescription>
            Set a custom generation rule for <code className="font-mono bg-muted px-1 rounded">{modelName}.{field.name}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field info */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <Badge variant="outline">{hasEnum ? 'enum' : field.type}</Badge>
            {field.format && (
              <>
                <span className="text-sm text-muted-foreground">Format:</span>
                <Badge variant="outline">{field.format}</Badge>
              </>
            )}
          </div>

          {/* Strategy selection based on type */}
          {effectiveType === 'string' && (
            <div className="space-y-4">
              <RadioGroup value={strategy} onValueChange={(v: string) => setStrategy(v as Strategy)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="default" />
                  <Label htmlFor="default">Default (auto-generated)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oneOf" id="oneOf" />
                  <Label htmlFor="oneOf">One of specific values</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pattern" id="pattern" />
                  <Label htmlFor="pattern">Pattern (e.g., SKU-{'${0000}'})</Label>
                </div>
                {canUseDataset && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fromDataset" id="fromDataset" />
                    <Label htmlFor="fromDataset" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      From dataset (correlated)
                    </Label>
                  </div>
                )}
              </RadioGroup>

              {strategy === 'oneOf' && (
                <div className="space-y-3 pl-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a value..."
                      value={newStringValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStringValue(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddStringValue()}
                    />
                    <Button type="button" size="icon" variant="outline" onClick={handleAddStringValue}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {stringValues.length > 0 && (
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-1">
                        {stringValues.map((value, index) => (
                          <div key={index} className="flex items-center justify-between text-sm py-1 px-2 bg-muted/50 rounded">
                            <span className="truncate">{value}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleRemoveStringValue(value)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {stringValues.length} value{stringValues.length !== 1 ? 's' : ''} configured
                  </p>
                </div>
              )}

              {strategy === 'pattern' && (
                <div className="space-y-2 pl-6">
                  <Input
                    placeholder="e.g., SKU-{0000} or IMG-{uuid}"
                    value={pattern}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPattern(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{0000}'} for sequential numbers, {'{uuid}'} for UUIDs
                  </p>
                </div>
              )}

              {strategy === 'fromDataset' && datasets && (
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="dataset-select">Dataset</Label>
                    <Select
                      value={selectedDatasetId}
                      onValueChange={(value) => {
                        setSelectedDatasetId(value)
                        setSelectedColumn('') // Reset column when dataset changes
                      }}
                    >
                      <SelectTrigger id="dataset-select">
                        <SelectValue placeholder="Select a dataset" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(datasets).map(([id, dataset]) => (
                          <SelectItem key={id} value={id}>
                            {dataset.name} ({dataset.rows.length} rows)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDatasetId && (
                    <div className="space-y-2">
                      <Label htmlFor="column-select">Column</Label>
                      <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                        <SelectTrigger id="column-select">
                          <SelectValue placeholder="Select a column" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDatasetColumns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Values from this column will be correlated with other fields using the same dataset.
                    Each record uses values from the same row.
                  </p>
                </div>
              )}
            </div>
          )}

          {(effectiveType === 'number' || effectiveType === 'integer') && (
            <div className="space-y-4">
              <RadioGroup value={strategy} onValueChange={(v: string) => setStrategy(v as Strategy)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="default" />
                  <Label htmlFor="default">Default (auto-generated)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="range" id="range" />
                  <Label htmlFor="range">Range (min to max)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed">Fixed value</Label>
                </div>
              </RadioGroup>

              {strategy === 'range' && (
                <div className="space-y-3 pl-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min">Minimum</Label>
                      <Input
                        id="min"
                        type="number"
                        value={numberMin}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumberMin(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max">Maximum</Label>
                      <Input
                        id="max"
                        type="number"
                        value={numberMax}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumberMax(parseFloat(e.target.value) || 100)}
                      />
                    </div>
                  </div>
                  {effectiveType === 'number' && (
                    <div className="space-y-2">
                      <Label htmlFor="precision">Decimal places</Label>
                      <Input
                        id="precision"
                        type="number"
                        min={0}
                        max={10}
                        value={numberPrecision}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumberPrecision(parseInt(e.target.value) || 2)}
                      />
                    </div>
                  )}
                </div>
              )}

              {strategy === 'fixed' && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="fixedValue">Value</Label>
                  <Input
                    id="fixedValue"
                    type="number"
                    value={fixedNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFixedNumber(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
          )}

          {effectiveType === 'boolean' && (
            <div className="space-y-4">
              <RadioGroup value={strategy} onValueChange={(v: string) => setStrategy(v as Strategy)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="default" />
                  <Label htmlFor="default">Default (random)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed">Always same value</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weighted" id="weighted" />
                  <Label htmlFor="weighted">Weighted probability</Label>
                </div>
              </RadioGroup>

              {strategy === 'fixed' && (
                <div className="flex items-center gap-3 pl-6">
                  <Label htmlFor="fixedBool">Value:</Label>
                  <Switch
                    id="fixedBool"
                    checked={fixedBoolean}
                    onCheckedChange={setFixedBoolean}
                  />
                  <span className="text-sm text-muted-foreground">
                    {fixedBoolean ? 'true' : 'false'}
                  </span>
                </div>
              )}

              {strategy === 'weighted' && (
                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between text-sm">
                    <span>Probability of true:</span>
                    <span className="font-mono">{Math.round(trueProbability)}%</span>
                  </div>
                  <Slider
                    value={[trueProbability]}
                    onValueChange={([v]: number[]) => setTrueProbability(v)}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              )}
            </div>
          )}

          {effectiveType === 'enum' && field.enumValues && (
            <div className="space-y-4">
              <RadioGroup value={strategy} onValueChange={(v: string) => setStrategy(v as Strategy)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="default" />
                  <Label htmlFor="default">Default (all values equally)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subset" id="subset" />
                  <Label htmlFor="subset">Subset of values</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weighted" id="weighted" />
                  <Label htmlFor="weighted">Weighted selection</Label>
                </div>
              </RadioGroup>

              {strategy === 'subset' && (
                <div className="space-y-2 pl-6">
                  <p className="text-sm text-muted-foreground mb-2">Select allowed values:</p>
                  <div className="flex flex-wrap gap-2">
                    {field.enumValues.map((value) => {
                      const strValue = String(value)
                      const isSelected = allowedEnumValues.includes(strValue)
                      return (
                        <Badge
                          key={strValue}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => handleToggleEnumValue(strValue)}
                        >
                          {strValue}
                        </Badge>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {allowedEnumValues.length} of {field.enumValues.length} values selected
                  </p>
                </div>
              )}

              {strategy === 'weighted' && (
                <div className="space-y-3 pl-6">
                  <p className="text-sm text-muted-foreground">Adjust weights (higher = more likely):</p>
                  <ScrollArea className="h-40">
                    <div className="space-y-3 pr-4">
                      {field.enumValues.map((value) => {
                        const strValue = String(value)
                        const weight = enumWeights[strValue] ?? 1
                        return (
                          <div key={strValue} className="flex items-center gap-3">
                            <span className="text-sm w-24 truncate">{strValue}</span>
                            <Slider
                              value={[weight]}
                              onValueChange={([v]: number[]) => handleEnumWeightChange(strValue, v)}
                              min={0}
                              max={10}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-sm font-mono w-6 text-right">{weight}</span>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {effectiveType === 'array' && (
            <div className="space-y-4">
              <RadioGroup value={strategy} onValueChange={(v: string) => setStrategy(v as Strategy)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="default" />
                  <Label htmlFor="default">Default (1-3 items)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="range" id="range" />
                  <Label htmlFor="range">Custom item count</Label>
                </div>
              </RadioGroup>

              {strategy === 'range' && (
                <div className="space-y-4 pl-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minItems">Minimum items</Label>
                      <Input
                        id="minItems"
                        type="number"
                        min={0}
                        max={100}
                        value={arrayMinItems}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArrayMinItems(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxItems">Maximum items</Label>
                      <Input
                        id="maxItems"
                        type="number"
                        min={1}
                        max={100}
                        value={arrayMaxItems}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArrayMaxItems(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="uniqueItems"
                      checked={arrayUniqueItems}
                      onCheckedChange={setArrayUniqueItems}
                    />
                    <Label htmlFor="uniqueItems" className="cursor-pointer">
                      Unique items only
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Each array will have between {arrayMinItems} and {arrayMaxItems} items
                    {arrayUniqueItems && ', with no duplicates'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {currentRule && (
              <Button type="button" variant="ghost" onClick={handleReset}>
                <Trash2 className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save Rule
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
