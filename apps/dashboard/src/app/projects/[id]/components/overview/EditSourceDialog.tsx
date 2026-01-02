/**
 * EditSourceDialog Component
 *
 * Dialog for editing an existing data source.
 * Shows the source details and allows updating URL or content.
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  Loader2,
  Globe,
  FileText,
  Save,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUpdateSource, useDeleteSource, type ProjectSource } from '@/hooks/use-sources'

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

export interface EditSourceDialogProps {
  projectId: string
  source: ProjectSource | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditSourceDialog({
  projectId,
  source,
  open,
  onOpenChange,
  onSuccess,
}: EditSourceDialogProps) {
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const updateSourceMutation = useUpdateSource()
  const deleteSourceMutation = useDeleteSource()

  // Reset form when source changes
  useEffect(() => {
    if (source) {
      setUrl(source.url || '')
      setContent(source.content || '')
      setError(null)
    }
  }, [source])

  if (!source) return null

  const config = SOURCE_TYPE_CONFIG[source.type as SourceType]
  const Icon = config?.icon || FileText
  const isUrlInput = config?.inputType === 'url'

  const handleSave = async () => {
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
      await updateSourceMutation.mutateAsync({
        projectId,
        sourceId: source.id,
        data: {
          url: isUrlInput ? url.trim() : null,
          content: !isUrlInput ? content.trim() : null,
        },
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteSourceMutation.mutateAsync({
        projectId,
        sourceId: source.id,
      })

      setShowDeleteConfirm(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source')
      setShowDeleteConfirm(false)
    }
  }

  const isPending = updateSourceMutation.isPending || deleteSourceMutation.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Edit {config?.label || 'Source'}</DialogTitle>
                <DialogDescription>
                  {config?.description || 'Update this data source'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* URL or Content Input */}
            {isUrlInput ? (
              <div className="space-y-2">
                <Label htmlFor="edit-source-url">URL</Label>
                <Input
                  id="edit-source-url"
                  type="url"
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setUrl(e.target.value)
                    setError(null)
                  }}
                  placeholder={config?.placeholder}
                  disabled={isPending}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-source-content">Content</Label>
                <Textarea
                  id="edit-source-content"
                  value={content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    setContent(e.target.value)
                    setError(null)
                  }}
                  placeholder={config?.placeholder}
                  className="min-h-[200px] font-mono text-sm"
                  disabled={isPending}
                />
              </div>
            )}

            {/* Fetch status info */}
            {source.fetchStatus && source.fetchStatus !== 'completed' && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">{source.fetchStatus}</span>
                </div>
                {source.fetchError && (
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="text-xs">{source.fetchError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error message */}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {updateSourceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {config?.label || 'Source'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this data source from your project.
              Any extracted content will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSourceMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSourceMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSourceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Source'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
