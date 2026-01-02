'use client'

/**
 * NewProjectPage - Multi-step project creation with AI intelligence flow
 *
 * Steps:
 * 1. Project basics (name, description)
 * 2. OpenAPI spec upload
 * 3. Additional sources (website, help center, README)
 * 4. Intelligence gathering (with progress)
 * 5. Review features & templates
 * 6. Generate data & complete
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useCreateProject } from '@/hooks/use-projects'
import { useSaveIntelligence } from '@/hooks/use-intelligence'
import type { FeatureCategory } from '@intelligence'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import {
  type WizardStep,
  type ProjectData,
  type StepProps,
  STEP_ORDER,
  getStepIndex,
  generateProjectKey,
  BasicsStep,
  SpecStep,
  SourcesStep,
  IntelligenceStep,
  ReviewStep,
  CompleteStep,
  StepIndicator,
} from './components'

export default function NewProjectPage() {
  const [step, setStep] = useState<WizardStep>('basics')
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [data, setData] = useState<ProjectData>({
    name: '',
    description: '',
    projectKey: generateProjectKey(),
    sources: {},
    selectedTemplates: [],
    selectedFeatures: [],
  })

  const createProjectMutation = useCreateProject()
  const saveIntelligenceMutation = useSaveIntelligence()

  const handleUpdate = useCallback((updates: Partial<ProjectData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

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

  // Handle project creation when moving from review to complete
  const handleCreateProject = useCallback(async () => {
    setCreateError(null)

    try {
      // Create the project with schema if available
      const project = await createProjectMutation.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        schema: data.schema as Record<string, unknown> | undefined,
      })

      setCreatedProjectId(project.id)

      // Save intelligence data if available
      if (data.intelligence && project.id) {
        try {
          // Transform AppIntelligence to SaveIntelligenceInput format
          const intelligenceData = {
            appIdentity: {
              name: data.intelligence.appName,
              description: data.intelligence.appDescription,
              domain: data.intelligence.domain,
              confidence: data.intelligence.overallConfidence,
            },
            features: data.intelligence.features.map((f) => ({
              name: f.name,
              description: f.description,
              category: f.category as FeatureCategory | undefined,
              relatedModels: f.relatedModels,
              confidence: f.confidence,
            })),
            journeys: data.intelligence.journeys.map((j) => ({
              name: j.name,
              description: j.description,
              persona: j.persona,
              steps: j.steps?.map((s, idx) => ({
                order: s.order ?? idx + 1,
                action: s.action,
                description: s.outcome,
              })),
              relatedFeatures: j.featuresUsed,
              confidence: j.confidence,
            })),
            templates: data.intelligence.templates.map((t) => {
              // Map intelligence categories to DB-compatible categories
              const dbCategories = ['demo', 'happyPath', 'edgeCase', 'onboarding', 'migration'] as const
              type DbCategory = typeof dbCategories[number]
              const category: DbCategory = dbCategories.includes(t.category as DbCategory)
                ? (t.category as DbCategory)
                : 'demo'
              return {
                name: t.name,
                description: t.description,
                category,
                narrative: t.narrative,
                instructions: {
                  recordCounts: t.suggestedCounts,
                },
                relevanceScore: t.relevanceScore,
                isDefault: true,
              }
            }),
          }

          await saveIntelligenceMutation.mutateAsync({
            projectId: project.id,
            data: intelligenceData,
          })
        } catch (intellErr) {
          // Log but don't fail - project is already created
          console.error('Failed to save intelligence:', intellErr)
        }
      }

      // Move to complete step
      setStep('complete')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }, [data, createProjectMutation, saveIntelligenceMutation])

  const stepProps: StepProps = {
    data,
    onUpdate: handleUpdate,
    onNext: goNext,
    onBack: goBack,
  }

  // Back button for AppLayout
  const backButton = step === 'basics' ? (
    <Link href="/projects">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  ) : undefined

  return (
    <AppLayout
      backButton={backButton}
      title="New Project"
      defaultSidebarCollapsed={true}
    >
      <div className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Step Indicator */}
          {step !== 'complete' && <StepIndicator currentStep={step} />}

          {/* Step Content */}
          <Card className="p-6">
            {step === 'basics' && <BasicsStep {...stepProps} />}
            {step === 'spec' && <SpecStep {...stepProps} />}
            {step === 'sources' && <SourcesStep {...stepProps} />}
            {step === 'intelligence' && <IntelligenceStep {...stepProps} />}
            {step === 'review' && (
              <ReviewStep
                {...stepProps}
                onNext={handleCreateProject}
                isCreating={createProjectMutation.isPending || saveIntelligenceMutation.isPending}
                createError={createError}
              />
            )}
            {step === 'complete' && <CompleteStep data={data} createdProjectId={createdProjectId} />}
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
