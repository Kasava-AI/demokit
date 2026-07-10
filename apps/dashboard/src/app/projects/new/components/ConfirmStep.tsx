'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ArrowRight,
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import { Stagger, FadeIn } from '@/components/ui/motion'
import type { StepProps } from './types'

export interface AnalysisStatus {
  isStreaming: boolean
  progress: number
  message: string
  error: string | null
}

interface ConfirmStepProps extends StepProps {
  analysis: AnalysisStatus
  onRerunAnalysis: () => void
}

/**
 * Step 2 — confirm the derived identity while analysis runs in the
 * background. Name and description are pre-filled from the spec/analysis
 * and stop being overwritten the moment the user edits them.
 */
export function ConfirmStep({
  data,
  onUpdate,
  onNext,
  analysis,
  onRerunAnalysis,
}: ConfirmStepProps) {
  const [showContext, setShowContext] = React.useState(false)
  const intelligence = data.intelligence
  const canProceed = data.name.trim().length > 0
  const wasDerived = !data.nameEdited && data.name.length > 0

  const docUrls = data.sources.documentationUrls || []
  const updateSources = (updates: Partial<typeof data.sources>) =>
    onUpdate({ sources: { ...data.sources, ...updates } })

  return (
    <Stagger className="space-y-8">
      <FadeIn>
        <h1 className="font-display-serif text-3xl tracking-tight">
          {intelligence ? 'Here’s what we found' : 'Confirm your project'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {analysis.isStreaming
            ? 'We’re reading your app in the background — check the details below while we work.'
            : intelligence
              ? 'We filled these in from your spec. Adjust anything that looks off.'
              : 'Give your project a name — everything else can come later.'}
        </p>
      </FadeIn>

      {/* Identity — pre-filled, editable */}
      <FadeIn>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="name">Project name</Label>
              {wasDerived && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wand2 className="size-3" />
                  detected for you
                </span>
              )}
            </div>
            <Input
              id="name"
              value={data.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate({ name: e.target.value, nameEdited: true })
              }
              placeholder="My SaaS App"
              autoFocus={!data.name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onUpdate({ description: e.target.value, descriptionEdited: true })
              }
              placeholder="What does your app do?"
              rows={2}
            />
          </div>
        </div>
      </FadeIn>

      {/* Analysis status */}
      <FadeIn>
        {analysis.isStreaming && (
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Analyzing your app</p>
                <p className="truncate text-xs text-muted-foreground">
                  {analysis.message || 'Reading schema…'}
                </p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(analysis.progress)}%
              </span>
            </div>
            <Progress value={analysis.progress} className="mt-3 h-1.5" />
          </div>
        )}

        {!analysis.isStreaming && intelligence && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <Check className="size-4" />
              Analysis complete
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Layers, tile: 'bg-sky-500', count: intelligence.features.length, label: 'Features' },
                { icon: Route, tile: 'bg-emerald-500', count: intelligence.journeys.length, label: 'Journeys' },
                { icon: Sparkles, tile: 'bg-amber-500', count: intelligence.templates.length, label: 'Demo scenarios' },
              ].map((stat, i) => (
                <FadeIn key={stat.label} delay={i * 0.06}>
                  <div className="rounded-xl border p-4">
                    <div className={`mb-3 flex size-9 items-center justify-center rounded-lg ${stat.tile}`}>
                      <stat.icon className="size-4.5 text-white" />
                    </div>
                    <div className="text-2xl font-semibold tabular-nums">{stat.count}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        )}

        {!analysis.isStreaming && !intelligence && analysis.error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Analysis failed</p>
                <p className="mt-1 text-sm text-destructive/80">{analysis.error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={onRerunAnalysis}>
                  <RefreshCw className="mr-2 size-3.5" />
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {!analysis.isStreaming && !intelligence && !analysis.error && !data.schema && (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No API spec added — analysis and instant demo data are skipped. You can
            add a spec any time from the project page.
          </p>
        )}
      </FadeIn>

      {/* Optional enrichment while analysis runs */}
      {data.schema && (
        <FadeIn>
          <Collapsible open={showContext} onOpenChange={setShowContext}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Add more context for better results
                </span>
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${showContext ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="readme">README</Label>
                <Textarea
                  id="readme"
                  placeholder="Paste your README.md content…"
                  value={data.sources.readmeContent || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    updateSources({ readmeContent: e.target.value || undefined })
                  }
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Documentation URLs
                </Label>
                {docUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://docs.yourapp.com/guide"
                      value={url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const next = [...docUrls]
                        next[index] = e.target.value
                        updateSources({ documentationUrls: next })
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const next = docUrls.filter((_, i) => i !== index)
                        updateSources({ documentationUrls: next.length ? next : undefined })
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSources({ documentationUrls: [...docUrls, ''] })}
                >
                  <Plus className="mr-2 size-4" />
                  Add URL
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onRerunAnalysis}
                disabled={analysis.isStreaming}
              >
                <RefreshCw className="mr-2 size-3.5" />
                {analysis.isStreaming ? 'Analysis running…' : 'Re-run analysis with this context'}
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </FadeIn>
      )}

      <FadeIn>
        <div className="flex items-center justify-end border-t pt-5">
          <Button onClick={onNext} disabled={!canProceed}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </FadeIn>
    </Stagger>
  )
}
