'use client'

/**
 * SchemaEdge Component
 *
 * Custom React Flow edge for displaying relationships between entities.
 * Features:
 * - Cardinality indicators (1:1, 1:n, n:1, n:n)
 * - Smooth step path style
 * - Hover state with relationship details
 */

import { memo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { cn } from '@/lib/utils'

interface SchemaEdgeData {
  relationType?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
}

function SchemaEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const edgeData = data as SchemaEdgeData | undefined

  const relationType = edgeData?.relationType || 'one-to-one'

  // Get the edge path
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  // Get cardinality labels
  const { sourceLabel, targetLabel } = getCardinalityLabels(relationType)

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      {/* Visible edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: isHovered || selected ? 2 : 1.5,
          stroke: isHovered || selected
            ? 'hsl(var(--primary))'
            : 'hsl(var(--muted-foreground) / 0.4)',
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {/* Cardinality labels */}
      <EdgeLabelRenderer>
        {/* Source cardinality (near source node) */}
        <div
          className={cn(
            'absolute text-[10px] font-mono pointer-events-none',
            'px-1 rounded bg-background/80',
            isHovered || selected
              ? 'text-primary'
              : 'text-muted-foreground'
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${sourceX + 15}px, ${sourceY}px)`,
          }}
        >
          {sourceLabel}
        </div>

        {/* Target cardinality (near target node) */}
        <div
          className={cn(
            'absolute text-[10px] font-mono pointer-events-none',
            'px-1 rounded bg-background/80',
            isHovered || selected
              ? 'text-primary'
              : 'text-muted-foreground'
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${targetX - 15}px, ${targetY}px)`,
          }}
        >
          {targetLabel}
        </div>

        {/* Relationship type label (center of edge) - shown on hover */}
        {isHovered && (
          <div
            className="absolute px-2 py-1 rounded bg-popover border shadow-sm text-xs pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {formatRelationType(relationType)}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}

// Get source and target cardinality labels based on relationship type
function getCardinalityLabels(
  relationType: string
): { sourceLabel: string; targetLabel: string } {
  switch (relationType) {
    case 'one-to-one':
      return { sourceLabel: '1', targetLabel: '1' }
    case 'one-to-many':
      return { sourceLabel: '1', targetLabel: 'n' }
    case 'many-to-one':
      return { sourceLabel: 'n', targetLabel: '1' }
    case 'many-to-many':
      return { sourceLabel: 'n', targetLabel: 'n' }
    default:
      return { sourceLabel: '', targetLabel: '' }
  }
}

// Format relationship type for display
function formatRelationType(relationType: string): string {
  switch (relationType) {
    case 'one-to-one':
      return 'One-to-One (1:1)'
    case 'one-to-many':
      return 'One-to-Many (1:n)'
    case 'many-to-one':
      return 'Many-to-One (n:1)'
    case 'many-to-many':
      return 'Many-to-Many (n:n)'
    default:
      return relationType
  }
}

export const SchemaEdge = memo(SchemaEdgeComponent)
