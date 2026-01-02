/**
 * AddSourceDialog Component
 *
 * Dialog for adding a new data source to a project.
 * Supports website URLs, help center URLs, README content, and documentation URLs.
 * Shows real-time progress when fetching URL-based sources.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Loader2, Globe, FileText, Plus, Check, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateSource, type ProjectSource } from '@/hooks/use-sources'
import { useStreamSourceFetch, type SourceFetchPhase } from '@/hooks/use-stream-source-fetch'

type SourceType = 'website' | 'readme' | 'documentation'

const SOURCE_TYPE_CONFIG: Record<
  SourceType,
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    description: string
    placeholder: string
    inputType: 'url' | 'content'
  }
> = {
  website: {
    icon: Globe,
    label: 'Website',
    description: 'Your product website for context about your application',
    placeholder: 'https://example.com',
    inputType: 'url',
  },
  readme: {
    icon: FileText,
    label: 'README',
    description: 'Project README content with setup and usage instructions',
    placeholder: 'Paste your README content here...',
    inputType: 'content',
  },
  documentation: {
    icon: FileText,
    label: 'Documentation',
    description: 'API or technical documentation URL',
    placeholder: 'https://docs.example.com',
    inputType: 'url',
  },
}

// Phase display configuration
const PHASE_LABELS: Record<SourceFetchPhase, string> = {
  initializing: 'Preparing...',
  scraping: 'Fetching content...',
  processing: 'Processing...',
  saving: 'Saving...',
  complete: 'Complete!',
  failed: 'Failed',
}

export interface AddSourceDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSources?: ProjectSource[]
  onSuccess?: () => void
}

export function AddSourceDialog({
  projectId,
  open,
  onOpenChange,
  existingSources = [],
  onSuccess,
}: AddSourceDialogProps) {
  const [sourceType, setSourceType] = useState<SourceType>('website')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createSourceMutation = useCreateSource()

  // Stream source fetch hook
  const {
    status: fetchStatus,
    phase: fetchPhase,
    progress: fetchProgress,
    message: fetchMessage,
    error: fetchError,
    isStreaming,
    start: startFetch,
    cancel: cancelFetch,
    reset: resetFetch,
  } = useStreamSourceFetch({
    onComplete: () => {
      // Auto-close dialog after success
      setTimeout(() => {
        handleOpenChange(false)
        onSuccess?.()
      }, 1000)
    },
    onError: (errMsg) => {
      setError(errMsg)
    },
  })

  // Get available source types (ones not already added)
  const existingTypes = new Set(existingSources.map((s) => s.type))
  const availableTypes = (Object.keys(SOURCE_TYPE_CONFIG) as SourceType[]).filter(
    (type) => !existingTypes.has(type)
  )

  const config = SOURCE_TYPE_CONFIG[sourceType]
  const isUrlInput = config.inputType === 'url'

  const resetForm = useCallback(() => {
    setSourceType(availableTypes[0] || 'website')
    setUrl('')
    setContent('')
    setError(null)
    resetFetch()
  }, [availableTypes, resetFetch])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Cancel any ongoing fetch
        if (isStreaming) {
          cancelFetch()
        }
        resetForm()
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, resetForm, isStreaming, cancelFetch]
  )

  const handleSubmit = useCallback(async () => {
    setError(null)

    // Validate input
    if (isUrlInput && !url.trim()) {
      setError('URL is required')
      return
    }
    if (!isUrlInput && !content.trim()) {
      setError('Content is required')
      return
    }

    // Validate URL format
    if (isUrlInput) {
      try {
        new URL(url)
      } catch {
        setError('Please enter a valid URL')
        return
      }
    }

    try {
      // Create the source first
      const newSource = await createSourceMutation.mutateAsync({
        projectId,
        data: {
          type: sourceType,
          url: isUrlInput ? url.trim() : null,
          content: !isUrlInput ? content.trim() : null,
        },
      })

      // For content-based sources, we're done
      if (!isUrlInput) {
        handleOpenChange(false)
        onSuccess?.()
        return
      }

      // For URL-based sources, start streaming fetch
      await startFetch(projectId, newSource.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source')
    }
  }, [
    projectId,
    sourceType,
    url,
    content,
    isUrlInput,
    createSourceMutation,
    handleOpenChange,
    onSuccess,
    startFetch,
  ])

  // No available types to add
  if (availableTypes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>All Sources Added</DialogTitle>
            <DialogDescription>
              You have already added all available data source types to this project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Show progress UI when streaming
  const showProgress = isStreaming || fetchStatus === 'complete' || fetchStatus === 'error'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Data Source</DialogTitle>
          <DialogDescription>
            Add additional context to help generate more realistic demo data.
          </DialogDescription>
        </DialogHeader>

        {showProgress ? (
          // Progress view
          <div className="py-8 space-y-6">
            {/* Progress indicator */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {fetchStatus === 'complete' ? (
                    <>
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium text-green-600">Content fetched successfully!</span>
                    </>
                  ) : fetchStatus === 'error' ? (
                    <>
                      <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <span className="font-medium text-destructive">Fetch failed</span>
                    </>
                  ) : (
                    <>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                      <span className="font-medium">{PHASE_LABELS[fetchPhase]}</span>
                    </>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{fetchProgress}%</span>
              </div>

              <Progress value={fetchProgress} className="h-2" />

              {fetchMessage && fetchStatus === 'streaming' && (
                <p className="text-sm text-muted-foreground text-center">{fetchMessage}</p>
              )}

              {fetchError && (
                <p className="text-sm text-destructive text-center">{fetchError}</p>
              )}
            </div>

            {/* URL being fetched */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground truncate">{url}</span>
              </div>
            </div>
          </div>
        ) : (
          // Form view
          <div className="space-y-4 py-4">
            {/* Source Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="source-type">Source Type</Label>
              <Select
                value={sourceType}
                onValueChange={(value) => {
                  setSourceType(value as SourceType)
                  setUrl('')
                  setContent('')
                  setError(null)
                }}
              >
                <SelectTrigger id="source-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => {
                    const typeConfig = SOURCE_TYPE_CONFIG[type]
                    const Icon = typeConfig.icon
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{typeConfig.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>

            {/* URL or Content Input */}
            {isUrlInput ? (
              <div className="space-y-2">
                <Label htmlFor="source-url">URL</Label>
                <Input
                  id="source-url"
                  type="url"
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setUrl(e.target.value)
                    setError(null)
                  }}
                  placeholder={config.placeholder}
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="source-content">Content</Label>
                <Textarea
                  id="source-content"
                  value={content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    setContent(e.target.value)
                    setError(null)
                  }}
                  placeholder={config.placeholder}
                  className="min-h-[200px] font-mono text-sm"
                  autoFocus
                />
              </div>
            )}

            {/* Error message */}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {showProgress ? (
            // Progress footer
            fetchStatus === 'complete' ? (
              <Button onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            ) : fetchStatus === 'error' ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Close
                </Button>
                <Button onClick={handleSubmit}>
                  Retry
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={cancelFetch}>
                <X className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            )
          ) : (
            // Form footer
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createSourceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createSourceMutation.isPending}
              >
                {createSourceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Source
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
