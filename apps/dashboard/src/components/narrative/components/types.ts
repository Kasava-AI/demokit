/**
 * Shared types for NarrativeEditor component
 */

import type { DemoNarrative, Character, TimelineEvent, MetricTarget } from '@demokit-ai/core'
import type { DynamicNarrativeTemplate } from '@intelligence'

export interface NarrativeEditorProps {
  value?: DemoNarrative
  onChange?: (narrative: DemoNarrative) => void
  onGenerate?: (narrative: DemoNarrative) => void
  disabled?: boolean
  /** Optional templates for quick-start selection */
  templates?: DynamicNarrativeTemplate[]
  /** Currently selected template (controlled) */
  selectedTemplate?: DynamicNarrativeTemplate
  /** Callback when a template is selected */
  onTemplateSelect?: (template: DynamicNarrativeTemplate | undefined) => void
}

/** Number of templates to show before "View all" */
export const TEMPLATES_VISIBLE_COUNT = 4

export { type DemoNarrative, type Character, type TimelineEvent, type MetricTarget, type DynamicNarrativeTemplate }
