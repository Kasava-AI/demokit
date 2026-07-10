'use client'

/**
 * NewProjectPage — three-step project creation
 *
 * 1. connect  — point DemoKit at the app (OpenAPI spec and/or website URL)
 * 2. confirm  — confirm the derived name/description while intelligence
 *               analysis streams in the background; optionally add context
 * 3. generate — pick narrative templates (selection is honored) and generate
 *               relationship-valid demo data immediately, in the wizard
 *
 * The completion screen ends on the value moment: the generated fixtures and
 * a quick start personalized from the user's real schema.
 */

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useStreamIntelligence } from '@/hooks/use-stream-intelligence'
import { useCurrentOrganization } from '@/contexts/organization-context'

import {
  type WizardStep,
  type ProjectData,
  type WizardResult,
  getStepIndex,
  STEP_ORDER,
  ConnectStep,
  ConfirmStep,
  GenerateStep,
  CompleteStep,
  StepIndicator,
  useWizardPipeline,
} from './components'

const initialData: ProjectData = {
  name: '',
  nameEdited: false,
  description: '',
  descriptionEdited: false,
  sources: {},
  selectedTemplateIds: [],
}

export default function NewProjectPage() {
  const [step, setStep] = useState<WizardStep>('connect')
  const [data, setData] = useState<ProjectData>(initialData)
  const [result, setResult] = useState<WizardResult | null>(null)
  const [orgError, setOrgError] = useState<string | null>(null)
  // Fingerprint of the last analysis run so revisiting a step with unchanged
  // inputs never restarts (and never discards) a completed analysis
  const lastAnalysisKeyRef = useRef<string | null>(null)

  const { currentOrg } = useCurrentOrganization()
  const pipeline = useWizardPipeline()

  const handleUpdate = useCallback((updates: Partial<ProjectData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Analysis streams at page level so it keeps running across steps
  const stream = useStreamIntelligence({
    onComplete: (intelligence) => {
      setData((prev) => ({
        ...prev,
        intelligence,
        // Derived identity only fills fields the user hasn't touched
        name: prev.nameEdited || !intelligence.appName ? prev.name : intelligence.appName,
        description:
          prev.descriptionEdited || !intelligence.appDescription
            ? prev.description
            : intelligence.appDescription,
        // Preselect the most relevant scenarios — user can still toggle
        selectedTemplateIds: [...intelligence.templates]
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3)
          .map((t) => t.id),
      }))
    },
  })

  const analysisInputOf = useCallback(
    (d: ProjectData) => ({
      schemaContent: d.schemaContent,
      websiteUrl: d.sources.websiteUrl?.trim() || undefined,
      readmeContent: d.sources.readmeContent || undefined,
      documentationUrls: d.sources.documentationUrls?.map((u) => u.trim()).filter(Boolean),
    }),
    []
  )

  const startAnalysis = useCallback(() => {
    if (!data.schemaContent) return
    const input = analysisInputOf(data)
    lastAnalysisKeyRef.current = JSON.stringify(input)
    setData((prev) => ({ ...prev, intelligence: undefined, selectedTemplateIds: [] }))
    void stream.start(input)
  }, [data, analysisInputOf, stream])

  // Leaving the connect step: derive identity from the parsed spec right away
  // and kick off analysis in the background if the inputs changed
  const handleConnectContinue = useCallback(() => {
    setData((prev) => {
      const info = prev.schema?.info
      return {
        ...prev,
        name: !prev.nameEdited && info?.title ? info.title : prev.name,
        description:
          !prev.descriptionEdited && info?.description ? info.description : prev.description,
      }
    })
    if (data.schemaContent) {
      const key = JSON.stringify(analysisInputOf(data))
      if (key !== lastAnalysisKeyRef.current) {
        startAnalysis()
      }
    }
    setStep('confirm')
  }, [data, analysisInputOf, startAnalysis])

  const goNext = useCallback(() => {
    const currentIndex = getStepIndex(step)
    if (currentIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIndex + 1])
    }
  }, [step])

  const goBack = useCallback(() => {
    const currentIndex = getStepIndex(step)
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1])
    }
  }, [step])

  const handleCreate = useCallback(async () => {
    setOrgError(null)
    if (!currentOrg) {
      setOrgError('No organization selected. Pick an organization before creating a project.')
      return
    }
    const res = await pipeline.run(data, currentOrg.id)
    if (res) {
      setResult(res)
      setStep('complete')
    }
  }, [currentOrg, data, pipeline])

  const analysis = {
    isStreaming: stream.isStreaming,
    progress: stream.progress,
    message: stream.message,
    error: stream.error,
  }

  const pipelineView = {
    phase: pipeline.phase,
    generatingTemplate: pipeline.generatingTemplate,
    generatingIndex: pipeline.generatingIndex,
    totalToGenerate: pipeline.totalToGenerate,
    error: pipeline.error ?? orgError,
    isRunning: pipeline.isRunning,
  }

  const stepProps = {
    data,
    onUpdate: handleUpdate,
    onNext: goNext,
    onBack: goBack,
  }

  return (
    <AppLayout title="New project" defaultSidebarCollapsed={true}>
      <div className="px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card className="rounded-2xl p-8 sm:p-10">
            {/* Header: back chevron + progress dots (hidden on completion) */}
            {step !== 'complete' && (
              <div className="mb-8 flex items-center justify-between">
                {step === 'connect' ? (
                  <Link href="/projects">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to projects">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goBack}
                    disabled={pipeline.isRunning}
                    aria-label="Previous step"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <StepIndicator currentStep={step} />
                <div className="w-8" aria-hidden />
              </div>
            )}

            {step === 'connect' && <ConnectStep {...stepProps} onNext={handleConnectContinue} />}
            {step === 'confirm' && (
              <ConfirmStep {...stepProps} analysis={analysis} onRerunAnalysis={startAnalysis} />
            )}
            {step === 'generate' && (
              <GenerateStep
                {...stepProps}
                analysis={analysis}
                pipeline={pipelineView}
                onCreate={handleCreate}
              />
            )}
            {step === 'complete' && <CompleteStep data={data} result={result} />}
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
