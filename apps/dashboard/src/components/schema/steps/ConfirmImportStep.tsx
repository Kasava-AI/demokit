/**
 * ConfirmImportStep Component
 *
 * Fifth step: Review final summary and confirm import.
 * Shows what will be imported and handles the actual save operation.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Box,
  Link2,
  FileCode,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  GitBranch,
  Upload,
} from 'lucide-react'
import { useSaveSchema } from '@/hooks/use-schema-parser'
import type { StepProps } from '../types'

interface ConfirmImportStepProps extends StepProps {
  projectId: string
  onComplete: () => void
}

export function ConfirmImportStep({
  state,
  onStateChange,
  projectId,
  onComplete,
}: ConfirmImportStepProps) {
  const [confirmChecked, setConfirmChecked] = useState(false)
  const saveSchema = useSaveSchema()

  const handleImport = async () => {
    if (!state.parsedSchema) {
      onStateChange({ error: 'No schema to import' })
      return
    }

    onStateChange({ isLoading: true, error: null })

    try {
      await saveSchema.mutateAsync({
        projectId,
        schema: state.parsedSchema,
        source: {
          type: state.method === 'github' ? 'github' : 'upload',
          repo: state.repository
            ? `${state.repository.owner}/${state.repository.name}`
            : undefined,
          branch: state.branch || undefined,
          paths: state.selectedFiles.map((f) => f.path),
        },
      })

      onComplete()
    } catch (error) {
      onStateChange({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to save schema',
      })
    }
  }

  if (!state.parsedSchema) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No schema to import</p>
      </div>
    )
  }

  const { schema, format, warnings } = state.parsedSchema
  const modelCount = Object.keys(schema.models).length
  const relationshipCount = schema.relationships.length
  const hasWarnings = warnings.length > 0

  return (
    <div className="space-y-6">
      {/* Source summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {state.method === 'github' ? (
              <GitBranch className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import Source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {state.method === 'github' && state.repository && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repository:</span>
                <span className="font-medium">
                  {state.repository.owner}/{state.repository.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch:</span>
                <span className="font-medium">{state.branch}</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Format:</span>
            <Badge variant="secondary">{format}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Files:</span>
            <span className="font-medium">
              {state.method === 'github'
                ? state.selectedFiles.length
                : state.uploadedFiles.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Schema summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Schema Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Box className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xl font-bold">{modelCount}</div>
                <div className="text-xs text-muted-foreground">
                  {modelCount === 1 ? 'Model' : 'Models'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Link2 className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xl font-bold">{relationshipCount}</div>
                <div className="text-xs text-muted-foreground">
                  {relationshipCount === 1 ? 'Relationship' : 'Relationships'}
                </div>
              </div>
            </div>
          </div>

          {/* Model list preview */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Models to import:
            </div>
            <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
              {Object.keys(schema.models).map((modelName) => (
                <Badge key={modelName} variant="outline" className="text-xs">
                  {modelName}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {hasWarnings && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Warnings ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[100px] overflow-y-auto">
              {warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-yellow-600">•</span>
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation checkbox */}
      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
        <Checkbox
          id="confirm"
          checked={confirmChecked}
          onCheckedChange={(checked) => setConfirmChecked(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="confirm" className="text-sm cursor-pointer">
          I understand that importing this schema will{' '}
          <span className="font-medium">
            add {modelCount} {modelCount === 1 ? 'model' : 'models'}
          </span>{' '}
          to my project's data schema.
          {hasWarnings && (
            <span className="text-yellow-600">
              {' '}
              There are {warnings.length}{' '}
              {warnings.length === 1 ? 'warning' : 'warnings'} to review.
            </span>
          )}
        </Label>
      </div>

      {/* Import button */}
      <Button
        onClick={handleImport}
        disabled={!confirmChecked || state.isLoading}
        className="w-full"
        size="lg"
      >
        {state.isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Importing Schema...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Import Schema
          </>
        )}
      </Button>

      {/* Success message - shown briefly before onComplete is called */}
      {saveSchema.isSuccess && (
        <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Schema imported successfully!
          </span>
        </div>
      )}
    </div>
  )
}
