/**
 * NarrativeEditor Component
 *
 * A form for creating and editing demo narratives with optional template selection.
 * Uses shadcn/ui components for consistent styling.
 *
 * Design principles applied:
 * - Progressive disclosure: Template picker shows 3-4 templates, "View all" for more
 * - Single primary action: Generate button is the main CTA
 * - Subtle visual weight: Light backgrounds for selected states
 */

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/tabs'
import { Zap } from 'lucide-react'

import {
  type NarrativeEditorProps,
  type DemoNarrative,
  type Character,
  type TimelineEvent,
  type MetricTarget,
  TemplatePicker,
  SimpleNarrativeForm,
  AdvancedNarrativeForm,
} from './components'

export function NarrativeEditor({
  value,
  onChange,
  onGenerate,
  disabled = false,
  templates,
  selectedTemplate,
  onTemplateSelect,
}: NarrativeEditorProps) {
  const [activeTab, setActiveTab] = useState('simple')
  const [scenario, setScenario] = useState(value?.scenario || '')
  const [keyPoints, setKeyPoints] = useState<string[]>(value?.keyPoints || [''])
  const [characters, setCharacters] = useState<Character[]>(value?.characters || [])
  const [timeline, setTimeline] = useState<TimelineEvent[]>(value?.timeline || [])
  const [metrics, setMetrics] = useState<MetricTarget[]>(value?.metrics || [])

  // Sync internal state when value prop changes (e.g., from template selection)
  useEffect(() => {
    if (value) {
      setScenario(value.scenario || '')
      setKeyPoints(value.keyPoints?.length ? value.keyPoints : [''])
      setCharacters(value.characters || [])
      setTimeline(value.timeline || [])
      setMetrics(value.metrics || [])
    }
  }, [value])

  const buildNarrative = useCallback((): DemoNarrative => {
    return {
      scenario,
      keyPoints: keyPoints.filter((p) => p.trim() !== ''),
      characters: characters.length > 0 ? characters : undefined,
      timeline: timeline.length > 0 ? timeline : undefined,
      metrics: metrics.length > 0 ? metrics : undefined,
    }
  }, [scenario, keyPoints, characters, timeline, metrics])

  const handleScenarioChange = (value: string) => {
    setScenario(value)
    onChange?.(buildNarrative())
  }

  const handleKeyPointChange = (index: number, value: string) => {
    const newPoints = [...keyPoints]
    newPoints[index] = value
    setKeyPoints(newPoints)
    onChange?.(buildNarrative())
  }

  const addKeyPoint = () => setKeyPoints([...keyPoints, ''])

  const removeKeyPoint = (index: number) => {
    const newPoints = keyPoints.filter((_, i) => i !== index)
    setKeyPoints(newPoints.length > 0 ? newPoints : [''])
    onChange?.(buildNarrative())
  }

  const handleGenerate = () => onGenerate?.(buildNarrative())

  const handleTemplateClick = (template: typeof selectedTemplate) => {
    if (!template) return
    // Populate narrative from template
    setScenario(template.narrative.scenario)
    setKeyPoints(template.narrative.keyPoints.length > 0 ? template.narrative.keyPoints : [''])

    // Notify parent
    onTemplateSelect?.(template)
    onChange?.({
      scenario: template.narrative.scenario,
      keyPoints: template.narrative.keyPoints,
    })
  }

  const handleClearTemplate = () => {
    onTemplateSelect?.(undefined)
  }

  // Character handlers
  const addCharacter = () => setCharacters([...characters, { name: '', role: '' }])
  const updateCharacter = (index: number, field: keyof Character, value: string) => {
    const newChars = [...characters]
    newChars[index] = { ...newChars[index], [field]: value }
    setCharacters(newChars)
    onChange?.(buildNarrative())
  }
  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index))
    onChange?.(buildNarrative())
  }

  // Timeline handlers
  const addTimelineEvent = () => setTimeline([...timeline, { when: '', event: '' }])
  const updateTimelineEvent = (index: number, field: keyof TimelineEvent, value: string | string[]) => {
    const newTimeline = [...timeline]
    newTimeline[index] = { ...newTimeline[index], [field]: value }
    setTimeline(newTimeline)
    onChange?.(buildNarrative())
  }
  const removeTimelineEvent = (index: number) => {
    setTimeline(timeline.filter((_, i) => i !== index))
    onChange?.(buildNarrative())
  }

  // Metric handlers
  const addMetric = () => setMetrics([...metrics, { name: '' }])
  const updateMetric = (index: number, field: keyof MetricTarget, value: string) => {
    const newMetrics = [...metrics]
    newMetrics[index] = { ...newMetrics[index], [field]: value }
    setMetrics(newMetrics)
    onChange?.(buildNarrative())
  }
  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index))
    onChange?.(buildNarrative())
  }

  return (
    <div className="space-y-6">
      {/* Template Picker Section - Progressive Disclosure */}
      {templates && templates.length > 0 && (
        <TemplatePicker
          templates={templates}
          selectedTemplate={selectedTemplate}
          disabled={disabled}
          onTemplateClick={handleTemplateClick}
          onClearTemplate={handleClearTemplate}
        />
      )}

      <Tabs defaultValue="simple" className="w-full" onValueChange={(v) => setActiveTab(v)}>
        <AnimatedTabsList variant="underline" layoutId="narrative-editor-tabs">
          <AnimatedTabsTrigger variant="underline" value="simple" isActive={activeTab === 'simple'} layoutId="narrative-editor-indicator">Simple</AnimatedTabsTrigger>
          <AnimatedTabsTrigger variant="underline" value="advanced" isActive={activeTab === 'advanced'} layoutId="narrative-editor-indicator">Advanced</AnimatedTabsTrigger>
        </AnimatedTabsList>

        <TabsContent value="simple" className="mt-6">
          <SimpleNarrativeForm
            scenario={scenario}
            keyPoints={keyPoints}
            disabled={disabled}
            onScenarioChange={handleScenarioChange}
            onKeyPointChange={handleKeyPointChange}
            onAddKeyPoint={addKeyPoint}
            onRemoveKeyPoint={removeKeyPoint}
          />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedNarrativeForm
            scenario={scenario}
            keyPoints={keyPoints}
            characters={characters}
            timeline={timeline}
            metrics={metrics}
            disabled={disabled}
            onScenarioChange={handleScenarioChange}
            onKeyPointChange={handleKeyPointChange}
            onAddKeyPoint={addKeyPoint}
            onRemoveKeyPoint={removeKeyPoint}
            onAddCharacter={addCharacter}
            onUpdateCharacter={updateCharacter}
            onRemoveCharacter={removeCharacter}
            onAddTimelineEvent={addTimelineEvent}
            onUpdateTimelineEvent={updateTimelineEvent}
            onRemoveTimelineEvent={removeTimelineEvent}
            onAddMetric={addMetric}
            onUpdateMetric={updateMetric}
            onRemoveMetric={removeMetric}
          />
        </TabsContent>
      </Tabs>

      {onGenerate && (
        <div className="pt-4">
          <Button className="w-full" onClick={handleGenerate} disabled={disabled || !scenario.trim()}>
            <Zap className="h-4 w-4 mr-2" />
            Generate Demo Data
          </Button>
        </div>
      )}
    </div>
  )
}
