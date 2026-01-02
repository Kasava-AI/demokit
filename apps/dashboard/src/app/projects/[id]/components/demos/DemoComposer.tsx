'use client'

/**
 * DemoComposer Component
 *
 * A multi-step composer for creating interactive demos.
 * Users can:
 * 1. Select features to highlight
 * 2. Choose and customize a journey
 * 3. Define scenario context (persona, goal, constraints)
 * 4. Configure variant settings and generate
 *
 * This transforms raw intelligence (features, journeys) into
 * compelling demo narratives.
 */

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Boxes,
  Route,
  Users,
  Settings,
  X,
  Plus,
  Trash2,
} from 'lucide-react'

interface Feature {
  id: string
  name: string
  description: string | null
  category: string | null
  relatedModels: string[] | null
  confidence: number | null
}

interface JourneyStep {
  order: number
  action: string
  description?: string
  endpoint?: string
  model?: string
  featuresUsed?: string[]
}

interface UserJourney {
  id: string
  name: string
  description: string | null
  persona: string | null
  steps: JourneyStep[] | null
  confidence: number | null
}

interface DemoComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  features: Feature[]
  journeys: UserJourney[]
  onSubmit: (data: DemoComposerOutput) => Promise<void>
  isSubmitting?: boolean
  /** Pre-selected feature IDs (e.g., from FeaturesPreview selection) */
  initialSelectedFeatureIds?: string[]
  /** Pre-selected journey ID (e.g., from UserJourneysPreview selection) */
  initialSelectedJourneyId?: string | null
}

export interface DemoComposerOutput {
  name: string
  slug: string
  description?: string
  selectedFeatureIds: string[]
  baseJourneyId: string | null
  customSteps: JourneyStep[]
  persona: string
  goal: string
  constraints: string[]
  storyNotes?: string
  tags: string[]
  category: string
  variant: {
    name: string
    slug: string
    generationParams?: {
      recordCounts?: Record<string, number>
    }
  }
}

type Step = 'features' | 'journey' | 'scenario' | 'settings'

const STEPS: { key: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'features', label: 'Features', icon: Boxes },
  { key: 'journey', label: 'Journey', icon: Route },
  { key: 'scenario', label: 'Scenario', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings },
]

const PERSONAS = [
  { value: 'new_user', label: 'New User', description: 'First-time user discovering the app' },
  { value: 'power_user', label: 'Power User', description: 'Experienced user with advanced needs' },
  { value: 'admin', label: 'Administrator', description: 'User managing the system' },
  { value: 'team', label: 'Team Member', description: 'Part of a collaborative group' },
  { value: 'custom', label: 'Custom', description: 'Define your own persona' },
]

const CATEGORIES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'happyPath', label: 'Happy Path' },
  { value: 'edgeCase', label: 'Edge Case' },
  { value: 'demo', label: 'Demo' },
  { value: 'training', label: 'Training' },
  { value: 'sales', label: 'Sales' },
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export function DemoComposer({
  open,
  onOpenChange,
  features,
  journeys,
  onSubmit,
  isSubmitting = false,
  initialSelectedFeatureIds = [],
  initialSelectedJourneyId = null,
}: DemoComposerProps) {
  // Current step
  const [currentStep, setCurrentStep] = useState<Step>('features')

  // Step 1: Features selection (initialize with pre-selected features)
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(
    () => new Set(initialSelectedFeatureIds)
  )

  // Step 2: Journey selection and customization (initialize with pre-selected journey)
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(initialSelectedJourneyId)
  const [customSteps, setCustomSteps] = useState<JourneyStep[]>([])
  const [useCustomSteps, setUseCustomSteps] = useState(false)

  // Step 3: Scenario context
  const [persona, setPersona] = useState('new_user')
  const [customPersona, setCustomPersona] = useState('')
  const [goal, setGoal] = useState('')
  const [constraints, setConstraints] = useState<string[]>([])
  const [constraintInput, setConstraintInput] = useState('')
  const [storyNotes, setStoryNotes] = useState('')

  // Step 4: Settings
  const [demoName, setDemoName] = useState('')
  const [demoSlug, setDemoSlug] = useState('')
  const [demoDescription, setDemoDescription] = useState('')
  const [category, setCategory] = useState('demo')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [variantName, setVariantName] = useState('Default')
  const [variantSlug, setVariantSlug] = useState('default')

  // Get selected journey
  const selectedJourney = useMemo(() => {
    return journeys.find((j) => j.id === selectedJourneyId) || null
  }, [journeys, selectedJourneyId])

  // Get journey steps to display
  const displaySteps = useMemo(() => {
    if (useCustomSteps) return customSteps
    return selectedJourney?.steps || []
  }, [useCustomSteps, customSteps, selectedJourney])

  // Toggle feature selection
  const toggleFeature = (featureId: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev)
      if (next.has(featureId)) {
        next.delete(featureId)
      } else {
        next.add(featureId)
      }
      return next
    })
  }

  // Select journey and initialize custom steps
  const selectJourney = (journeyId: string | null) => {
    setSelectedJourneyId(journeyId)
    if (journeyId) {
      const journey = journeys.find((j) => j.id === journeyId)
      if (journey?.steps) {
        setCustomSteps([...journey.steps])
      }
    } else {
      setCustomSteps([])
    }
    setUseCustomSteps(false)
  }

  // Add a custom step
  const addStep = () => {
    const newStep: JourneyStep = {
      order: customSteps.length + 1,
      action: '',
      description: '',
    }
    setCustomSteps([...customSteps, newStep])
    setUseCustomSteps(true)
  }

  // Update a step
  const updateStep = (index: number, updates: Partial<JourneyStep>) => {
    setCustomSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...updates } : step))
    )
    setUseCustomSteps(true)
  }

  // Remove a step
  const removeStep = (index: number) => {
    setCustomSteps((prev) => prev.filter((_, i) => i !== index))
    setUseCustomSteps(true)
  }

  // Add constraint
  const addConstraint = () => {
    if (constraintInput.trim()) {
      setConstraints([...constraints, constraintInput.trim()])
      setConstraintInput('')
    }
  }

  // Remove constraint
  const removeConstraint = (index: number) => {
    setConstraints((prev) => prev.filter((_, i) => i !== index))
  }

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  // Remove tag
  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  // Auto-generate slug when name changes
  const handleNameChange = (name: string) => {
    setDemoName(name)
    if (!demoSlug || demoSlug === generateSlug(demoName)) {
      setDemoSlug(generateSlug(name))
    }
  }

  // Navigation
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep)
  const canGoNext = currentStepIndex < STEPS.length - 1
  const canGoPrev = currentStepIndex > 0
  const isLastStep = currentStepIndex === STEPS.length - 1

  const goNext = () => {
    if (canGoNext) {
      setCurrentStep(STEPS[currentStepIndex + 1].key)
    }
  }

  const goPrev = () => {
    if (canGoPrev) {
      setCurrentStep(STEPS[currentStepIndex - 1].key)
    }
  }

  // Validation
  const isStepValid = (step: Step): boolean => {
    switch (step) {
      case 'features':
        return true // Features are optional
      case 'journey':
        return true // Journey is optional
      case 'scenario':
        return goal.trim().length > 0
      case 'settings':
        return demoName.trim().length > 0 && demoSlug.trim().length > 0
      default:
        return true
    }
  }

  const canSubmit = isStepValid('scenario') && isStepValid('settings')

  // Submit handler
  const handleSubmit = async () => {
    if (!canSubmit) return

    const output: DemoComposerOutput = {
      name: demoName,
      slug: demoSlug,
      description: demoDescription || undefined,
      selectedFeatureIds: Array.from(selectedFeatureIds),
      baseJourneyId: selectedJourneyId,
      customSteps: useCustomSteps ? customSteps : [],
      persona: persona === 'custom' ? customPersona : persona,
      goal,
      constraints,
      storyNotes: storyNotes || undefined,
      tags,
      category,
      variant: {
        name: variantName,
        slug: variantSlug,
      },
    }

    await onSubmit(output)
  }

  // Reset on close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset all state (restore to initial values for pre-selections)
      setCurrentStep('features')
      setSelectedFeatureIds(new Set(initialSelectedFeatureIds))
      setSelectedJourneyId(initialSelectedJourneyId)
      setCustomSteps([])
      setUseCustomSteps(false)
      setPersona('new_user')
      setCustomPersona('')
      setGoal('')
      setConstraints([])
      setConstraintInput('')
      setStoryNotes('')
      setDemoName('')
      setDemoSlug('')
      setDemoDescription('')
      setCategory('demo')
      setTags([])
      setTagInput('')
      setVariantName('Default')
      setVariantSlug('default')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Demo
          </DialogTitle>
          <DialogDescription>
            Compose a compelling demo by selecting features, defining the journey, and
            setting the scenario context.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 py-2 border-b">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = step.key === currentStep
            const isPast = index < currentStepIndex
            const isValid = isStepValid(step.key)

            return (
              <button
                key={step.key}
                onClick={() => setCurrentStep(step.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isPast
                    ? 'text-muted-foreground hover:bg-muted'
                    : 'text-muted-foreground/50 hover:bg-muted'
                }`}
              >
                {isPast && isValid ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </button>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: Features */}
          {currentStep === 'features' && (
            <div className="h-full flex flex-col">
              <div className="py-4">
                <h3 className="text-sm font-medium mb-1">Select Features to Highlight</h3>
                <p className="text-xs text-muted-foreground">
                  Choose the features you want to showcase in this demo. These will guide
                  the narrative and data generation.
                </p>
              </div>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="grid grid-cols-2 gap-2 pb-4">
                  {features.map((feature) => {
                    const isSelected = selectedFeatureIds.has(feature.id)
                    return (
                      <button
                        key={feature.id}
                        onClick={() => toggleFeature(feature.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox checked={isSelected} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {feature.name}
                            </span>
                            {feature.category && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {feature.category}
                              </Badge>
                            )}
                          </div>
                          {feature.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {feature.description}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
              {selectedFeatureIds.size > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedFeatureIds.size} feature{selectedFeatureIds.size !== 1 ? 's' : ''}{' '}
                    selected
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Journey */}
          {currentStep === 'journey' && (
            <div className="h-full flex flex-col">
              <div className="py-4">
                <h3 className="text-sm font-medium mb-1">Define the User Journey</h3>
                <p className="text-xs text-muted-foreground">
                  Start from a detected journey or build your own sequence of steps.
                </p>
              </div>

              <Tabs defaultValue="select" className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start mb-4">
                  <TabsTrigger value="select">Select Journey</TabsTrigger>
                  <TabsTrigger value="customize">Customize Steps</TabsTrigger>
                </TabsList>

                <TabsContent value="select" className="flex-1 overflow-auto mt-0">
                  <div className="space-y-2">
                    <button
                      onClick={() => selectJourney(null)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        !selectedJourneyId
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="p-2 rounded-md bg-muted">
                        <Route className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">Start from scratch</span>
                        <p className="text-xs text-muted-foreground">
                          Build a custom journey with your own steps
                        </p>
                      </div>
                    </button>
                    {journeys.map((journey) => (
                      <button
                        key={journey.id}
                        onClick={() => selectJourney(journey.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                          selectedJourneyId === journey.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="p-2 rounded-md bg-primary/10">
                          <Route className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{journey.name}</span>
                            {journey.persona && (
                              <Badge variant="outline" className="text-xs">
                                {journey.persona}
                              </Badge>
                            )}
                          </div>
                          {journey.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {journey.description}
                            </p>
                          )}
                          {journey.steps && journey.steps.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              {journey.steps.slice(0, 3).map((step, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <span className="truncate max-w-[60px]">
                                    {step.action.split(' ').slice(0, 2).join(' ')}
                                  </span>
                                  {i < Math.min(2, journey.steps!.length - 1) && (
                                    <ArrowRight className="h-3 w-3 shrink-0" />
                                  )}
                                </span>
                              ))}
                              {journey.steps.length > 3 && (
                                <span>+{journey.steps.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="customize" className="flex-1 overflow-auto mt-0">
                  <div className="space-y-2">
                    {displaySteps.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Action (e.g., 'Browse products')"
                            value={step.action}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateStep(index, { action: e.target.value })}
                            className="h-8 text-sm"
                          />
                          <Input
                            placeholder="Description (optional)"
                            value={step.description || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateStep(index, { description: e.target.value })
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={addStep}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Step 3: Scenario */}
          {currentStep === 'scenario' && (
            <ScrollArea className="h-full -mx-6 px-6">
              <div className="py-4 space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-1">Define the Scenario Context</h3>
                  <p className="text-xs text-muted-foreground">
                    Set up the story context that will guide the demo narrative.
                  </p>
                </div>

                {/* Persona */}
                <div className="space-y-2">
                  <Label>Persona</Label>
                  <Select value={persona} onValueChange={setPersona}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONAS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div>
                            <span className="font-medium">{p.label}</span>
                            <span className="text-muted-foreground ml-2">
                              — {p.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {persona === 'custom' && (
                    <Input
                      placeholder="Describe your custom persona"
                      value={customPersona}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomPersona(e.target.value)}
                    />
                  )}
                </div>

                {/* Goal */}
                <div className="space-y-2">
                  <Label>Goal *</Label>
                  <Textarea
                    placeholder="What is the user trying to accomplish? (e.g., 'Purchase a gift for their mother's birthday')"
                    value={goal}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoal(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Constraints */}
                <div className="space-y-2">
                  <Label>Constraints</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a constraint (e.g., 'Budget-conscious')"
                      value={constraintInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConstraintInput(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addConstraint()
                        }
                      }}
                    />
                    <Button variant="outline" size="icon" onClick={addConstraint}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {constraints.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {constraints.map((constraint, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {constraint}
                          <button
                            onClick={() => removeConstraint(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Story Notes */}
                <div className="space-y-2">
                  <Label>Story Notes (optional)</Label>
                  <Textarea
                    placeholder="Additional context or details for the narrative..."
                    value={storyNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStoryNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Step 4: Settings */}
          {currentStep === 'settings' && (
            <ScrollArea className="h-full -mx-6 px-6">
              <div className="py-4 space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-1">Demo Settings</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure the demo name, category, and initial variant.
                  </p>
                </div>

                {/* Demo Identity */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Demo Name *</Label>
                    <Input
                      placeholder="e.g., 'Gift Purchase Journey'"
                      value={demoName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input
                      placeholder="e.g., 'gift-purchase-journey'"
                      value={demoSlug}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDemoSlug(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used in SDK: <code>demo.load('{demoSlug || 'your-slug'}')</code>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief description of this demo..."
                      value={demoDescription}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDemoDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <Separator />

                {/* Organization */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag"
                        value={tagInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addTag()
                          }
                        }}
                      />
                      <Button variant="outline" size="icon" onClick={addTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Initial Variant */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">Initial Variant</h4>
                    <p className="text-xs text-muted-foreground">
                      Each demo can have multiple variants (e.g., "Holiday", "Enterprise").
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Variant Name</Label>
                      <Input
                        placeholder="e.g., 'Default'"
                        value={variantName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariantName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Variant Slug</Label>
                      <Input
                        placeholder="e.g., 'default'"
                        value={variantSlug}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariantSlug(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <div>
            {canGoPrev && (
              <Button variant="ghost" onClick={goPrev} disabled={isSubmitting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            {isLastStep ? (
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Demo'}
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={goNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
