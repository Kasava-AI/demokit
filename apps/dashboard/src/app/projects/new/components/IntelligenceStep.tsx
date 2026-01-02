'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Sparkles, AlertCircle } from 'lucide-react'
import { IntelligenceProgress as IntelligenceProgressDisplay } from '@/components/intelligence/IntelligenceProgress'
import { useStreamIntelligence } from '@/hooks/use-stream-intelligence'
import type { IntelligenceProgress } from '@intelligence'
import type { StepProps } from './types'

export function IntelligenceStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const {
    status,
    phase,
    progress,
    message,
    error,
    isStreaming,
    start,
    cancel,
  } = useStreamIntelligence({
    onComplete: (intelligence) => {
      onUpdate({ intelligence })
      // Auto-advance after a short delay
      setTimeout(onNext, 500)
    },
  })

  const runIntelligence = useCallback(async () => {
    if (!data.schemaContent) {
      return
    }

    await start({
      schemaContent: data.schemaContent,
      websiteUrl: data.sources.websiteUrl || undefined,
      readmeContent: data.sources.readmeContent || undefined,
      documentationUrls: data.sources.documentationUrls || undefined,
    })
  }, [data.schemaContent, data.sources, start])

  const progressData: IntelligenceProgress = {
    phase,
    progress,
    message: message || `Processing ${phase.replace(/_/g, ' ')}...`,
  }

  // If we already have intelligence, show it and allow continue
  if (data.intelligence && !isStreaming) {
    return (
      <div className="space-y-6">
        <div>
          <CardTitle className="text-xl">AI Intelligence Complete</CardTitle>
          <CardDescription className="mt-1">
            Analysis has been completed for your application
          </CardDescription>
        </div>

        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-success mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">Intelligence gathered successfully</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold">{data.intelligence.features.length}</div>
                <div className="text-muted-foreground">Features detected</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.intelligence.journeys.length}</div>
                <div className="text-muted-foreground">User journeys</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.intelligence.templates.length}</div>
                <div className="text-muted-foreground">Templates generated</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={runIntelligence}>
              <Sparkles className="mr-2 h-4 w-4" />
              Re-run Analysis
            </Button>
            <Button onClick={onNext}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-xl">AI Intelligence Gathering</CardTitle>
        <CardDescription className="mt-1">
          Analyzing your schema and sources to understand your application
        </CardDescription>
      </div>

      {!isStreaming && status !== 'complete' && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
            <p className="text-sm text-muted-foreground mb-6">
              We&apos;ll analyze your schema{data.sources.websiteUrl ? ', website' : ''}
              {data.sources.readmeContent ? ', and documentation' : ''} to understand your application.
            </p>
            <Button onClick={runIntelligence} size="lg" disabled={!data.schemaContent}>
              <Sparkles className="mr-2 h-4 w-4" />
              Start Analysis
            </Button>
            {!data.schemaContent && (
              <p className="text-sm text-warning mt-2">
                Please upload an API schema first
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isStreaming && (
        <div className="space-y-4">
          <IntelligenceProgressDisplay progress={progressData} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Intelligence gathering failed
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  {error}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={runIntelligence}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isStreaming}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {status === 'complete' && (
          <Button onClick={onNext}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
