'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import type { StepProps } from './types'

export function BasicsStep({ data, onUpdate, onNext }: StepProps) {
  const canProceed = data.name.trim().length > 0

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-xl">Create New Project</CardTitle>
        <CardDescription className="mt-1">
          Start by giving your project a name
        </CardDescription>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ name: e.target.value })}
            placeholder="My SaaS App"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdate({ description: e.target.value })}
            placeholder="A brief description of your project..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
