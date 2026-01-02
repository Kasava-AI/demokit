/**
 * GenerationHistory Component
 *
 * Displays a list of past generation runs with their metadata.
 * Features:
 * - List of generations with timestamps
 * - Generation level and record counts
 * - Validation status indicators
 * - Click to restore previous generation
 * - Delete individual entries
 */

import { useState } from 'react'
import type {
  GenerationLevel,
  GenerationMetadata,
} from '@demokit-ai/core'

// ============================================================================
// Types
// ============================================================================

export interface GenerationHistoryEntry {
  /** Unique identifier */
  id: string
  /** When the generation was created */
  timestamp: string
  /** Generation level used */
  level: GenerationLevel
  /** Metadata about the generation */
  metadata: GenerationMetadata
  /** Validation result summary */
  validation: {
    valid: boolean
    errorCount: number
    warningCount: number
  }
  /** Short description/label */
  label?: string
}

interface GenerationHistoryProps {
  /** List of history entries */
  entries: GenerationHistoryEntry[]
  /** Currently selected entry ID */
  selectedId?: string
  /** Called when an entry is selected */
  onSelect?: (entry: GenerationHistoryEntry) => void
  /** Called when an entry is deleted */
  onDelete?: (id: string) => void
  /** Called when history is cleared */
  onClear?: () => void
  /** Maximum entries to show before "Show more" */
  maxVisible?: number
}

// ============================================================================
// Component
// ============================================================================

export function GenerationHistory({
  entries,
  selectedId,
  onSelect,
  onDelete,
  onClear,
  maxVisible = 10,
}: GenerationHistoryProps) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [showAll, setShowAll] = useState(false)

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const visibleEntries = showAll ? entries : entries.slice(0, maxVisible)
  const hasMore = entries.length > maxVisible

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-2">No generation history</p>
        <p className="text-sm">Previous generations will appear here</p>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          History ({entries.length})
        </h3>
        {onClear && entries.length > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={onClear}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Entries */}
      <div className="space-y-1">
        {visibleEntries.map((entry) => (
          <HistoryEntryCard
            key={entry.id}
            entry={entry}
            isSelected={entry.id === selectedId}
            onSelect={() => onSelect?.(entry)}
            onDelete={() => onDelete?.(entry.id)}
          />
        ))}
      </div>

      {/* Show more/less */}
      {hasMore && (
        <button
          type="button"
          className="w-full text-sm text-primary hover:text-primary/80 py-2"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? 'Show less'
            : `Show ${entries.length - maxVisible} more`}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function HistoryEntryCard({
  entry,
  isSelected,
  onSelect,
  onDelete,
}: {
  entry: GenerationHistoryEntry
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showDeleteConfirm) {
      onDelete()
    } else {
      setShowDeleteConfirm(true)
      // Auto-reset after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  const formattedDate = formatRelativeTime(entry.timestamp)

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-border/80 bg-card'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        {/* Left side: Info */}
        <div className="flex-1 min-w-0">
          {/* Label and time */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {entry.label || `Generation ${entry.id.slice(0, 8)}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {formattedDate}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {/* Level */}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getLevelColor(
                entry.level
              )}`}
            >
              {formatLevel(entry.level)}
            </span>

            {/* Record count */}
            <span>{entry.metadata.totalRecords} records</span>

            {/* Validation status */}
            <span className="flex items-center gap-1">
              {entry.validation.valid ? (
                <svg
                  className="w-3.5 h-3.5 text-success"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5 text-destructive"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-destructive">
                    {entry.validation.errorCount}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Right side: Actions */}
        <button
          type="button"
          className={`p-1 rounded ${
            showDeleteConfirm
              ? 'text-destructive hover:bg-destructive/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={handleDelete}
          title={showDeleteConfirm ? 'Click again to delete' : 'Delete'}
        >
          {showDeleteConfirm ? (
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function formatLevel(level: GenerationLevel): string {
  switch (level) {
    case 'schema-valid':
      return 'Schema'
    case 'relationship-valid':
      return 'Relational'
    case 'narrative-driven':
      return 'Narrative'
    default:
      return level
  }
}

function getLevelColor(level: GenerationLevel): string {
  switch (level) {
    case 'schema-valid':
      return 'bg-muted text-muted-foreground'
    case 'relationship-valid':
      return 'bg-primary/10 text-primary'
    case 'narrative-driven':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}
