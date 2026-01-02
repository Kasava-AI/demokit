'use client'

/**
 * NoSchemaPrompt Component
 *
 * Empty state shown when no schema is loaded.
 * Provides a button to open the schema upload sheet.
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Database, Upload, FileJson } from 'lucide-react'

interface NoSchemaPromptProps {
  onUploadSchema: () => void
}

export function NoSchemaPrompt({ onUploadSchema }: NoSchemaPromptProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="rounded-full bg-muted p-4 mb-6">
          <Database className="w-8 h-8 text-muted-foreground" />
        </div>

        <h2 className="text-xl font-semibold mb-2">
          Upload your API schema to get started
        </h2>

        <p className="text-muted-foreground mb-6 max-w-md">
          DemoKit needs your OpenAPI specification to understand your data models
          and generate realistic demo fixtures.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={onUploadSchema} size="lg" className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Upload Schema
          </Button>

          <p className="text-xs text-muted-foreground">
            Supports OpenAPI 3.0+ (YAML or JSON)
          </p>
        </div>

        {/* Supported formats hint */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t w-full max-w-sm justify-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileJson className="w-4 h-4" />
            <span>.json</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileJson className="w-4 h-4" />
            <span>.yaml</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileJson className="w-4 h-4" />
            <span>.yml</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
