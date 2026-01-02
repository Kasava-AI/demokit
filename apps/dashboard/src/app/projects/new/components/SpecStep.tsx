'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { SpecUploader } from '@/components/spec/SpecUploader'
import type { StepProps, DemokitSchema } from './types'

export function SpecStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const handleSchemaLoaded = useCallback(
    (schema: DemokitSchema, content: string) => {
      onUpdate({ schema, schemaContent: content })
    },
    [onUpdate]
  )

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="text-xl">Upload OpenAPI Schema</CardTitle>
        <CardDescription className="mt-1">
          Upload your API specification to enable intelligent fixture generation
        </CardDescription>
      </div>

      <SpecUploader onSchemaLoaded={handleSchemaLoaded} />

      {data.schema && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              <span className="font-medium">Schema loaded successfully</span>
            </div>
            <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
              <span>{Object.keys(data.schema.models).length} models</span>
              <span>{data.schema.endpoints.length} endpoints</span>
              <span>{data.schema.relationships.length} relationships</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNext}>
            Skip for now
          </Button>
          <Button onClick={onNext} disabled={!data.schema}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
