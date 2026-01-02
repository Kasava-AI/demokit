/**
 * Shared types for the project detail page
 */

import type { ParseSchemaResult } from '@/app/actions/parse-schema'
import type { DemoNarrative, AppContext, DemoData, ValidationResult, GenerationLevel } from '@demokit-ai/core'
import type { DynamicNarrativeTemplate } from '@intelligence'

// Use the schema type from the parse action to avoid @demokit-ai/core webpack issues
export type DemokitSchema = NonNullable<ParseSchemaResult['schema']>

export type Tab = 'narrative' | 'templates' | 'context' | 'schema'

export type GenerationStatus = 'idle' | 'generating' | 'validating' | 'retrying' | 'success' | 'error'

export interface GenerationState {
  status: GenerationStatus
  data?: DemoData
  code?: string
  validation?: ValidationResult
  level: GenerationLevel
  attempt?: number
  errors?: string[]
}

export interface ProjectPageState {
  activeTab: Tab
  narrative: DemoNarrative
  appContext: AppContext
  generation: GenerationState
  selectedTemplate?: DynamicNarrativeTemplate
  schema?: DemokitSchema
  recordCounts: Record<string, number>
}

export { type DemoNarrative, type AppContext, type DemoData, type ValidationResult, type GenerationLevel }
