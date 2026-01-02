'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus } from 'lucide-react'
import type { Character, TimelineEvent, MetricTarget } from './types'

interface AdvancedNarrativeFormProps {
  scenario: string
  keyPoints: string[]
  characters: Character[]
  timeline: TimelineEvent[]
  metrics: MetricTarget[]
  disabled: boolean
  onScenarioChange: (value: string) => void
  onKeyPointChange: (index: number, value: string) => void
  onAddKeyPoint: () => void
  onRemoveKeyPoint: (index: number) => void
  onAddCharacter: () => void
  onUpdateCharacter: (index: number, field: keyof Character, value: string) => void
  onRemoveCharacter: (index: number) => void
  onAddTimelineEvent: () => void
  onUpdateTimelineEvent: (index: number, field: keyof TimelineEvent, value: string | string[]) => void
  onRemoveTimelineEvent: (index: number) => void
  onAddMetric: () => void
  onUpdateMetric: (index: number, field: keyof MetricTarget, value: string) => void
  onRemoveMetric: (index: number) => void
}

export function AdvancedNarrativeForm({
  scenario,
  keyPoints,
  characters,
  timeline,
  metrics,
  disabled,
  onScenarioChange,
  onKeyPointChange,
  onAddKeyPoint,
  onRemoveKeyPoint,
  onAddCharacter,
  onUpdateCharacter,
  onRemoveCharacter,
  onAddTimelineEvent,
  onUpdateTimelineEvent,
  onRemoveTimelineEvent,
  onAddMetric,
  onUpdateMetric,
  onRemoveMetric,
}: AdvancedNarrativeFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="scenario-adv">Scenario</Label>
        <Textarea
          id="scenario-adv"
          rows={3}
          placeholder="Describe the demo scenario"
          value={scenario}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onScenarioChange(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Key Points</Label>
        <div className="space-y-2">
          {keyPoints.map((point, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Key point ${index + 1}`}
                value={point}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onKeyPointChange(index, e.target.value)}
                disabled={disabled}
              />
              {keyPoints.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => onRemoveKeyPoint(index)} disabled={disabled}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="link" size="sm" className="px-0" onClick={onAddKeyPoint} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" />
            Add key point
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Characters</Label>
        <div className="space-y-3">
          {characters.map((char, index) => (
            <Card key={index}>
              <CardContent className="flex gap-2 p-3">
                <Input
                  placeholder="Name"
                  value={char.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateCharacter(index, 'name', e.target.value)}
                  disabled={disabled}
                />
                <Input
                  placeholder="Role"
                  value={char.role}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateCharacter(index, 'role', e.target.value)}
                  disabled={disabled}
                />
                <Button variant="ghost" size="icon" onClick={() => onRemoveCharacter(index)} disabled={disabled}>
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button variant="link" size="sm" className="px-0" onClick={onAddCharacter} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" />
            Add character
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timeline</Label>
        <div className="space-y-3">
          {timeline.map((event, index) => (
            <Card key={index}>
              <CardContent className="flex gap-2 p-3">
                <Input
                  className="w-32"
                  placeholder="When"
                  value={event.when}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateTimelineEvent(index, 'when', e.target.value)}
                  disabled={disabled}
                />
                <Input
                  className="flex-1"
                  placeholder="Event description"
                  value={event.event}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateTimelineEvent(index, 'event', e.target.value)}
                  disabled={disabled}
                />
                <Button variant="ghost" size="icon" onClick={() => onRemoveTimelineEvent(index)} disabled={disabled}>
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button variant="link" size="sm" className="px-0" onClick={onAddTimelineEvent} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" />
            Add timeline event
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Metric Targets</Label>
        <div className="space-y-3">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="flex gap-2 p-3">
                <Input
                  className="flex-1"
                  placeholder="Metric name"
                  value={metric.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateMetric(index, 'name', e.target.value)}
                  disabled={disabled}
                />
                <Select
                  value={metric.trend || ''}
                  onValueChange={(value) => onUpdateMetric(index, 'trend', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Trend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increasing">Increasing</SelectItem>
                    <SelectItem value="declining">Declining</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="w-24"
                  placeholder="Amount"
                  value={metric.amount || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateMetric(index, 'amount', e.target.value)}
                  disabled={disabled}
                />
                <Button variant="ghost" size="icon" onClick={() => onRemoveMetric(index)} disabled={disabled}>
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button variant="link" size="sm" className="px-0" onClick={onAddMetric} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" />
            Add metric target
          </Button>
        </div>
      </div>
    </div>
  )
}
