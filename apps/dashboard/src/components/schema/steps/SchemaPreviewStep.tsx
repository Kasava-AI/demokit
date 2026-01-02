/**
 * SchemaPreviewStep Component
 *
 * Fourth step: Preview the parsed schema before importing.
 * Shows models, properties, relationships, and any warnings.
 */

'use client'

import { useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Box,
  Link2,
  AlertTriangle,
  ChevronDown,
  FileCode,
  Loader2,
  Info,
} from 'lucide-react'
import { useParseSchema } from '@/hooks/use-schema-parser'
import { fetchSchemaFiles } from '@/hooks/use-github-repositories'
import type { StepProps, ParsedModel, ParsedRelationship } from '../types'
import { useState } from 'react'

interface SchemaPreviewStepProps extends StepProps {
  projectId: string
}

function ModelCard({
  model,
  isExpanded,
  onToggle,
}: {
  model: ParsedModel
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Box className="h-4 w-4 text-primary" />
            <span className="font-medium">{model.name}</span>
            <Badge variant="secondary" className="text-xs">
              {model.propertyCount} properties
            </Badge>
            {model.type === 'enum' && (
              <Badge variant="outline" className="text-xs">
                Enum
              </Badge>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-7 p-3 bg-muted/30 rounded-lg space-y-2">
          {model.description && (
            <p className="text-sm text-muted-foreground">{model.description}</p>
          )}
          {model.required.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Required Fields:
              </div>
              <div className="flex flex-wrap gap-1">
                {model.required.map((field) => (
                  <Badge key={field} variant="outline" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function RelationshipCard({ relationship }: { relationship: ParsedRelationship }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-sm">
      <Badge variant="outline" className="text-xs">
        {relationship.from.model}
      </Badge>
      <span className="text-muted-foreground">.{relationship.from.field}</span>
      <Link2 className="h-3 w-3 text-muted-foreground" />
      <Badge variant="outline" className="text-xs">
        {relationship.to.model}
      </Badge>
      <span className="text-muted-foreground">.{relationship.to.field}</span>
      <Badge variant="secondary" className="text-xs ml-auto">
        {relationship.type}
      </Badge>
    </div>
  )
}

export function SchemaPreviewStep({
  state,
  onStateChange,
  projectId,
}: SchemaPreviewStepProps) {
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set())
  const parse = useParseSchema()

  // Parse files when entering this step
  useEffect(() => {
    async function parseFiles() {
      if (state.parsedSchema) {
        // Already parsed
        return
      }

      onStateChange({ isLoading: true, error: null })

      try {
        let filesToParse = state.uploadedFiles

        // If GitHub method, fetch file contents
        if (state.method === 'github' && state.repository && state.branch) {
          const paths = state.selectedFiles.map((f) => f.path)
          filesToParse = await fetchSchemaFiles(
            state.repository.owner,
            state.repository.name,
            state.branch,
            paths
          )
        }

        // Parse the files
        const result = await parse.mutateAsync({
          files: filesToParse,
          projectId,
        })

        onStateChange({
          parsedSchema: result,
          isLoading: false,
        })
      } catch (error) {
        onStateChange({
          isLoading: false,
          error:
            error instanceof Error ? error.message : 'Failed to parse schema',
        })
      }
    }

    parseFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const toggleModel = (modelName: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev)
      if (next.has(modelName)) {
        next.delete(modelName)
      } else {
        next.add(modelName)
      }
      return next
    })
  }

  // Stats
  const stats = useMemo(() => {
    if (!state.parsedSchema) return null
    return {
      modelCount: state.parsedSchema.models.length,
      relationshipCount: state.parsedSchema.relationships.length,
      warningCount: state.parsedSchema.warnings.length,
      fileCount: state.parsedSchema.parsedFiles.length,
      format: state.parsedSchema.format,
    }
  }, [state.parsedSchema])

  if (state.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm font-medium">Parsing schema files...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Extracting models and relationships
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!state.parsedSchema) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No schema parsed yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats?.modelCount}</div>
            <div className="text-xs text-muted-foreground">Models</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats?.relationshipCount}</div>
            <div className="text-xs text-muted-foreground">Relationships</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats?.fileCount}</div>
            <div className="text-xs text-muted-foreground">Files</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Badge variant="secondary" className="text-xs">
              {stats?.format}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Format</div>
          </CardContent>
        </Card>
      </div>

      {/* Models section */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Box className="h-4 w-4" />
          Models ({state.parsedSchema.models.length})
        </h3>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {state.parsedSchema.models.map((model) => (
            <ModelCard
              key={model.name}
              model={model}
              isExpanded={expandedModels.has(model.name)}
              onToggle={() => toggleModel(model.name)}
            />
          ))}
        </div>
      </div>

      {/* Relationships section */}
      {state.parsedSchema.relationships.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Relationships ({state.parsedSchema.relationships.length})
          </h3>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {state.parsedSchema.relationships.map((rel, idx) => (
              <RelationshipCard key={idx} relationship={rel} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings section */}
      {state.parsedSchema.warnings.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            Warnings ({state.parsedSchema.warnings.length})
          </h3>
          <div className="space-y-2 max-h-[100px] overflow-y-auto">
            {state.parsedSchema.warnings.map((warning, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <Badge variant="outline" className="text-xs mb-1">
                    {warning.code}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {warning.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parsed files */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <FileCode className="h-4 w-4" />
          Parsed Files
        </h3>
        <div className="flex flex-wrap gap-1">
          {state.parsedSchema.parsedFiles.map((file) => (
            <Badge key={file} variant="outline" className="text-xs">
              {file.split('/').pop()}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
