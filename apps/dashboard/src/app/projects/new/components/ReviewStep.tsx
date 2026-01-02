'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { FeatureList } from '@/components/intelligence/FeatureList'
import { JourneyList } from '@/components/intelligence/JourneyList'
import { DynamicTemplateGrid } from '@/components/intelligence/DynamicTemplateGrid'
import type { DynamicNarrativeTemplate } from '@intelligence'
import type { StepProps } from './types'

interface ReviewStepProps extends StepProps {
  isCreating: boolean
  createError: string | null
}

export function ReviewStep({ data, onUpdate, onNext, onBack, isCreating, createError }: ReviewStepProps) {
  const [activeTab, setActiveTab] = useState<'features' | 'journeys' | 'templates'>('templates')

  const handleTemplateSelect = useCallback(
    (template: DynamicNarrativeTemplate) => {
      const newSelection = data.selectedTemplates.includes(template.id)
        ? data.selectedTemplates.filter((id) => id !== template.id)
        : [...data.selectedTemplates, template.id]
      onUpdate({ selectedTemplates: newSelection })
    },
    [data.selectedTemplates, onUpdate]
  )

  const handleFeatureToggle = useCallback(
    (featureId: string, selected: boolean) => {
      const newSelection = selected
        ? [...data.selectedFeatures, featureId]
        : data.selectedFeatures.filter((id) => id !== featureId)
      onUpdate({ selectedFeatures: newSelection })
    },
    [data.selectedFeatures, onUpdate]
  )

  if (!data.intelligence) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No intelligence data available.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-xl">Review & Select</CardTitle>
        <CardDescription className="mt-1">
          Review the detected features and select templates for your demo data
        </CardDescription>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('templates')}
        >
          Templates
          <Badge variant="outline" className="ml-2">
            {data.intelligence.templates.length}
          </Badge>
        </Button>
        <Button
          variant={activeTab === 'features' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('features')}
        >
          Features
          <Badge variant="outline" className="ml-2">
            {data.intelligence.features.length}
          </Badge>
        </Button>
        <Button
          variant={activeTab === 'journeys' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('journeys')}
        >
          Journeys
          <Badge variant="outline" className="ml-2">
            {data.intelligence.journeys.length}
          </Badge>
        </Button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'templates' && (
          <DynamicTemplateGrid
            templates={data.intelligence.templates}
            selectedTemplateIds={data.selectedTemplates}
            onSelect={handleTemplateSelect}
          />
        )}
        {activeTab === 'features' && (
          <FeatureList
            features={data.intelligence.features}
            selectedFeatures={data.selectedFeatures}
            onFeatureToggle={handleFeatureToggle}
          />
        )}
        {activeTab === 'journeys' && (
          <JourneyList journeys={data.intelligence.journeys} />
        )}
      </div>

      {createError && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-destructive">
            {createError}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isCreating}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={isCreating}>
          {isCreating ? (
            <>
              <Sparkles className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
