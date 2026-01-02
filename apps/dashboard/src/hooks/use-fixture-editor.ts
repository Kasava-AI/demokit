import { useState, useCallback, useMemo } from 'react'
import { validateData, type DemoData, type ValidationResult } from '@demokit-ai/core'
import type { DemokitSchema } from '@demokit-ai/core'

export interface FieldEdit {
  model: string
  index: number
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface UseFixtureEditorOptions {
  /** Initial fixture data */
  initialData: DemoData
  /** Schema for validation */
  schema?: DemokitSchema
  /** Called when data is saved */
  onSave?: (data: DemoData) => Promise<void>
  /** Called when validation changes */
  onValidationChange?: (result: ValidationResult) => void
}

export interface UseFixtureEditorResult {
  /** Current edited data */
  data: DemoData
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Whether currently saving */
  isSaving: boolean
  /** Latest validation result */
  validation: ValidationResult | null
  /** Edit history for undo/redo */
  editHistory: FieldEdit[]
  /** Edit a single field value */
  editField: (model: string, index: number, field: string, value: unknown) => void
  /** Add a new record to a model */
  addRecord: (model: string, record: Record<string, unknown>) => void
  /** Delete a record from a model */
  deleteRecord: (model: string, index: number) => void
  /** Duplicate a record */
  duplicateRecord: (model: string, index: number) => void
  /** Reset to initial data */
  reset: () => void
  /** Save changes */
  save: () => Promise<void>
  /** Undo the last edit */
  undo: () => void
  /** Whether undo is available */
  canUndo: boolean
  /** Validate current data */
  validate: () => ValidationResult
}

/**
 * Hook for editing fixture data with dirty state tracking and validation.
 *
 * @example
 * ```tsx
 * const editor = useFixtureEditor({
 *   initialData: fixture.data,
 *   schema: project.schema,
 *   onSave: async (data) => {
 *     await updateFixture({ projectId, fixtureId, data: { data } })
 *   }
 * })
 *
 * // Edit a field
 * editor.editField('User', 0, 'name', 'New Name')
 *
 * // Check for unsaved changes
 * if (editor.isDirty) {
 *   // Show save prompt
 * }
 *
 * // Save changes
 * await editor.save()
 * ```
 */
export function useFixtureEditor({
  initialData,
  schema,
  onSave,
  onValidationChange,
}: UseFixtureEditorOptions): UseFixtureEditorResult {
  const [data, setData] = useState<DemoData>(() => structuredClone(initialData))
  const [editHistory, setEditHistory] = useState<FieldEdit[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)

  // Compute isDirty by comparing with initial data
  const isDirty = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialData)
  }, [data, initialData])

  const validate = useCallback(() => {
    if (!schema) {
      // Without schema, assume valid - create basic stats
      const totalRecords = Object.values(data).reduce((sum, arr) => sum + arr.length, 0)
      const recordsByModel = Object.entries(data).reduce((acc, [model, records]) => {
        acc[model] = records.length
        return acc
      }, {} as Record<string, number>)

      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        stats: {
          totalRecords,
          recordsByModel,
          relationshipsChecked: 0,
          typeChecks: 0,
          durationMs: 0,
        },
      }
      setValidation(result)
      onValidationChange?.(result)
      return result
    }

    const result = validateData(data, { schema })
    setValidation(result)
    onValidationChange?.(result)
    return result
  }, [data, schema, onValidationChange])

  const editField = useCallback((
    model: string,
    index: number,
    field: string,
    value: unknown
  ) => {
    setData((prev) => {
      const modelData = prev[model]
      if (!modelData || !modelData[index]) return prev

      const record = modelData[index] as Record<string, unknown>
      const oldValue = record[field]

      // Track the edit in history
      setEditHistory((h) => [...h, { model, index, field, oldValue, newValue: value }])

      // Create new data with the updated field
      const newModelData = [...modelData]
      newModelData[index] = { ...record, [field]: value }

      return {
        ...prev,
        [model]: newModelData,
      }
    })
  }, [])

  const addRecord = useCallback((model: string, record: Record<string, unknown>) => {
    setData((prev) => {
      const modelData = prev[model] || []
      return {
        ...prev,
        [model]: [...modelData, record],
      }
    })
  }, [])

  const deleteRecord = useCallback((model: string, index: number) => {
    setData((prev) => {
      const modelData = prev[model]
      if (!modelData || index < 0 || index >= modelData.length) return prev

      const newModelData = modelData.filter((_, i) => i !== index)
      return {
        ...prev,
        [model]: newModelData,
      }
    })
  }, [])

  const duplicateRecord = useCallback((model: string, index: number) => {
    setData((prev) => {
      const modelData = prev[model]
      if (!modelData || !modelData[index]) return prev

      // Clone the record (deep copy)
      const record = structuredClone(modelData[index])

      // Insert after the original
      const newModelData = [
        ...modelData.slice(0, index + 1),
        record,
        ...modelData.slice(index + 1),
      ]

      return {
        ...prev,
        [model]: newModelData,
      }
    })
  }, [])

  const reset = useCallback(() => {
    setData(structuredClone(initialData))
    setEditHistory([])
    setValidation(null)
  }, [initialData])

  const save = useCallback(async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(data)
      // Clear edit history after successful save
      setEditHistory([])
    } finally {
      setIsSaving(false)
    }
  }, [data, onSave])

  const undo = useCallback(() => {
    setEditHistory((history) => {
      if (history.length === 0) return history

      const lastEdit = history[history.length - 1]
      const { model, index, field, oldValue } = lastEdit

      // Revert the edit
      setData((prev) => {
        const modelData = prev[model]
        if (!modelData || !modelData[index]) return prev

        const record = modelData[index] as Record<string, unknown>
        const newModelData = [...modelData]
        newModelData[index] = { ...record, [field]: oldValue }

        return {
          ...prev,
          [model]: newModelData,
        }
      })

      // Remove the last edit from history
      return history.slice(0, -1)
    })
  }, [])

  const canUndo = editHistory.length > 0

  return {
    data,
    isDirty,
    isSaving,
    validation,
    editHistory,
    editField,
    addRecord,
    deleteRecord,
    duplicateRecord,
    reset,
    save,
    undo,
    canUndo,
    validate,
  }
}
