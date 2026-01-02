/**
 * SchemaUploadSheet Component
 *
 * Sheet for viewing existing schema or uploading a new one.
 * Combines schema display with upload capability.
 */

'use client'

import { useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { FileJson, Check, ChevronDown, Upload } from 'lucide-react'
import { SpecUploader } from '@/components/spec/SpecUploader'
import { useUpdateProject } from '@/hooks/use-projects'

// Re-export the schema type we need
type DemokitSchema = {
  models: Record<string, unknown>
  endpoints?: unknown[]
  relationships?: unknown[]
}

interface SchemaUploadSheetProps {
  projectId: string
  schema?: DemokitSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSchemaUpdated?: () => void
}

export function SchemaUploadSheet({
  projectId,
  schema,
  open,
  onOpenChange,
  onSchemaUpdated,
}: SchemaUploadSheetProps) {
  const updateProject = useUpdateProject()

  const handleSchemaLoaded = useCallback(
    async (newSchema: DemokitSchema, _content: string) => {
      try {
        await updateProject.mutateAsync({
          id: projectId,
          data: { schema: newSchema as unknown as Record<string, unknown> },
        })
        onSchemaUpdated?.()
      } catch (error) {
        console.error('Failed to save schema:', error)
      }
    },
    [projectId, updateProject, onSchemaUpdated]
  )

  const hasSchema = !!schema
  const modelCount = schema ? Object.keys(schema.models || {}).length : 0
  const endpointCount = schema?.endpoints?.length || 0
  const relationshipCount = schema?.relationships?.length || 0

  // Format schema as JSON string
  const schemaJson = schema ? JSON.stringify(schema, null, 2) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" open={open} className="sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasSchema ? 'bg-green-500/10' : 'bg-muted'}`}>
              <FileJson className={`h-5 w-5 ${hasSchema ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <SheetTitle>OpenAPI Schema</SheetTitle>
              <SheetDescription>
                {hasSchema
                  ? 'Your API specification for generating fixtures'
                  : 'Upload your OpenAPI specification'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {hasSchema ? (
            <>
              {/* Status */}
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-600/30">
                  <Check className="h-3 w-3" />
                  Loaded
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30 text-center">
                  <p className="text-2xl font-semibold">{modelCount}</p>
                  <p className="text-xs text-muted-foreground">Models</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 text-center">
                  <p className="text-2xl font-semibold">{endpointCount}</p>
                  <p className="text-xs text-muted-foreground">Endpoints</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 text-center">
                  <p className="text-2xl font-semibold">{relationshipCount}</p>
                  <p className="text-xs text-muted-foreground">Relationships</p>
                </div>
              </div>

              {/* Schema code block (collapsed by default) */}
              {schemaJson && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full text-left p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <p className="text-sm font-medium">
                        Schema Definition
                      </p>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2">
                      <pre className="p-4 rounded-lg border bg-zinc-950 text-zinc-100 text-xs font-mono overflow-auto max-h-[300px]">
                        <code>{schemaJson}</code>
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Replace schema option */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-left p-3 rounded-lg border border-dashed hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Replace with a new schema
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3">
                    <SpecUploader onSchemaLoaded={handleSchemaLoaded} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : (
            // No schema - show uploader prominently
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload your OpenAPI specification to enable fixture generation.
                DemoKit uses your schema to understand your data models and generate
                realistic demo data.
              </p>
              <SpecUploader onSchemaLoaded={handleSchemaLoaded} />
            </div>
          )}
        </div>

        <SheetFooter className="border-t">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            {hasSchema ? 'Done' : 'Cancel'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
