'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { SourceInputs, type SourceInputsValue } from '@/components/spec/SourceInputs'
import type { StepProps } from './types'

export function SourcesStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const handleSourcesChange = useCallback(
    (sources: SourceInputsValue) => {
      onUpdate({ sources })
    },
    [onUpdate]
  )

  const hasAnySources =
    data.sources.websiteUrl ||
    data.sources.readmeContent ||
    (data.sources.documentationUrls && data.sources.documentationUrls.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-xl">Additional Intelligence Sources</CardTitle>
        <CardDescription className="mt-1">
          Add more context for smarter fixture generation (optional)
        </CardDescription>
      </div>

      <SourceInputs value={data.sources} onChange={handleSourcesChange} />

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          {hasAnySources ? 'Continue' : 'Skip'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
