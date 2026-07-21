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
  /** Fixture publish/draft pointers — renders PublishSection when present alongside projectId */
  fixtureRecord?: {
    id: string
    publishedGenerationId: string | null
    draftGenerationId: string | null
    /** Demo-system link (Phase 2) — threaded into StorySection to gate its linked/unlinked view. */
    demoId: string | null
    /** Variant link (Phase 2) — threaded into StorySection to gate its linked/unlinked view. */
    variantId: string | null
  }
  /** Where the customer app runs, from project.settings — passed through to PublishSection's Preview button */
  previewUrl?: string | null
  /** Persists a newly-captured app URL to project.settings */
  onSavePreviewUrl?: (url: string) => Promise<void>

  // Editing capabilities
  /** Whether row-editing mode is currently on */
  editable?: boolean
  /** Called when the user toggles the "Edit rows" control in the data-view header */
  onToggleEditable?: () => void
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
  /** Shown as the Undo button's tooltip when canUndo is false — e.g. explains that undo doesn't cover add/delete/duplicate this session */
  undoDisabledReason?: string
  /** Called when user wants to reset changes */
  onReset?: () => void
  /** Number of edits accumulated in the current editing session (row-0 field edits + add/delete/duplicate) */
  editCount?: number
  /** Saves the current edits as a new draft generation */
  onSaveEdits?: () => void | Promise<void>
  /** Whether a save-as-draft request is in flight */
  isSavingEdits?: boolean
  /** Discards edits made in the current session and exits editing mode */
  onCancelEdits?: () => void
  /** Whether row-0 edits will be pinned onto a linked demo variant's storySpec on save */
  pinsWillApply?: boolean
}

export { type DemoData, type ValidationResult, type ValidationError, type ValidationWarning, type DemoNarrative }
