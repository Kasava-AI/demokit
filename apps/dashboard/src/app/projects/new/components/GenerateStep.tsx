'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  GitCompare,
  GraduationCap,
  LifeBuoy,
  Loader2,
  MonitorPlay,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import type { DynamicNarrativeTemplate } from '@intelligence'
import { Stagger, FadeIn } from '@/components/ui/motion'
import type { AnalysisStatus } from './ConfirmStep'
import type { PipelineState } from './use-wizard-pipeline'
import type { StepProps } from './types'

const CATEGORY_STYLES: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tile: string }
> = {
  onboarding: { icon: UserPlus, tile: 'bg-sky-500' },
  happyPath: { icon: CheckCircle2, tile: 'bg-emerald-500' },
  edgeCase: { icon: AlertTriangle, tile: 'bg-amber-500' },
  recovery: { icon: LifeBuoy, tile: 'bg-rose-500' },
  growth: { icon: TrendingUp, tile: 'bg-violet-500' },
  decline: { icon: TrendingDown, tile: 'bg-slate-500' },
  comparison: { icon: GitCompare, tile: 'bg-cyan-500' },
  demo: { icon: MonitorPlay, tile: 'bg-indigo-500' },
  training: { icon: GraduationCap, tile: 'bg-teal-500' },
  migration: { icon: ArrowRightLeft, tile: 'bg-orange-500' },
}

const DEFAULT_STYLE = { icon: Sparkles, tile: 'bg-primary' }

function recordEstimate(template: DynamicNarrativeTemplate): number {
  return Object.values(template.suggestedCounts || {}).reduce((sum, n) => sum + n, 0)
}

interface GenerateStepProps extends Omit<StepProps, 'onNext'> {
  analysis: AnalysisStatus
  pipeline: PipelineState & { isRunning: boolean }
  /** Creates the project, saves intelligence, generates selected fixtures */
  onCreate: () => void
}

/**
 * Step 3 — pick which demo scenarios to keep, then create everything in one
 * go. Selection is honored: kept templates become project defaults and each
 * one gets relationship-valid data generated locally, instantly.
 */
export function GenerateStep({
  data,
  onUpdate,
  analysis,
  pipeline,
  onCreate,
}: GenerateStepProps) {
  const templates = data.intelligence
    ? [...data.intelligence.templates].sort((a, b) => b.relevanceScore - a.relevanceScore)
    : []
  const selectedCount = data.selectedTemplateIds.length

  const toggleTemplate = useCallback(
    (templateId: string, selected: boolean) => {
      onUpdate({
        selectedTemplateIds: selected
          ? [...data.selectedTemplateIds, templateId]
          : data.selectedTemplateIds.filter((id) => id !== templateId),
      })
    },
    [data.selectedTemplateIds, onUpdate]
  )

  const ctaLabel =
    selectedCount > 0
      ? `Create project & generate data`
      : 'Create project'

  const pipelineLabel =
    pipeline.phase === 'creating'
      ? 'Creating project…'
      : pipeline.phase === 'saving'
        ? 'Saving analysis…'
        : pipeline.phase === 'generating'
          ? `Generating “${pipeline.generatingTemplate}” (${pipeline.generatingIndex}/${pipeline.totalToGenerate})…`
          : 'Working…'

  return (
    <Stagger className="space-y-8">
      <FadeIn>
        <h1 className="font-display-serif text-3xl tracking-tight">
          Choose your demo scenarios
        </h1>
        <p className="mt-2 text-muted-foreground">
          {templates.length > 0
            ? 'Each scenario you keep gets realistic, relationship-valid data generated right now — free and instant. You can refine with AI narratives later.'
            : analysis.isStreaming
              ? 'Scenarios will appear here as soon as the analysis finishes.'
              : 'Create your project now — you can add a spec and generate data from the project page.'}
        </p>
      </FadeIn>

      {analysis.isStreaming && (
        <FadeIn>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Still analyzing your app</p>
                <p className="truncate text-xs text-muted-foreground">
                  {analysis.message || 'Almost there…'}
                </p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(analysis.progress)}%
              </span>
            </div>
            <Progress value={analysis.progress} className="mt-3 h-1.5" />
          </div>
        </FadeIn>
      )}

      {templates.length > 0 && (
        <div className="space-y-3">
          {templates.map((template, i) => {
            const style = CATEGORY_STYLES[template.category] || DEFAULT_STYLE
            const selected = data.selectedTemplateIds.includes(template.id)
            const estimate = recordEstimate(template)
            return (
              <FadeIn key={template.id} delay={Math.min(i * 0.05, 0.3)}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors duration-150 ${
                    selected ? 'border-primary/40 bg-primary/[0.03]' : 'hover:bg-muted/50'
                  } ${pipeline.isRunning ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${style.tile}`}
                  >
                    <style.icon className="size-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{template.name}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {Math.round(template.relevanceScore * 100)}% match
                      </Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    {estimate > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        ≈ {estimate} records across {Object.keys(template.suggestedCounts).length}{' '}
                        models
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={selected}
                    onCheckedChange={(checked: boolean) => toggleTemplate(template.id, checked)}
                    disabled={pipeline.isRunning}
                    aria-label={`Include ${template.name}`}
                  />
                </label>
              </FadeIn>
            )
          })}
          <p className="text-xs text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} scenario${selectedCount === 1 ? '' : 's'} selected — the first becomes your active fixture.`
              : 'Nothing selected — the project is created without demo data.'}
          </p>
        </div>
      )}

      {pipeline.error && (
        <FadeIn>
          <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{pipeline.error}</p>
          </div>
        </FadeIn>
      )}

      <FadeIn>
        <div className="flex items-center justify-end border-t pt-5">
          <Button onClick={onCreate} disabled={pipeline.isRunning}>
            {pipeline.isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {pipelineLabel}
              </>
            ) : (
              <>
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </FadeIn>
    </Stagger>
  )
}
