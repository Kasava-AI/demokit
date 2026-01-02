/**
 * Shared types for the new project wizard
 */

import type { ParseSchemaResult } from '@/app/actions/parse-schema'
import type { SourceInputsValue } from '@/components/spec/SourceInputs'
import type { AppIntelligence } from '@intelligence'

// Use the schema type from the parse action to avoid @demokit-ai/core webpack issues
export type DemokitSchema = NonNullable<ParseSchemaResult['schema']>

export type WizardStep = 'basics' | 'spec' | 'sources' | 'intelligence' | 'review' | 'complete'

export interface ProjectData {
  name: string
  description: string
  projectKey: string
  schema?: DemokitSchema
  schemaContent?: string
  sources: SourceInputsValue
  intelligence?: AppIntelligence
  selectedTemplates: string[]
  selectedFeatures: string[]
}

export interface StepProps {
  data: ProjectData
  onUpdate: (updates: Partial<ProjectData>) => void
  onNext: () => void
  onBack: () => void
}

export const STEP_ORDER: WizardStep[] = ['basics', 'spec', 'sources', 'intelligence', 'review', 'complete']

export const STEP_LABELS: Record<WizardStep, string> = {
  basics: 'Project Info',
  spec: 'API Schema',
  sources: 'Sources',
  intelligence: 'Analysis',
  review: 'Review',
  complete: 'Complete',
}

export function getStepIndex(step: WizardStep): number {
  return STEP_ORDER.indexOf(step)
}

export function generateProjectKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'proj_'
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
