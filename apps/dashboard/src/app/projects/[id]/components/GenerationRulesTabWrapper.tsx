'use client'

/**
 * GenerationRulesTabWrapper Component
 *
 * Tab content wrapper for the Generation Rules configuration.
 * Handles loading rules from project settings and saving changes back.
 */

import { useState, useMemo, useCallback } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import { GenerationRulesTab } from './generation-rules'
import { useUpdateProject } from '@/hooks/use-projects'
import type { ProjectWithRelations } from '@/lib/api-client/projects'
import type { DemokitSchema } from './types'

// Column types that can be inferred or selected
type ColumnType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'url' | 'email'

// Local type definitions matching the codegen types
interface Dataset {
  id: string
  name: string
  columns: string[]
  columnTypes?: ColumnType[]
  rows: string[][]
  createdAt: string
  description?: string
}

interface GenerationRulesConfig {
  version: 1
  fieldRules: Record<string, FieldRule>
  datasets?: Record<string, Dataset>
}

type FieldRule =
  | { type: 'string'; strategy: 'oneOf' | 'pattern'; values?: string[]; pattern?: string }
  | { type: 'number'; strategy: 'range' | 'fixed'; min?: number; max?: number; precision?: number; value?: number }
  | { type: 'integer'; strategy: 'range' | 'fixed'; min?: number; max?: number; value?: number }
  | { type: 'boolean'; strategy: 'fixed' | 'weighted'; value?: boolean; trueProbability?: number }
  | { type: 'enum'; strategy: 'subset' | 'weighted'; allowedValues?: string[]; weights?: Record<string, number> }
  | { type: 'array'; minItems?: number; maxItems?: number; uniqueItems?: boolean }
  | { type: 'fromDataset'; datasetId: string; column: string }

interface GenerationRulesTabWrapperProps {
  project: ProjectWithRelations
}

export function GenerationRulesTabWrapper({ project }: GenerationRulesTabWrapperProps) {
  // Extract schema from project
  const schema = useMemo(() => {
    if (project?.schema) {
      return project.schema as unknown as DemokitSchema
    }
    return undefined
  }, [project?.schema])

  // Extract generation rules from project settings
  const [generationRules, setGenerationRules] = useState<GenerationRulesConfig | undefined>(() => {
    const settings = project.settings as Record<string, unknown> | null
    if (settings?.generationRules) {
      return settings.generationRules as GenerationRulesConfig
    }
    return undefined
  })

  // Mutation for updating project settings
  const updateProject = useUpdateProject()

  // Handle rules change - update local state and persist to backend
  const handleRulesChange = useCallback((newRules: GenerationRulesConfig) => {
    setGenerationRules(newRules)

    // Persist to project settings
    const currentSettings = (project.settings as Record<string, unknown>) ?? {}
    updateProject.mutate({
      id: project.id,
      data: {
        settings: {
          ...currentSettings,
          generationRules: newRules,
        },
      },
    })
  }, [project.id, project.settings, updateProject])

  return (
    <TabsContent value="generation-rules" className="flex-1 overflow-y-auto mt-0">
      <div className="max-w-4xl mx-auto px-8 py-6">
        <GenerationRulesTab
          schema={schema}
          generationRules={generationRules}
          onRulesChange={handleRulesChange}
        />
      </div>
    </TabsContent>
  )
}
