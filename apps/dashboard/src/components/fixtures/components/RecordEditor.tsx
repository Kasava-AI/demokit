'use client'

import React, { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, X, Pencil, Trash2, Copy, Eye } from 'lucide-react'

interface RecordEditorProps {
  /** The record data */
  record: Record<string, unknown>
  /** Index of the record in the model array */
  index: number
  /** Model name for display */
  modelName: string
  /** All keys across all records (ensures consistent columns) */
  allKeys?: string[]
  /** Whether editing is enabled */
  editable?: boolean
  /** Called when a field value changes */
  onFieldChange?: (index: number, field: string, value: unknown) => void
  /** Called when record is deleted */
  onDelete?: (index: number) => void
  /** Called when record is duplicated */
  onDuplicate?: (index: number) => void
  /** Called when record is inspected */
  onInspect?: (index: number, record: Record<string, unknown>) => void
}

/**
 * Inline record editor for fixture data.
 * Supports editing various field types with appropriate input controls.
 */
export function RecordEditor({
  record,
  index,
  modelName,
  allKeys,
  editable = false,
  onFieldChange,
  onDelete,
  onDuplicate,
  onInspect,
}: RecordEditorProps) {
  // Use allKeys if provided to ensure consistent columns, otherwise fall back to record keys
  const keys = allKeys || Object.keys(record)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const startEdit = useCallback((field: string, value: unknown) => {
    setEditingField(field)
    setEditValue(formatForEdit(value))
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingField(null)
    setEditValue('')
  }, [])

  const saveEdit = useCallback((field: string) => {
    if (!onFieldChange) return

    const originalValue = record[field]
    const newValue = parseValue(editValue, originalValue)
    onFieldChange(index, field, newValue)
    setEditingField(null)
    setEditValue('')
  }, [record, index, editValue, onFieldChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit(field)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }, [saveEdit, cancelEdit])

  return (
    <tr className="hover:bg-muted/50 group">
      {/* Inspect button cell */}
      <td className="px-2 py-2 w-10">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
          onClick={() => onInspect?.(index, record)}
          title={`Inspect ${modelName} record`}
        >
          <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </Button>
      </td>
      {keys.map((field) => {
        // Get value from record, treating missing keys as null for display
        const value = field in record ? record[field] : null
        return (
        <td
          key={field}
          className="px-3 py-2 text-sm text-foreground whitespace-nowrap relative"
        >
          {editingField === field ? (
            <div className="flex items-center gap-1 min-w-[150px]">
              <FieldInput
                value={editValue}
                onChange={setEditValue}
                originalValue={value}
                onKeyDown={(e) => handleKeyDown(e, field)}
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => saveEdit(field)}
              >
                <Check className="h-3 w-3 text-success" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={cancelEdit}
              >
                <X className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group/cell">
              <span className={getValueClassName(value)}>
                {formatDisplayValue(value)}
              </span>
              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover/cell:opacity-100 transition-opacity"
                  onClick={() => startEdit(field, value)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </td>
      )})}
      {/* Row actions */}
      {editable && (onDelete || onDuplicate) && (
        <td className="px-2 py-2 text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {onDuplicate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 mr-1"
              onClick={() => onDuplicate(index)}
              title={`Duplicate ${modelName} record`}
            >
              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onDelete(index)}
              title={`Delete ${modelName} record`}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </td>
      )}
    </tr>
  )
}

/**
 * Input component that adapts based on value type
 */
function FieldInput({
  value,
  onChange,
  originalValue,
  onKeyDown,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  originalValue: unknown
  onKeyDown?: (e: React.KeyboardEvent) => void
  autoFocus?: boolean
}) {
  const type = typeof originalValue

  // Boolean - use checkbox
  if (type === 'boolean') {
    return (
      <Checkbox
        checked={value === 'true'}
        onCheckedChange={(checked) => onChange(String(checked))}
        className="h-4 w-4"
      />
    )
  }

  // Number - use number input
  if (type === 'number') {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className="h-6 text-xs w-24"
      />
    )
  }

  // Long strings or objects - use textarea
  if ((type === 'string' && value.length > 50) || type === 'object') {
    return (
      <Textarea
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className="text-xs min-h-[60px] w-48"
        rows={3}
      />
    )
  }

  // Default - regular input
  return (
    <Input
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      className="h-6 text-xs w-32"
    />
  )
}

/**
 * Format a value for editing (as a string)
 */
function formatForEdit(value: unknown): string {
  if (value === null) return ''
  if (value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

/**
 * Parse an edited string value back to its original type
 */
function parseValue(editedValue: string, originalValue: unknown): unknown {
  const type = typeof originalValue

  if (type === 'boolean') {
    return editedValue.toLowerCase() === 'true'
  }

  if (type === 'number') {
    const num = Number(editedValue)
    return isNaN(num) ? originalValue : num
  }

  if (type === 'object' && originalValue !== null) {
    try {
      return JSON.parse(editedValue)
    } catch {
      return originalValue
    }
  }

  if (originalValue === null && editedValue === '') {
    return null
  }

  return editedValue
}

/**
 * Format a value for display in the table
 */
function formatDisplayValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') {
    return value.length > 50 ? value.slice(0, 50) + '...' : value
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value)
    return json.length > 50 ? json.slice(0, 50) + '...' : json
  }
  return String(value)
}

/**
 * Get CSS class for value styling based on type
 */
function getValueClassName(value: unknown): string {
  if (value === null || value === undefined) {
    return 'text-muted-foreground italic'
  }
  if (typeof value === 'boolean') {
    return value ? 'text-success' : 'text-destructive'
  }
  if (typeof value === 'number') {
    return 'text-primary font-mono'
  }
  if (typeof value === 'object') {
    return 'text-primary/70 font-mono text-xs'
  }
  return ''
}
