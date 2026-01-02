/**
 * CodebaseFileUploader Component
 *
 * Drag-and-drop file uploader for schema files.
 * Supports multiple files with format detection preview.
 */

'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  X,
  FileCode,
  FileText,
  AlertCircle,
} from 'lucide-react'
import type { CodebaseFile, SchemaFormat } from './types'
import { cn } from '@/lib/utils'

interface CodebaseFileUploaderProps {
  files: CodebaseFile[]
  onFilesChange: (files: CodebaseFile[]) => void
  maxFiles?: number
  maxFileSize?: number // bytes
}

// Detect format from file extension and content
function detectFormat(path: string, content: string): SchemaFormat | null {
  const ext = path.split('.').pop()?.toLowerCase()

  // Prisma files
  if (ext === 'prisma') {
    return 'prisma'
  }

  // GraphQL files
  if (ext === 'graphql' || ext === 'gql') {
    return 'graphql'
  }

  // TypeScript/JavaScript files
  if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
    // Check for Drizzle patterns
    if (
      content.includes('pgTable') ||
      content.includes('mysqlTable') ||
      content.includes('sqliteTable')
    ) {
      return 'drizzle'
    }

    // Check for Zod patterns
    if (content.includes('z.object') || content.includes('z.string')) {
      return 'zod'
    }

    // Check for tRPC patterns
    if (content.includes('router(') && content.includes('procedure')) {
      return 'trpc'
    }

    // Check for Supabase generated types
    if (
      path.includes('database.types') ||
      content.includes('export interface Database')
    ) {
      return 'supabase'
    }

    // Default to TypeScript
    return 'typescript'
  }

  return null
}

const FORMAT_LABELS: Record<SchemaFormat, string> = {
  auto: 'Auto-detect',
  typescript: 'TypeScript',
  zod: 'Zod',
  drizzle: 'Drizzle',
  prisma: 'Prisma',
  graphql: 'GraphQL',
  supabase: 'Supabase',
  trpc: 'tRPC',
  nextjs: 'Next.js',
  openapi: 'OpenAPI',
}

export function CodebaseFileUploader({
  files,
  onFilesChange,
  maxFiles = 20,
  maxFileSize = 1024 * 1024, // 1MB default
}: CodebaseFileUploaderProps) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null)

      // Check max files
      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      const newFiles: CodebaseFile[] = []

      for (const file of acceptedFiles) {
        // Check file size
        if (file.size > maxFileSize) {
          setError(`File "${file.name}" exceeds maximum size of ${Math.round(maxFileSize / 1024)}KB`)
          continue
        }

        // Read file content
        try {
          const content = await file.text()
          const format = detectFormat(file.name, content)

          if (!format) {
            setError(`Unsupported file type: ${file.name}`)
            continue
          }

          newFiles.push({
            path: file.name,
            content,
          })
        } catch {
          setError(`Failed to read file: ${file.name}`)
        }
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles])
      }
    },
    [files, onFilesChange, maxFiles, maxFileSize]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.ts', '.tsx', '.js', '.jsx', '.prisma', '.graphql', '.gql'],
      'application/json': ['.json'],
    },
  })

  const removeFile = (index: number) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    onFilesChange(newFiles)
  }

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase()
    if (ext === 'prisma') return <FileText className="h-4 w-4 text-blue-500" />
    if (ext === 'graphql' || ext === 'gql') return <FileText className="h-4 w-4 text-pink-500" />
    return <FileCode className="h-4 w-4 text-yellow-500" />
  }

  const getFileFormat = (file: CodebaseFile): SchemaFormat | null => {
    return detectFormat(file.path, file.content)
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">Drop the files here...</p>
        ) : (
          <>
            <p className="text-sm font-medium mb-1">
              Drag & drop schema files here
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse
            </p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0"
            onClick={() => setError(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </div>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {files.map((file, index) => {
              const format = getFileFormat(file)
              return (
                <div
                  key={file.path + index}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm"
                >
                  {getFileIcon(file.path)}
                  <span className="flex-1 truncate">{file.path}</span>
                  {format && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {FORMAT_LABELS[format]}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Supported formats hint */}
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">Supported:</span>{' '}
        TypeScript (.ts, .tsx), Prisma (.prisma), GraphQL (.graphql)
      </div>
    </div>
  )
}
