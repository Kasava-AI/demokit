'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { X, Plus } from 'lucide-react'

interface SimpleNarrativeFormProps {
  scenario: string
  keyPoints: string[]
  disabled: boolean
  onScenarioChange: (value: string) => void
  onKeyPointChange: (index: number, value: string) => void
  onAddKeyPoint: () => void
  onRemoveKeyPoint: (index: number) => void
}

export function SimpleNarrativeForm({
  scenario,
  keyPoints,
  disabled,
  onScenarioChange,
  onKeyPointChange,
  onAddKeyPoint,
  onRemoveKeyPoint,
}: SimpleNarrativeFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="scenario">Scenario</Label>
        <Textarea
          id="scenario"
          rows={3}
          placeholder="Describe the demo scenario, e.g., 'E-commerce holiday rush with high order volume'"
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveKeyPoint(index)}
                  disabled={disabled}
                >
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
    </div>
  )
}
