'use client'

import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Check, Globe, X } from 'lucide-react'
import { SpecUploader } from '@/components/spec/SpecUploader'
import { Stagger, FadeIn } from '@/components/ui/motion'
import type { StepProps, DemokitSchema } from './types'

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Step 1 — point DemoKit at the app. The OpenAPI spec is the high-signal
 * input; the website URL enriches analysis. Either one lets you continue,
 * and skipping entirely still leads to a working (data-less) project.
 */
export function ConnectStep({ data, onUpdate, onNext }: StepProps) {
  const handleSchemaLoaded = useCallback(
    (schema: DemokitSchema, content: string) => {
      onUpdate({ schema, schemaContent: content })
    },
    [onUpdate]
  )

  const websiteUrl = data.sources.websiteUrl || ''
  const websiteValid = isValidUrl(websiteUrl)
  const hasAnything = !!data.schema || (!!websiteUrl.trim() && websiteValid)

  return (
    <Stagger className="space-y-8">
      <FadeIn>
        <h1 className="font-display-serif text-3xl tracking-tight">
          Point DemoKit at your app
        </h1>
        <p className="mt-2 text-muted-foreground">
          Drop in your OpenAPI spec and we&apos;ll work out your app&apos;s features,
          user journeys, and demo scenarios — no forms to fill in.
        </p>
      </FadeIn>

      <FadeIn>
        {/* SpecUploader's success state lives in the uploader itself; when the
            user comes back to this step with a schema already parsed, show the
            summary instead of an empty drop zone */}
        {data.schema ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success">
                  <Check className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {data.schema.info?.title || 'Schema'} parsed
                  </p>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>{Object.keys(data.schema.models).length} models</span>
                    <span>{data.schema.endpoints.length} endpoints</span>
                    <span>{data.schema.relationships.length} relationships</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onUpdate({ schema: undefined, schemaContent: undefined })}
                aria-label="Remove schema"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <SpecUploader
            onSchemaLoaded={handleSchemaLoaded}
            onReset={() => onUpdate({ schema: undefined, schemaContent: undefined })}
          />
        )}
      </FadeIn>

      <FadeIn>
        <div className="rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500">
              <Globe className="size-5 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <Label htmlFor="website-url">Website</Label>
                <p className="text-xs text-muted-foreground">
                  Optional — we read your homepage and feature pages for richer scenarios
                </p>
              </div>
              <Input
                id="website-url"
                type="url"
                placeholder="https://yourapp.com"
                value={websiteUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate({ sources: { ...data.sources, websiteUrl: e.target.value || undefined } })
                }
                className={!websiteValid ? 'border-destructive' : ''}
              />
              {!websiteValid && (
                <p className="text-xs text-destructive">Please enter a valid URL</p>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="flex items-center justify-end gap-2 border-t pt-5">
          {!hasAnything && (
            <Button variant="ghost" onClick={onNext}>
              Skip for now
            </Button>
          )}
          <Button onClick={onNext} disabled={!hasAnything}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </FadeIn>
    </Stagger>
  )
}
