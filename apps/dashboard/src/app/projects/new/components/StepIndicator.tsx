'use client'

import type { WizardStep } from './types'
import { STEP_ORDER, STEP_LABELS, getStepIndex } from './types'

interface StepIndicatorProps {
  currentStep: WizardStep
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const visibleSteps = STEP_ORDER.filter((s) => s !== 'complete')
  const currentIndex = getStepIndex(currentStep)
  const totalSteps = visibleSteps.length

  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <span className="text-sm text-muted-foreground">
        Step {currentIndex + 1} of {totalSteps}
      </span>
      <span className="text-sm font-medium">
        {STEP_LABELS[currentStep]}
      </span>
    </div>
  )
}
