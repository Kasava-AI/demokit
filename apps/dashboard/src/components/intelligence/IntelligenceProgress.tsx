/**
 * IntelligenceProgress Component
 *
 * Multi-step progress indicator for intelligence gathering.
 * Shows: Schema parsed, Website analyzed, Help center analyzed, README analyzed,
 * Synthesizing, Generating templates.
 */

import { useMemo } from 'react'
import type { IntelligenceProgress as ProgressType, IntelligencePhase } from '@intelligence'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileSearch,
  Globe,
  HelpCircle,
  BookOpen,
  Brain,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  Circle,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface IntelligenceProgressProps {
  progress?: ProgressType
  /** Sources that were requested (to show which steps apply) */
  requestedSources?: {
    website?: boolean
    helpCenter?: boolean
    readme?: boolean
  }
}

interface StepConfig {
  phase: IntelligencePhase
  icon: React.ComponentType<{ className?: string }>
  label: string
  optional?: boolean
}

// ============================================================================
// Step Configuration
// ============================================================================

const ALL_STEPS: StepConfig[] = [
  { phase: 'parsing_schema', icon: FileSearch, label: 'Parse Schema' },
  { phase: 'fetching_website', icon: Globe, label: 'Analyze Website', optional: true },
  { phase: 'fetching_help_center', icon: HelpCircle, label: 'Analyze Help Center', optional: true },
  { phase: 'analyzing_readme', icon: BookOpen, label: 'Analyze README', optional: true },
  { phase: 'synthesizing', icon: Brain, label: 'Synthesize Intelligence' },
  { phase: 'generating_templates', icon: Sparkles, label: 'Generate Templates' },
]

const PHASE_ORDER: IntelligencePhase[] = [
  'parsing_schema',
  'fetching_website',
  'fetching_help_center',
  'analyzing_readme',
  'synthesizing',
  'generating_templates',
  'complete',
]

// ============================================================================
// Component
// ============================================================================

export function IntelligenceProgress({
  progress,
  requestedSources = {},
}: IntelligenceProgressProps) {
  // Filter steps based on requested sources
  const activeSteps = useMemo(() => {
    return ALL_STEPS.filter((step) => {
      if (!step.optional) return true
      if (step.phase === 'fetching_website') return requestedSources.website
      if (step.phase === 'fetching_help_center') return requestedSources.helpCenter
      if (step.phase === 'analyzing_readme') return requestedSources.readme
      return true
    })
  }, [requestedSources])

  const getStepStatus = (phase: IntelligencePhase): 'completed' | 'active' | 'pending' | 'error' | 'skipped' => {
    if (!progress) return 'pending'

    const currentIndex = PHASE_ORDER.indexOf(progress.phase)
    const stepIndex = PHASE_ORDER.indexOf(phase)

    if (progress.phase === 'failed') {
      // Find which step failed based on progress
      if (stepIndex < currentIndex) return 'completed'
      if (stepIndex === currentIndex) return 'error'
      return 'pending'
    }

    if (progress.phase === 'complete') {
      return 'completed'
    }

    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'active'
    return 'pending'
  }

  const renderStepIcon = (step: StepConfig) => {
    const status = getStepStatus(step.phase)
    const Icon = step.icon

    const baseClasses = 'h-5 w-5'
    const containerClasses = 'flex items-center justify-center w-8 h-8 rounded-full shrink-0'

    switch (status) {
      case 'completed':
        return (
          <div className={`${containerClasses} bg-success/10`}>
            <Check className={`${baseClasses} text-success`} />
          </div>
        )
      case 'active':
        return (
          <div className={`${containerClasses} bg-primary/10`}>
            <Loader2 className={`${baseClasses} text-primary animate-spin`} />
          </div>
        )
      case 'error':
        return (
          <div className={`${containerClasses} bg-destructive/10`}>
            <AlertCircle className={`${baseClasses} text-destructive`} />
          </div>
        )
      case 'skipped':
        return (
          <div className={`${containerClasses} bg-muted`}>
            <Circle className={`${baseClasses} text-muted-foreground`} />
          </div>
        )
      default:
        return (
          <div className={`${containerClasses} bg-muted`}>
            <Icon className={`${baseClasses} text-muted-foreground`} />
          </div>
        )
    }
  }

  const renderStep = (step: StepConfig, _index: number, isLast: boolean) => {
    const status = getStepStatus(step.phase)
    const isActive = status === 'active'

    return (
      <div key={step.phase} className="flex gap-3">
        <div className="flex flex-col items-center">
          {renderStepIcon(step)}
          {!isLast && (
            <div
              className={`w-0.5 flex-1 my-2 ${
                status === 'completed'
                  ? 'bg-success'
                  : 'bg-muted'
              }`}
            />
          )}
        </div>
        <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
          <p
            className={`font-medium text-sm ${
              status === 'pending' ? 'text-muted-foreground' : ''
            } ${status === 'error' ? 'text-destructive' : ''}`}
          >
            {step.label}
            {step.optional && (
              <Badge variant="outline" className="ml-2 text-xs">
                Optional
              </Badge>
            )}
          </p>
          {isActive && progress?.message && (
            <p className="text-xs text-muted-foreground mt-1">{progress.message}</p>
          )}
          {status === 'error' && progress?.errors && progress.errors.length > 0 && (
            <p className="text-xs text-destructive mt-1">
              {progress.errors[0]}
            </p>
          )}
        </div>
      </div>
    )
  }

  const isComplete = progress?.phase === 'complete'
  const isFailed = progress?.phase === 'failed'

  return (
    <Card className={isFailed ? 'border-destructive/50' : isComplete ? 'border-success/50' : ''}>
      <CardContent className="pt-6">
        {/* Header with progress percentage */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <>
                <Check className="h-5 w-5 text-success" />
                <span className="font-medium text-success">
                  Intelligence Complete
                </span>
              </>
            ) : isFailed ? (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="font-medium text-destructive">
                  Intelligence Failed
                </span>
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Building Intelligence...</span>
              </>
            )}
          </div>
          {progress && (
            <Badge variant={isComplete ? 'default' : 'secondary'}>
              {progress.progress}%
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className={`h-full transition-all duration-500 ${
              isFailed ? 'bg-destructive' : isComplete ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${progress?.progress || 0}%` }}
          />
        </div>

        <Separator className="mb-6" />

        {/* Steps */}
        <div className="space-y-0">
          {activeSteps.map((step, index) =>
            renderStep(step, index, index === activeSteps.length - 1)
          )}
        </div>
      </CardContent>
    </Card>
  )
}
