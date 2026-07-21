'use client'

import { useCallback, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FixtureDetail } from '@/components/fixtures'
import { useFixtureEditor } from '@/hooks/use-fixture-editor'
import { useCreateGeneration, type FixtureWithRelations } from '@/hooks/use-fixtures'
import { useDemoVariant, useUpdateDemoVariant } from '@/hooks/use-demos'
import type { RowEdit } from '@/lib/story/pins-from-edits'
import { saveWithPinRestore } from '@/lib/story/save-with-pin-restore'
import type { DemoData, StorySpec, ValidationResult } from '@demokit-ai/core'
import type { DemokitSchema } from './types'

interface SelectedFixturePreviewProps {
  fixture: FixtureWithRelations
  projectId: string
  projectName: string
  validation: ValidationResult | undefined
  /** Project schema — needed to validate edited rows the same way use-generation.ts does. */
  schema?: DemokitSchema
  onNameChange: (newName: string) => void
  onRegenerate: () => void
  onClearSelection: () => void
  onDelete: () => void
  previewUrl: string | null
  onSavePreviewUrl: (url: string) => Promise<void>
}

/** Builds a blank record matching an existing record's keys/types (best-effort; falls back to `{}` when the model has no rows yet). */
function createBlankRecord(sample: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!sample) return {}
  return Object.fromEntries(Object.entries(sample).map(([key, value]) => [key, zeroValueFor(value)]))
}

function zeroValueFor(value: unknown): unknown {
  if (typeof value === 'number') return 0
  if (typeof value === 'boolean') return false
  if (typeof value === 'string') return ''
  if (Array.isArray(value)) return []
  if (value && typeof value === 'object') return {}
  return null
}

export function SelectedFixturePreview({
  fixture,
  projectId,
  projectName,
  validation,
  schema,
  onNameChange,
  onRegenerate,
  onClearSelection,
  onDelete,
  previewUrl,
  onSavePreviewUrl,
}: SelectedFixturePreviewProps) {
  const gen = fixture.publishedGeneration

  // Row editing (Task 9): edits are made against the published generation's
  // data and saved as a new draft — never mutate what's currently published.
  const [isEditingRows, setIsEditingRows] = useState(false)
  const [isSavingEdits, setIsSavingEdits] = useState(false)

  const editor = useFixtureEditor({
    initialData: (gen?.data ?? {}) as DemoData,
    schema,
  })

  const createGenerationMutation = useCreateGeneration()
  const updateVariantMutation = useUpdateDemoVariant()

  // Spec Decision 4: if this fixture was produced from a demo variant with a
  // saved StorySpec, row-0 field edits are promoted to pins on save so a
  // future regeneration keeps them. Skipped silently when there's no linked
  // variant or the variant has no storySpec yet.
  const { data: linkedVariant } = useDemoVariant(
    projectId,
    fixture.demoId ?? '',
    fixture.variantId ?? ''
  )
  const pinsWillApply = !!linkedVariant?.storySpec

  const handleCancelEdits = useCallback(() => {
    editor.reset()
    setIsEditingRows(false)
  }, [editor])

  const handleToggleEditable = useCallback(() => {
    if (isEditingRows) {
      handleCancelEdits()
    } else {
      setIsEditingRows(true)
    }
  }, [isEditingRows, handleCancelEdits])

  const handleAddRecord = useCallback(
    (model: string) => {
      editor.addRecord(model, createBlankRecord(editor.data[model]?.[0]))
    },
    [editor]
  )

  const handleSaveEdits = useCallback(async () => {
    if (!gen) return

    setIsSavingEdits(true)
    try {
      const spec =
        pinsWillApply && linkedVariant && fixture.demoId && fixture.variantId
          ? (linkedVariant.storySpec as unknown as StorySpec)
          : null
      const demoId = fixture.demoId
      const variantId = fixture.variantId

      const rowEdits: RowEdit[] = editor.editHistory.map((e) => ({
        model: e.model,
        rowIndex: e.index,
        field: e.field,
        value: e.newValue,
      }))

      // saveWithPinRestore persists the (idempotent) variant pin update
      // BEFORE creating the draft generation, and best-effort restores the
      // variant's pre-session pins if generation creation then fails — see
      // save-with-pin-restore.ts for the full retry-safety rationale.
      await saveWithPinRestore({
        edits: rowEdits,
        finalData: editor.data,
        spec,
        updateVariantPins: async (pins) => {
          if (!spec || !demoId || !variantId) return
          await updateVariantMutation.mutateAsync({
            projectId,
            demoId,
            variantId,
            data: { storySpec: { ...spec, pins } },
          })
        },
        createGeneration: async () => {
          const result = editor.validate()
          return createGenerationMutation.mutateAsync({
            projectId,
            fixtureId: fixture.id,
            data: {
              label: 'Manual edit',
              level: gen.level,
              data: editor.data as Record<string, unknown[]>,
              validationValid: result.valid,
              validationErrorCount: result.errors.length,
              validationWarningCount: result.warnings.length,
              validationErrors: result.errors.map((e) => ({
                type: e.type,
                model: e.model,
                field: e.field,
                message: e.message,
              })),
              recordsByModel: Object.fromEntries(
                Object.entries(editor.data).map(([model, rows]) => [model, rows.length])
              ),
              inputParameters: { editedFrom: gen.id },
            },
          })
        },
        onPinsRestoreFailed: () => {
          toast.error(
            "Draft creation failed and the story pins couldn't be restored automatically — review them in the variant's story settings."
          )
        },
      })

      toast.success('Saved as draft', {
        description: 'Publish it from the Publish section when ready.',
      })
      editor.reset()
      setIsEditingRows(false)
    } finally {
      setIsSavingEdits(false)
    }
  }, [
    gen,
    editor,
    createGenerationMutation,
    projectId,
    fixture.id,
    fixture.demoId,
    fixture.variantId,
    pinsWillApply,
    linkedVariant,
    updateVariantMutation,
  ])

  if (!gen) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No generation data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This fixture doesn&apos;t have any generated data yet.
        </p>
        <Button onClick={onClearSelection}>
          Create New Fixture
        </Button>
      </div>
    )
  }

  return (
    <FixtureDetail
      projectId={projectId}
      fixtureId={fixture.id}
      name={fixture.name}
      onNameChange={onNameChange}
      description={fixture.description || undefined}
      data={editor.data}
      // While editing, the pre-formatted TypeScript string is stale (it
      // reflects the published generation, not live edits) — drop it so the
      // Code tab reformats from editor.data instead.
      code={isEditingRows ? undefined : gen.code || undefined}
      validation={validation}
      narrative={fixture.description ? { scenario: fixture.description, keyPoints: [] } : undefined}
      projectName={projectName}
      onRegenerate={onRegenerate}
      saving={false}
      createdAt={fixture.createdAt}
      createdBy={fixture.createdBy ? {
        fullName: fixture.createdBy.fullName || undefined,
        email: fixture.createdBy.email,
      } : undefined}
      templateName={fixture.template?.name}
      fixtureRecord={{
        id: fixture.id,
        publishedGenerationId: fixture.publishedGenerationId,
        draftGenerationId: fixture.draftGenerationId,
        demoId: fixture.demoId,
        variantId: fixture.variantId,
      }}
      previewUrl={previewUrl}
      onSavePreviewUrl={onSavePreviewUrl}
      onDuplicate={() => {}}
      onDelete={onDelete}
      editable={isEditingRows}
      onToggleEditable={handleToggleEditable}
      isDirty={editor.isDirty}
      onFieldChange={editor.editField}
      onDeleteRecord={editor.deleteRecord}
      onDuplicateRecord={editor.duplicateRecord}
      onAddRecord={handleAddRecord}
      onUndo={editor.undo}
      canUndo={editor.canUndo}
      undoDisabledReason={
        editor.hasStructuralEdit
          ? "Undo isn't available after adding, deleting, or duplicating a row — use Reset to discard all changes instead."
          : undefined
      }
      onReset={editor.reset}
      editCount={editor.editHistory.length}
      onSaveEdits={handleSaveEdits}
      isSavingEdits={isSavingEdits}
      onCancelEdits={handleCancelEdits}
      pinsWillApply={pinsWillApply}
    />
  )
}
