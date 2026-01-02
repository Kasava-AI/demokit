'use client'

/**
 * SchemaNode Component
 *
 * Custom React Flow node for displaying database models/entities.
 * Features:
 * - Compact view with model name and field count
 * - Cluster color indicator
 * - Selection and highlight states
 * - Hover expansion showing field details
 */

import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { SchemaModel } from './SchemaExplorerSheet'

interface SchemaNodeData {
  label: string
  schema?: SchemaModel
  clusterColor?: string
  isHighlighted?: boolean
  isSelected?: boolean
  fieldCount: number
}

function SchemaNodeComponent({ data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const nodeData = data as unknown as SchemaNodeData

  const {
    label,
    schema,
    clusterColor,
    isHighlighted,
    isSelected,
    fieldCount,
  } = nodeData

  // Get first few fields for preview
  const fields = schema?.properties
    ? Object.entries(schema.properties).slice(0, 5)
    : []
  const hasMoreFields = fieldCount > 5

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-background shadow-sm transition-all duration-200',
        'min-w-[160px] max-w-[200px]',
        selected || isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border',
        isHighlighted && 'ring-2 ring-yellow-400/50 border-yellow-400',
        isHovered && !selected && 'border-muted-foreground/50 shadow-md'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cluster color indicator */}
      {clusterColor && (
        <div
          className={cn(
            'absolute -left-1 top-2 bottom-2 w-1 rounded-full',
            clusterColor
          )}
        />
      )}

      {/* Source handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-muted-foreground/50 !border-0"
      />

      {/* Target handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-muted-foreground/50 !border-0"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{label}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
          </span>
        </div>
        {schema?.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {schema.description}
          </p>
        )}
      </div>

      {/* Fields preview - shown when hovered or selected */}
      {(isHovered || selected || isSelected) && fields.length > 0 && (
        <div className="px-3 py-2 space-y-0.5">
          {fields.map(([name, prop]) => (
            <div
              key={name}
              className="flex items-center justify-between text-xs gap-2"
            >
              <span
                className={cn(
                  'truncate',
                  prop.required ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {name}
              </span>
              <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                {formatType(prop.type, prop.format)}
              </span>
            </div>
          ))}
          {hasMoreFields && (
            <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
              +{fieldCount - 5} more
            </div>
          )}
        </div>
      )}

      {/* Compact field count when not expanded */}
      {!isHovered && !selected && !isSelected && fields.length > 0 && (
        <div className="px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="flex -space-x-1">
              {[...Array(Math.min(3, fieldCount))].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
                />
              ))}
            </div>
            <span>
              {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Format type for display
function formatType(type?: string, format?: string): string {
  if (!type) return '?'

  // Common type abbreviations
  const typeMap: Record<string, string> = {
    string: 'str',
    number: 'num',
    integer: 'int',
    boolean: 'bool',
    object: 'obj',
    array: 'arr',
  }

  const baseType = typeMap[type] || type

  // Add format info if present
  if (format) {
    if (format === 'uuid') return 'uuid'
    if (format === 'date-time') return 'datetime'
    if (format === 'email') return 'email'
    if (format === 'uri') return 'url'
    return format
  }

  return baseType
}

export const SchemaNode = memo(SchemaNodeComponent)
