/**
 * Shared types for FixtureDetail component
 */

import type { DemoData, ValidationResult, ValidationError, ValidationWarning, DemoNarrative } from '@demokit-ai/core'

/** Sub-mode for the preview: table view or code view */
export type PreviewSubMode = 'table' | 'code'

/** Supported export formats */
export type ExportFormat = 'typescript' | 'json' | 'sql' | 'csv'

/** Export event data for tracking */
export interface ExportEvent {
  format: ExportFormat
  modelName?: string // For CSV exports (one model at a time)
  timestamp: string
}

export interface FixtureDetailProps {
  /** Project ID for API calls */
  projectId?: string
  /** Fixture ID for API calls */
  fixtureId?: string
  /** Fixture name */
  name?: string
  /** Called when the name is edited */
  onNameChange?: (name: string) => void
  /** Fixture description */
  description?: string
  /** Creation timestamp (ISO string) */
  createdAt?: string
  /** Creator info */
  createdBy?: {
    fullName?: string
    email: string
  }
  /** Template name - shown as a badge */
  templateName?: string
  /** The generated data */
  data?: DemoData
  /** Generated TypeScript code (if available) */
  code?: string
  /** Validation results */
  validation?: ValidationResult
  /** Current export format */
  format?: ExportFormat
  /** Whether data is being generated */
  loading?: boolean
  /** Whether save is in progress */
  saving?: boolean
  /** Called when user wants to regenerate */
  onRegenerate?: () => void
  /** Called when user wants to re-validate data */
  onRevalidate?: () => void
  /** Called when user exports data (for tracking) */
  onExport?: (event: ExportEvent) => void
  /** Called when user wants to save the fixture (simple save for existing fixtures) */
  onSave?: () => void
  /** Called when user wants to save with a name (opens dialog for new fixtures) */
  onSaveWithName?: (name: string) => Promise<void>
  /** Name of already-saved fixture (hides save button if set) */
  savedFixtureName?: string
  /** Called when user wants to duplicate the fixture */
  onDuplicate?: () => void
  /** Called when user wants to delete the fixture */
  onDelete?: () => void
  /** Narrative for TypeScript header comments */
  narrative?: DemoNarrative
  /** Project name for integration guide */
  projectName?: string

  // Editing capabilities
  /** Whether editing is enabled */
  editable?: boolean
  /** Whether there are unsaved changes */
  isDirty?: boolean
  /** Called when a field value changes */
  onFieldChange?: (model: string, index: number, field: string, value: unknown) => void
  /** Called when a record is deleted */
  onDeleteRecord?: (model: string, index: number) => void
  /** Called when a record is duplicated */
  onDuplicateRecord?: (model: string, index: number) => void
  /** Called when a new record is added */
  onAddRecord?: (model: string) => void
  /** Called when user wants to undo the last edit */
  onUndo?: () => void
  /** Whether undo is available */
  canUndo?: boolean
  /** Called when user wants to reset changes */
  onReset?: () => void
}

export { type DemoData, type ValidationResult, type ValidationError, type ValidationWarning, type DemoNarrative }
