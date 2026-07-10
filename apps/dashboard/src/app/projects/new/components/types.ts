/**
 * Shared types for the new project wizard
 *
 * Flow: connect → confirm → generate → complete
 * - connect:  point DemoKit at the app (OpenAPI spec and/or website URL)
 * - confirm:  confirm the derived name/description while analysis streams
 * - generate: pick narrative templates and generate demo data immediately
 * - complete: personalized quick start with the generated fixtures
 */

import type { ParseSchemaResult } from '@/app/actions/parse-schema'
import type { SourceInputsValue } from '@/components/spec/SourceInputs'
import type { AppIntelligence } from '@intelligence'

// Use the schema type from the parse action to avoid @demokit-ai/core webpack issues
export type DemokitSchema = NonNullable<ParseSchemaResult['schema']>

export type WizardStep = 'connect' | 'confirm' | 'generate' | 'complete'

export interface ProjectData {
  /** Derived from the spec title / analysis; editable on the confirm step */
  name: string
  /** Once the user types a name themselves, derived values stop overwriting it */
  nameEdited: boolean
  description: string
  descriptionEdited: boolean
  schema?: DemokitSchema
  schemaContent?: string
  sources: SourceInputsValue
  intelligence?: AppIntelligence
  /** Templates the user kept selected on the generate step */
  selectedTemplateIds: string[]
}

/** One fixture generated during the wizard */
export interface GeneratedFixtureSummary {
  fixtureId: string
  fixtureName: string
  totalRecords: number
  recordsByModel: Record<string, number>
  /** Generated TypeScript fixture module from the L2 generator */
  code?: string
}

/** Everything the complete step needs about what was created */
export interface WizardResult {
  projectId: string
  fixtures: GeneratedFixtureSummary[]
}

export interface StepProps {
  data: ProjectData
  onUpdate: (updates: Partial<ProjectData>) => void
  onNext: () => void
  onBack: () => void
}

export const STEP_ORDER: WizardStep[] = ['connect', 'confirm', 'generate', 'complete']

export const STEP_LABELS: Record<WizardStep, string> = {
  connect: 'Connect your app',
  confirm: 'Confirm details',
  generate: 'Demo data',
  complete: 'Done',
}

export function getStepIndex(step: WizardStep): number {
  return STEP_ORDER.indexOf(step)
}
