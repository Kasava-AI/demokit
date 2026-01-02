/**
 * GenerationProgress Component
 *
 * Real-time progress display for demo data generation.
 * Shows AI thinking, validation status, retry attempts, and final result.
 */

import { useState, useEffect, useCallback } from 'react'
import type { IntelligenceProgress, IntelligencePhase } from '@intelligence'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Check,
  Loader2,
  AlertCircle,
  FileSearch,
  Globe,
  HelpCircle,
  BookOpen,
  Brain,
  Sparkles,
  X,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface GenerationProgressProps {
  progress?: IntelligenceProgress
  onCancel?: () => void
  onRetry?: () => void
  disabled?: boolean
}

interface PhaseConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
}

// ============================================================================
// Phase Configuration
// ============================================================================

const PHASE_CONFIG: Record<IntelligencePhase, PhaseConfig> = {
  parsing_schema: {
    icon: FileSearch,
    label: 'Parsing Schema',
    description: 'Analyzing your OpenAPI specification',
  },
  fetching_website: {
    icon: Globe,
    label: 'Fetching Website',
    description: 'Gathering content from your website',
  },
  fetching_help_center: {
    icon: HelpCircle,
    label: 'Fetching Help Center',
    description: 'Reading help documentation',
  },
  analyzing_readme: {
    icon: BookOpen,
    label: 'Analyzing README',
    description: 'Processing README and documentation',
  },
  synthesizing: {
    icon: Brain,
    label: 'Synthesizing Intelligence',
    description: 'Understanding your application',
  },
  generating_templates: {
    icon: Sparkles,
    label: 'Generating Templates',
    description: 'Creating narrative templates',
  },
  complete: {
    icon: Check,
    label: 'Complete',
    description: 'Intelligence gathering finished',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    description: 'An error occurred',
  },
}

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

export function GenerationProgress({
  progress,
  onCancel,
  onRetry,
  disabled = false,
}: GenerationProgressProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [completedPhases, setCompletedPhases] = useState<IntelligencePhase[]>([])

  // Track completed phases
  useEffect(() => {
    if (!progress) return

    const currentPhaseIndex = PHASE_ORDER.indexOf(progress.phase)
    const newCompletedPhases = PHASE_ORDER.slice(0, currentPhaseIndex)
    setCompletedPhases(newCompletedPhases)

    // Add log entry
    if (progress.message) {
      setLogs((prev) => {
        const timestamp = new Date().toLocaleTimeString()
        const newLog = `[${timestamp}] ${progress.message}`
        // Avoid duplicates
        if (prev[prev.length - 1] !== newLog) {
          return [...prev, newLog]
        }
        return prev
      })
    }
  }, [progress])

  const getPhaseStatus = useCallback(
    (phase: IntelligencePhase): 'completed' | 'active' | 'pending' | 'error' => {
      if (!progress) return 'pending'
      if (progress.phase === 'failed' && phase === progress.phase) return 'error'
      if (completedPhases.includes(phase)) return 'completed'
      if (progress.phase === phase) return 'active'
      return 'pending'
    },
    [progress, completedPhases]
  )

  const renderPhaseIcon = (phase: IntelligencePhase) => {
    const status = getPhaseStatus(phase)
    const config = PHASE_CONFIG[phase]
    const Icon = config.icon

    if (status === 'completed') {
      return (
        <div className="rounded-full bg-success/10 p-2">
          <Check className="h-4 w-4 text-success" />
        </div>
      )
    }

    if (status === 'active') {
      return (
        <div className="rounded-full bg-primary/10 p-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        </div>
      )
    }

    if (status === 'error') {
      return (
        <div className="rounded-full bg-destructive/10 p-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
      )
    }

    return (
      <div className="rounded-full bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  const renderPhase = (phase: IntelligencePhase) => {
    const status = getPhaseStatus(phase)
    const config = PHASE_CONFIG[phase]

    return (
      <div
        key={phase}
        className={`flex items-center gap-3 py-2 ${
          status === 'pending' ? 'opacity-50' : ''
        }`}
      >
        {renderPhaseIcon(phase)}
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-sm ${
              status === 'error' ? 'text-destructive' : ''
            }`}
          >
            {config.label}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {status === 'active' && progress?.message
              ? progress.message
              : config.description}
          </p>
        </div>
        {status === 'active' && (
          <Badge variant="secondary" className="shrink-0">
            {progress?.progress || 0}%
          </Badge>
        )}
      </div>
    )
  }

  const isComplete = progress?.phase === 'complete'
  const isFailed = progress?.phase === 'failed'

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {isComplete
              ? 'Generation Complete'
              : isFailed
              ? 'Generation Failed'
              : 'Generating Intelligence...'}
          </CardTitle>
          {!isComplete && !isFailed && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={disabled}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          {isFailed && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={disabled}
            >
              Retry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isFailed ? 'bg-destructive' : isComplete ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${progress?.progress || 0}%` }}
          />
        </div>

        {/* Phase list */}
        <div className="space-y-1">
          {PHASE_ORDER.filter((p) => p !== 'failed').map(renderPhase)}
        </div>

        {/* Error display */}
        {isFailed && progress?.errors && progress.errors.length > 0 && (
          <div className="rounded-lg bg-destructive/10 p-3 space-y-2">
            <p className="text-sm font-medium text-destructive">
              Errors:
            </p>
            <ul className="text-sm text-destructive/80 list-disc list-inside">
              {progress.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Log output */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Log</p>
            <ScrollArea className="h-24 rounded-md border bg-muted/50">
              <div className="p-3 font-mono text-xs space-y-1">
                {logs.map((log, i) => (
                  <p key={i} className="text-muted-foreground">
                    {log}
                  </p>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Simpler Progress Component for Data Generation
// ============================================================================

interface DataGenerationProgressProps {
  status: 'idle' | 'generating' | 'validating' | 'retrying' | 'success' | 'error'
  attempt?: number
  maxAttempts?: number
  validationErrors?: string[]
  message?: string
  onCancel?: () => void
}

export function DataGenerationProgress({
  status,
  attempt = 1,
  maxAttempts = 3,
  validationErrors = [],
  message,
  onCancel,
}: DataGenerationProgressProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'generating':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          label: 'Generating data...',
          color: 'text-primary',
        }
      case 'validating':
        return {
          icon: <FileSearch className="h-5 w-5" />,
          label: 'Validating data...',
          color: 'text-primary',
        }
      case 'retrying':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          label: `Retrying (attempt ${attempt}/${maxAttempts})...`,
          color: 'text-warning',
        }
      case 'success':
        return {
          icon: <Check className="h-5 w-5" />,
          label: 'Generation complete!',
          color: 'text-success',
        }
      case 'error':
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          label: 'Generation failed',
          color: 'text-destructive',
        }
      default:
        return {
          icon: <Sparkles className="h-5 w-5" />,
          label: 'Ready to generate',
          color: 'text-muted-foreground',
        }
    }
  }

  const display = getStatusDisplay()

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={display.color}>{display.icon}</div>
            <div>
              <p className={`font-medium ${display.color}`}>{display.label}</p>
              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}
            </div>
          </div>
          {(status === 'generating' || status === 'validating' || status === 'retrying') &&
            onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
        </div>

        {validationErrors.length > 0 && status === 'retrying' && (
          <div className="mt-3 rounded-lg bg-warning/10 p-3">
            <p className="text-sm font-medium text-warning mb-1">
              Fixing validation errors:
            </p>
            <ul className="text-xs text-warning/80 list-disc list-inside">
              {validationErrors.slice(0, 3).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {validationErrors.length > 3 && (
                <li>...and {validationErrors.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
