/**
 * GitHubSchemaSourceSheet Component
 *
 * Multi-step sheet for importing schema from GitHub or file upload.
 * Orchestrates the flow: Method → Repository → Files → Preview → Confirm
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react'

import type {
  GitHubSchemaSourceSheetProps,
  SchemaImportState,
  SchemaImportStep,
} from './types'
import { MethodSelectionStep } from './steps/MethodSelectionStep'
import { RepositoryPickerStep } from './steps/RepositoryPickerStep'
import { SchemaFileSelectorStep } from './steps/SchemaFileSelectorStep'
import { SchemaPreviewStep } from './steps/SchemaPreviewStep'
import { ConfirmImportStep } from './steps/ConfirmImportStep'

const STEP_ORDER: SchemaImportStep[] = [
  'method',
  'repository',
  'files',
  'preview',
  'confirm',
]

const STEP_TITLES: Record<SchemaImportStep, string> = {
  method: 'Choose Import Method',
  repository: 'Select Repository',
  files: 'Select Schema Files',
  preview: 'Preview Schema',
  confirm: 'Confirm Import',
}

const STEP_DESCRIPTIONS: Record<SchemaImportStep, string> = {
  method: 'Connect to GitHub or upload files directly',
  repository: 'Choose a repository to import schema from',
  files: 'Select which schema files to parse',
  preview: 'Review the extracted models and relationships',
  confirm: 'Finalize and import the schema',
}

function getInitialState(): SchemaImportState {
  return {
    step: 'method',
    method: null,
    repository: null,
    branch: null,
    selectedFiles: [],
    uploadedFiles: [],
    parsedSchema: null,
    isLoading: false,
    error: null,
  }
}

export function GitHubSchemaSourceSheet({
  projectId,
  open,
  onOpenChange,
  onImportComplete,
}: GitHubSchemaSourceSheetProps) {
  const [state, setState] = useState<SchemaImportState>(getInitialState)

  // Reset state when sheet closes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setState(getInitialState())
      }
      onOpenChange(isOpen)
    },
    [onOpenChange]
  )

  // Update state helper
  const updateState = useCallback((updates: Partial<SchemaImportState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Navigation helpers
  const currentStepIndex = STEP_ORDER.indexOf(state.step)

  const canGoBack = useMemo(() => {
    if (state.step === 'method') return false
    // Skip repository step if using upload method
    if (state.step === 'files' && state.method === 'upload') return true
    return currentStepIndex > 0
  }, [state.step, state.method, currentStepIndex])

  const canGoNext = useMemo(() => {
    switch (state.step) {
      case 'method':
        return state.method !== null
      case 'repository':
        return state.repository !== null && state.branch !== null
      case 'files':
        return state.selectedFiles.length > 0 || state.uploadedFiles.length > 0
      case 'preview':
        return state.parsedSchema !== null && state.parsedSchema.models.length > 0
      case 'confirm':
        return true
      default:
        return false
    }
  }, [state])

  const goToNextStep = useCallback(() => {
    let nextIndex = currentStepIndex + 1
    // Skip repository step if using upload method
    if (state.step === 'method' && state.method === 'upload') {
      nextIndex = STEP_ORDER.indexOf('files')
    }
    if (nextIndex < STEP_ORDER.length) {
      updateState({ step: STEP_ORDER[nextIndex], error: null })
    }
  }, [currentStepIndex, state.step, state.method, updateState])

  const goToPrevStep = useCallback(() => {
    let prevIndex = currentStepIndex - 1
    // Skip repository step if using upload method
    if (state.step === 'files' && state.method === 'upload') {
      prevIndex = STEP_ORDER.indexOf('method')
    }
    if (prevIndex >= 0) {
      updateState({ step: STEP_ORDER[prevIndex], error: null })
    }
  }, [currentStepIndex, state.step, state.method, updateState])

  // Handle import completion
  const handleImportComplete = useCallback(() => {
    if (state.parsedSchema) {
      onImportComplete?.(state.parsedSchema)
      handleOpenChange(false)
    }
  }, [state.parsedSchema, onImportComplete, handleOpenChange])

  // Render the current step
  const renderStep = () => {
    const stepProps = {
      state,
      onStateChange: updateState,
      onNext: goToNextStep,
      onBack: goToPrevStep,
      projectId,
    }

    switch (state.step) {
      case 'method':
        return <MethodSelectionStep {...stepProps} />
      case 'repository':
        return <RepositoryPickerStep {...stepProps} />
      case 'files':
        return <SchemaFileSelectorStep {...stepProps} />
      case 'preview':
        return <SchemaPreviewStep {...stepProps} />
      case 'confirm':
        return <ConfirmImportStep {...stepProps} onComplete={handleImportComplete} />
      default:
        return null
    }
  }

  // Progress indicator
  const visibleSteps = state.method === 'upload'
    ? STEP_ORDER.filter((s) => s !== 'repository')
    : STEP_ORDER
  const progressStepIndex = visibleSteps.indexOf(state.step)

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" open={open} className="sm:max-w-xl w-full">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            {visibleSteps.map((step, idx) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    idx < progressStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : idx === progressStepIndex
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx < progressStepIndex ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < visibleSteps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      idx < progressStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <SheetTitle>{STEP_TITLES[state.step]}</SheetTitle>
          <SheetDescription>{STEP_DESCRIPTIONS[state.step]}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6">{renderStep()}</div>

        {state.error && (
          <div className="mx-4 mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-start gap-2">
            <X className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <SheetFooter className="border-t pt-4 flex-row justify-between">
          <Button
            variant="outline"
            onClick={goToPrevStep}
            disabled={!canGoBack || state.isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {state.step !== 'confirm' ? (
            <Button
              onClick={goToNextStep}
              disabled={!canGoNext || state.isLoading}
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleImportComplete}
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Import Schema
                </>
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
