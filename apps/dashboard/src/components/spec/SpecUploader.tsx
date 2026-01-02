/**
 * SpecUploader Component
 *
 * Drag-and-drop OpenAPI spec upload component.
 * Supports YAML/JSON files. Shows parsing progress and validation results.
 */

import React, { useState, useCallback, useRef } from 'react'
import { parseSchemaAction, type ParseSchemaResult } from '@/app/actions/parse-schema'

// Re-export schema type from action to avoid importing @demokit-ai/core directly
// (which has webpack compatibility issues)
type DemokitSchema = NonNullable<ParseSchemaResult['schema']>
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileJson,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface SpecUploaderProps {
  onSchemaLoaded?: (schema: DemokitSchema, content: string) => void
  disabled?: boolean
}

type UploadState = 'idle' | 'uploading' | 'parsing' | 'success' | 'error'

interface ParseResult {
  schema?: DemokitSchema
  content?: string
  error?: string
  modelCount?: number
  endpointCount?: number
  relationshipCount?: number
}

// ============================================================================
// Component
// ============================================================================

export function SpecUploader({ onSchemaLoaded, disabled = false }: SpecUploaderProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [parseResult, setParseResult] = useState<ParseResult>({})
  const [dragActive, setDragActive] = useState(false)
  const [pastedContent, setPastedContent] = useState('')
  const [activeTab, setActiveTab] = useState('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseSpec = useCallback(
    async (content: string, _filename?: string) => {
      setState('parsing')
      setParseResult({})

      try {
        const result = await parseSchemaAction(content)

        if (result.success && result.schema) {
          const schema = result.schema
          const parseRes: ParseResult = {
            schema,
            content,
            modelCount: Object.keys(schema.models).length,
            endpointCount: schema.endpoints.length,
            relationshipCount: schema.relationships.length,
          }

          setParseResult(parseRes)
          setState('success')
          onSchemaLoaded?.(schema, content)
        } else {
          setParseResult({ error: result.error || 'Unknown error' })
          setState('error')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setParseResult({ error: message })
        setState('error')
      }
    },
    [onSchemaLoaded]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files && files[0]) {
        setState('uploading')
        const file = files[0]
        const content = await file.text()
        await parseSpec(content, file.name)
      }
    },
    [disabled, parseSpec]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files[0]) {
        setState('uploading')
        const file = files[0]
        const content = await file.text()
        await parseSpec(content, file.name)
      }
    },
    [parseSpec]
  )

  const handlePaste = useCallback(async () => {
    if (!pastedContent.trim()) return
    await parseSpec(pastedContent.trim())
  }, [pastedContent, parseSpec])

  const handleReset = useCallback(() => {
    setState('idle')
    setParseResult({})
    setPastedContent('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const renderDropZone = () => (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.json"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Drop your OpenAPI spec here</p>
          <p className="text-sm text-muted-foreground">
            or click to browse (YAML or JSON)
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            <FileText className="h-3 w-3 mr-1" />
            YAML
          </Badge>
          <Badge variant="outline">
            <FileJson className="h-3 w-3 mr-1" />
            JSON
          </Badge>
        </div>
      </div>
    </div>
  )

  const renderPasteArea = () => (
    <div className="space-y-3">
      <Label htmlFor="spec-content">Paste OpenAPI Spec</Label>
      <Textarea
        id="spec-content"
        placeholder="Paste your OpenAPI specification here (YAML or JSON)..."
        className="font-mono text-sm min-h-[200px]"
        value={pastedContent}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPastedContent(e.target.value)}
        disabled={disabled || state === 'parsing'}
      />
      <Button
        onClick={handlePaste}
        disabled={disabled || !pastedContent.trim() || state === 'parsing'}
        className="w-full"
      >
        {state === 'parsing' ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Parsing...
          </>
        ) : (
          'Parse Specification'
        )}
      </Button>
    </div>
  )

  const renderProgress = () => {
    if (state === 'uploading') {
      return (
        <Card className="border-primary/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Reading file...</span>
          </CardContent>
        </Card>
      )
    }

    if (state === 'parsing') {
      return (
        <Card className="border-primary/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Parsing OpenAPI specification...</span>
          </CardContent>
        </Card>
      )
    }

    return null
  }

  const renderSuccess = () => (
    <Card className="border-success/50 bg-success/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-success/10 p-2">
              <Check className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="font-medium text-success">
                Schema parsed successfully
              </p>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>{parseResult.modelCount} models</span>
                <span>{parseResult.endpointCount} endpoints</span>
                <span>{parseResult.relationshipCount} relationships</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderError = () => (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">
                Failed to parse schema
              </p>
              <p className="text-sm text-destructive/80 mt-1">
                {parseResult.error}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Show result state
  if (state === 'success') {
    return renderSuccess()
  }

  if (state === 'error') {
    return renderError()
  }

  // Show progress
  if (state === 'uploading' || state === 'parsing') {
    return renderProgress()
  }

  // Default idle state
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <AnimatedTabsList variant="underline" layoutId="spec-uploader-tabs">
        <AnimatedTabsTrigger variant="underline" value="upload" isActive={activeTab === 'upload'} layoutId="spec-uploader-indicator">Upload File</AnimatedTabsTrigger>
        <AnimatedTabsTrigger variant="underline" value="paste" isActive={activeTab === 'paste'} layoutId="spec-uploader-indicator">Paste Spec</AnimatedTabsTrigger>
      </AnimatedTabsList>
      <TabsContent value="upload" className="mt-4">
        {renderDropZone()}
      </TabsContent>
      <TabsContent value="paste" className="mt-4">
        {renderPasteArea()}
      </TabsContent>
    </Tabs>
  )
}
