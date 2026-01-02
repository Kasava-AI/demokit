/**
 * SourceInputs Component
 *
 * Form for optional intelligence sources: website URL, help center URL, README.
 * Validates URLs and shows fetch status for each source.
 */

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  BookOpen,
  FileText,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  X,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface SourceInputsValue {
  websiteUrl?: string
  readmeContent?: string
  documentationUrls?: string[]
}

interface SourceInputsProps {
  value?: SourceInputsValue
  onChange?: (value: SourceInputsValue) => void
  disabled?: boolean
  /** Show validation status for each source */
  validationStatus?: {
    website?: 'pending' | 'valid' | 'invalid'
    readme?: 'pending' | 'valid' | 'invalid'
    docs?: ('pending' | 'valid' | 'invalid')[]
  }
}

// ============================================================================
// URL Validation
// ============================================================================

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true // Empty is valid (optional)
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

// ============================================================================
// Component
// ============================================================================

export function SourceInputs({
  value = {},
  onChange,
  disabled = false,
  validationStatus = {},
}: SourceInputsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({})

  const handleChange = useCallback(
    (field: keyof SourceInputsValue, fieldValue: string | string[] | undefined) => {
      onChange?.({ ...value, [field]: fieldValue })
    },
    [value, onChange]
  )

  const validateAndSetUrl = useCallback(
    (field: 'websiteUrl', url: string) => {
      if (url && !isValidUrl(url)) {
        setUrlErrors((prev) => ({ ...prev, [field]: 'Please enter a valid URL' }))
      } else {
        setUrlErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
      handleChange(field, url || undefined)
    },
    [handleChange]
  )

  const addDocUrl = useCallback(() => {
    const currentDocs = value.documentationUrls || []
    handleChange('documentationUrls', [...currentDocs, ''])
  }, [value.documentationUrls, handleChange])

  const updateDocUrl = useCallback(
    (index: number, url: string) => {
      const currentDocs = [...(value.documentationUrls || [])]
      currentDocs[index] = url
      handleChange('documentationUrls', currentDocs)
    },
    [value.documentationUrls, handleChange]
  )

  const removeDocUrl = useCallback(
    (index: number) => {
      const currentDocs = (value.documentationUrls || []).filter((_, i) => i !== index)
      handleChange('documentationUrls', currentDocs.length > 0 ? currentDocs : undefined)
    },
    [value.documentationUrls, handleChange]
  )

  const getStatusIcon = (status?: 'pending' | 'valid' | 'invalid') => {
    switch (status) {
      case 'valid':
        return <Check className="h-4 w-4 text-success" />
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      default:
        return null
    }
  }

  const hasAnySources =
    value.websiteUrl ||
    value.readmeContent ||
    (value.documentationUrls && value.documentationUrls.length > 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Additional Sources</CardTitle>
            <CardDescription>
              Optional: Add more context for better intelligence
            </CardDescription>
          </div>
          {hasAnySources && (
            <Badge variant="secondary">
              {[
                value.websiteUrl && 'Website',
                value.readmeContent && 'README',
                value.documentationUrls?.length && `${value.documentationUrls.length} docs`,
              ]
                .filter(Boolean)
                .join(', ')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Website URL */}
        <div className="space-y-2">
          <Label htmlFor="website-url" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Website URL
            {getStatusIcon(validationStatus.website)}
          </Label>
          <Input
            id="website-url"
            type="url"
            placeholder="https://yourapp.com"
            value={value.websiteUrl || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => validateAndSetUrl('websiteUrl', e.target.value)}
            disabled={disabled}
            className={urlErrors.websiteUrl ? 'border-destructive' : ''}
          />
          {urlErrors.websiteUrl && (
            <p className="text-xs text-destructive">{urlErrors.websiteUrl}</p>
          )}
          <p className="text-xs text-muted-foreground">
            We'll analyze your homepage and feature pages
          </p>
        </div>

        {/* Advanced Section */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Advanced Sources</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showAdvanced ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* README Content */}
            <div className="space-y-2">
              <Label htmlFor="readme" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                README Content
                {getStatusIcon(validationStatus.readme)}
              </Label>
              <Textarea
                id="readme"
                placeholder="Paste your README.md content here..."
                value={value.readmeContent || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('readmeContent', e.target.value || undefined)}
                disabled={disabled}
                className="min-h-[100px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Developer documentation provides technical context
              </p>
            </div>

            {/* Additional Documentation URLs */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Additional Documentation
              </Label>
              <div className="space-y-2">
                {(value.documentationUrls || []).map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://docs.yourapp.com/guide"
                      value={url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDocUrl(index, e.target.value)}
                      disabled={disabled}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDocUrl(index)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {validationStatus.docs?.[index] && (
                      <div className="flex items-center">
                        {getStatusIcon(validationStatus.docs[index])}
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addDocUrl}
                  disabled={disabled}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Documentation URL
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                API docs, guides, or any relevant documentation
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
