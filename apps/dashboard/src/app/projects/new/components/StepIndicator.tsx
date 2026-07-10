'use client'

import type { WizardStep } from './types'
import { STEP_ORDER, STEP_LABELS, getStepIndex } from './types'

interface StepIndicatorProps {
  currentStep: WizardStep
}

/**
 * Progress dots — completed steps fill in, the current step stretches
 * into a pill. Width/color only, 200ms, so revisiting steps stays quiet.
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const visibleSteps = STEP_ORDER.filter((s) => s !== 'complete')
  const currentIndex = getStepIndex(currentStep)

  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={visibleSteps.length}
      aria-valuenow={Math.min(currentIndex + 1, visibleSteps.length)}
      aria-valuetext={STEP_LABELS[currentStep]}
    >
      {visibleSteps.map((s, i) => {
        const isCurrent = i === currentIndex
        const isDone = i < currentIndex
        return (
          <span
            key={s}
            className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out ${
              isCurrent
                ? 'w-6 bg-primary'
                : isDone
                  ? 'w-1.5 bg-primary/70'
                  : 'w-1.5 bg-border'
            }`}
          />
        )
      })}
    </div>
  )
}
