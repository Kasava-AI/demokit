'use client'

/**
 * GenerateButton Component
 *
 * Context-aware button with multiple states for progressive disclosure:
 * - Disabled + tooltip when prerequisites not met
 * - Primary when ready to generate
 * - Loading spinner during generation
 * - "Regenerate" variant after first generation
 *
 * Designed to clearly communicate what action is available and what's missing.
 */

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface MissingRequirement {
  key: string
  label: string
  action?: string // e.g., "Go to Settings" or "Select a template"
}

interface GenerateButtonProps {
  canGenerate: boolean
  isGenerating: boolean
  hasGenerated: boolean
  missingRequirements: MissingRequirement[]
  onGenerate: () => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function GenerateButton({
  canGenerate,
  isGenerating,
  hasGenerated,
  missingRequirements,
  onGenerate,
  className,
}: GenerateButtonProps) {
  // Determine button state
  const buttonState = useMemo(() => {
    if (isGenerating) return 'generating'
    if (!canGenerate) return 'disabled'
    if (hasGenerated) return 'regenerate'
    return 'ready'
  }, [canGenerate, isGenerating, hasGenerated])

  // Button content based on state
  const buttonContent = useMemo(() => {
    switch (buttonState) {
      case 'generating':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating...</span>
          </>
        )
      case 'regenerate':
        return (
          <>
            <RefreshCw className="h-4 w-4" />
            <span>Regenerate</span>
          </>
        )
      case 'disabled':
      case 'ready':
      default:
        return (
          <>
            <Sparkles className="h-4 w-4" />
            <span>Generate Demo Data</span>
          </>
        )
    }
  }, [buttonState])

  // Build tooltip content for disabled state
  const tooltipContent = useMemo(() => {
    if (buttonState !== 'disabled' || missingRequirements.length === 0) {
      return null
    }

    return (
      <div className="space-y-1.5 max-w-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Missing requirements</span>
        </div>
        <ul className="text-xs space-y-0.5">
          {missingRequirements.map((req) => (
            <li key={req.key} className="flex items-start gap-1.5">
              <span className="text-muted-foreground">•</span>
              <span>
                {req.label}
                {req.action && (
                  <span className="text-muted-foreground ml-1">
                    ({req.action})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }, [buttonState, missingRequirements])

  // The actual button element
  const button = (
    <Button
      size="lg"
      variant={buttonState === 'regenerate' ? 'outline' : 'default'}
      className={`w-full ${className ?? ''}`}
      onClick={onGenerate}
      disabled={!canGenerate || isGenerating}
      loading={isGenerating}
    >
      {buttonContent}
    </Button>
  )

  // Wrap in tooltip only when disabled with missing requirements
  if (buttonState === 'disabled' && tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            {/* Wrap in span to allow tooltip on disabled button */}
            <span className="w-full block">{button}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="p-3">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

// ============================================================================
// Helper: Get missing requirements from current state
// ============================================================================

interface GenerationState {
  hasSchema: boolean
  hasTemplate: boolean
  hasNarrative: boolean
}

export function getMissingRequirements(state: GenerationState): MissingRequirement[] {
  const requirements: MissingRequirement[] = []

  if (!state.hasSchema) {
    requirements.push({
      key: 'schema',
      label: 'Upload an API schema',
      action: 'Go to Settings',
    })
  }

  // User needs either a template OR a narrative scenario
  if (!state.hasTemplate && !state.hasNarrative) {
    requirements.push({
      key: 'content',
      label: 'Select a template or write a scenario',
    })
  }

  return requirements
}
