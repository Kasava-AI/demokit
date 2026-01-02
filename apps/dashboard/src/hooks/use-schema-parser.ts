/**
 * Hook for parsing schema files.
 * Uses the backend API to parse codebase files into DemokitSchema format.
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CodebaseFile,
  ParsedSchemaResult,
  SchemaFormat,
} from '@/components/schema/types'

interface ParseSchemaOptions {
  files: CodebaseFile[]
  format?: SchemaFormat
  projectId: string
}

interface SaveSchemaOptions {
  projectId: string
  schema: ParsedSchemaResult
  source: {
    type: 'github' | 'upload'
    repo?: string
    branch?: string
    paths?: string[]
    commitSha?: string
  }
}

/**
 * Parse schema files via the API.
 */
async function parseSchema(options: ParseSchemaOptions): Promise<ParsedSchemaResult> {
  const res = await fetch(`/api/projects/${options.projectId}/schema/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: options.files,
      format: options.format || 'auto',
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Parse failed' }))
    throw new Error(error.message || 'Failed to parse schema')
  }

  return res.json()
}

/**
 * Save parsed schema to the project.
 */
async function saveSchema(options: SaveSchemaOptions): Promise<void> {
  const res = await fetch(`/api/projects/${options.projectId}/schema`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema: options.schema,
      source: options.source,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Save failed' }))
    throw new Error(error.message || 'Failed to save schema')
  }
}

/**
 * Hook for parsing schema files.
 */
export function useParseSchema() {
  return useMutation({
    mutationFn: parseSchema,
  })
}

/**
 * Hook for saving parsed schema to a project.
 */
export function useSaveSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveSchema,
    onSuccess: (_, variables) => {
      // Invalidate project and schema queries
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['project-schema', variables.projectId],
      })
    },
  })
}

/**
 * Combined hook for parsing and saving schema.
 */
export function useSchemaImport(projectId: string) {
  const parse = useParseSchema()
  const save = useSaveSchema()

  const importSchema = async (
    files: CodebaseFile[],
    source: SaveSchemaOptions['source'],
    format?: SchemaFormat
  ) => {
    // Parse the files
    const result = await parse.mutateAsync({ files, format, projectId })

    // Save to project
    await save.mutateAsync({
      projectId,
      schema: result,
      source,
    })

    return result
  }

  return {
    importSchema,
    isParsing: parse.isPending,
    isSaving: save.isPending,
    isLoading: parse.isPending || save.isPending,
    parseError: parse.error,
    saveError: save.error,
    error: parse.error || save.error,
    reset: () => {
      parse.reset()
      save.reset()
    },
  }
}
