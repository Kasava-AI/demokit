/**
 * SchemaFileSelectorStep Component
 *
 * Third step: Select schema files to parse.
 * For GitHub: Shows auto-detected files with checkboxes.
 * For Upload: Provides drag-and-drop file upload.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileCode,
  Upload,
  FileJson,
  X,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react'
import { useSchemaDiscovery } from '@/hooks/use-github-repositories'
import type { StepProps, DiscoveredSchemaFile, CodebaseFile, SchemaFormat } from '../types'

interface SchemaFileSelectorStepProps extends StepProps {
  projectId: string
}

const FORMAT_ICONS: Record<SchemaFormat, React.ComponentType<{ className?: string }>> = {
  typescript: FileCode,
  zod: FileCode,
  drizzle: FileCode,
  prisma: FileJson,
  graphql: FileJson,
  supabase: FileCode,
  trpc: FileCode,
  nextjs: FileCode,
  openapi: FileJson,
  auto: FileCode,
}

const FORMAT_COLORS: Record<SchemaFormat, string> = {
  typescript: 'text-blue-500',
  zod: 'text-blue-600',
  drizzle: 'text-green-600',
  prisma: 'text-indigo-600',
  graphql: 'text-pink-500',
  supabase: 'text-emerald-500',
  trpc: 'text-cyan-600',
  nextjs: 'text-gray-600',
  openapi: 'text-orange-500',
  auto: 'text-muted-foreground',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function SchemaFileSelectorStep({
  state,
  onStateChange,
}: SchemaFileSelectorStepProps) {
  // For GitHub method: use discovery hook
  const {
    data: discoveredFiles,
    isLoading: isDiscovering,
    refetch: rediscover,
    error: discoveryError,
  } = useSchemaDiscovery(
    state.repository?.owner,
    state.repository?.name,
    state.branch || undefined
  )

  // For Upload method: handle file drops
  const [isDragging, setIsDragging] = useState(false)

  // Auto-select high-confidence files on first discovery
  useEffect(() => {
    if (
      state.method === 'github' &&
      discoveredFiles &&
      state.selectedFiles.length === 0
    ) {
      // Auto-select files with > 0.5 confidence
      const highConfidence = discoveredFiles.filter((f) => f.confidence > 0.5)
      if (highConfidence.length > 0) {
        onStateChange({ selectedFiles: highConfidence })
      }
    }
  }, [discoveredFiles, state.method, state.selectedFiles.length, onStateChange])

  const handleToggleFile = useCallback(
    (file: DiscoveredSchemaFile) => {
      const isSelected = state.selectedFiles.some((f) => f.path === file.path)
      if (isSelected) {
        onStateChange({
          selectedFiles: state.selectedFiles.filter((f) => f.path !== file.path),
        })
      } else {
        onStateChange({
          selectedFiles: [...state.selectedFiles, file],
        })
      }
    },
    [state.selectedFiles, onStateChange]
  )

  const handleSelectAll = useCallback(() => {
    if (discoveredFiles) {
      onStateChange({ selectedFiles: discoveredFiles })
    }
  }, [discoveredFiles, onStateChange])

  const handleDeselectAll = useCallback(() => {
    onStateChange({ selectedFiles: [] })
  }, [onStateChange])

  // File upload handlers
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const codebaseFiles: CodebaseFile[] = []

      for (const file of files) {
        // Only accept text files
        if (
          file.name.endsWith('.ts') ||
          file.name.endsWith('.tsx') ||
          file.name.endsWith('.prisma') ||
          file.name.endsWith('.graphql') ||
          file.name.endsWith('.gql')
        ) {
          const content = await file.text()
          codebaseFiles.push({
            path: file.name,
            content,
          })
        }
      }

      if (codebaseFiles.length > 0) {
        onStateChange({
          uploadedFiles: [...state.uploadedFiles, ...codebaseFiles],
        })
      }
    },
    [state.uploadedFiles, onStateChange]
  )

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const codebaseFiles: CodebaseFile[] = []

      for (const file of files) {
        const content = await file.text()
        codebaseFiles.push({
          path: file.name,
          content,
        })
      }

      if (codebaseFiles.length > 0) {
        onStateChange({
          uploadedFiles: [...state.uploadedFiles, ...codebaseFiles],
        })
      }

      // Reset input
      e.target.value = ''
    },
    [state.uploadedFiles, onStateChange]
  )

  const handleRemoveUploadedFile = useCallback(
    (path: string) => {
      onStateChange({
        uploadedFiles: state.uploadedFiles.filter((f) => f.path !== path),
      })
    },
    [state.uploadedFiles, onStateChange]
  )

  // Render GitHub file selector
  if (state.method === 'github') {
    return (
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {discoveredFiles
              ? `${discoveredFiles.length} schema files detected`
              : 'Scanning repository...'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => rediscover()}
              disabled={isDiscovering}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${isDiscovering ? 'animate-spin' : ''}`}
              />
              Rescan
            </Button>
            {discoveredFiles && discoveredFiles.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isDiscovering ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))
          ) : discoveryError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">Failed to scan repository</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => rediscover()}>
                Try Again
              </Button>
            </div>
          ) : discoveredFiles?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No schema files detected</p>
              <p className="text-xs mt-1">
                Make sure your repository contains TypeScript, Zod, Drizzle, or
                Prisma schema files.
              </p>
            </div>
          ) : (
            discoveredFiles?.map((file) => {
              const Icon = FORMAT_ICONS[file.format]
              const isSelected = state.selectedFiles.some(
                (f) => f.path === file.path
              )

              return (
                <div
                  key={file.path}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleToggleFile(file)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleFile(file)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Icon className={`h-4 w-4 ${FORMAT_COLORS[file.format]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {file.path}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {file.format}
                  </Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatBytes(file.size)}
                  </span>
                  {file.confidence > 0.8 && (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Selection summary */}
        {state.selectedFiles.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <strong>{state.selectedFiles.length}</strong> file
            {state.selectedFiles.length !== 1 ? 's' : ''} selected for parsing
          </div>
        )}
      </div>
    )
  }

  // Render Upload file selector
  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          {isDragging ? 'Drop files here' : 'Drag and drop schema files'}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Supports .ts, .tsx, .prisma, .graphql files
        </p>
        <label>
          <input
            type="file"
            multiple
            accept=".ts,.tsx,.prisma,.graphql,.gql"
            onChange={handleFileInput}
            className="hidden"
          />
          <Button variant="outline" size="sm" asChild>
            <span>Browse Files</span>
          </Button>
        </label>
      </div>

      {/* Uploaded files list */}
      {state.uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Uploaded Files ({state.uploadedFiles.length})
          </div>
          {state.uploadedFiles.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{file.path}</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(file.content.length)} content
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleRemoveUploadedFile(file.path)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
