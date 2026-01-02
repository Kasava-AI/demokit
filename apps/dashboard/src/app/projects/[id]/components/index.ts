/**
 * Project Page Components
 *
 * These components implement the progressive disclosure UI for the DemoKit
 * project page. They're designed to reveal complexity only when needed.
 */

// Types and utilities
export * from './types'
export { transformToIntelligence } from './transform-intelligence'
export { useGeneration } from './use-generation'

// Layout components
export { HistorySidebar } from './HistorySidebar'

// State components
export { ProjectLoadingState } from './ProjectLoadingState'
export { ProjectErrorState } from './ProjectErrorState'

// Header components
export { ProjectHeaderActions, ProjectBackButton } from './ProjectHeader'

// Tab components
export { TabNavigation, type ProjectTab } from './TabNavigation'
export { OverviewTab } from './OverviewTab'
export { FixturesTab } from './FixturesTab'
export { GenerationRulesTabWrapper } from './GenerationRulesTabWrapper'
export { IntegrationsTab } from './IntegrationsTab'

// Fixture components
export { FixtureCreationFlow } from './FixtureCreationFlow'
export { SelectedFixturePreview } from './SelectedFixturePreview'

// Dialog components
export { RegenerationDialog } from './RegenerationDialog'
export { ProjectSettingsSheet } from './ProjectSettingsSheet'

// Progressive disclosure components
export { NoSchemaPrompt } from './NoSchemaPrompt'
export { TemplateSection } from './TemplateSection'
export { NarrativeSection } from './NarrativeSection'
export { RecordCountsInline } from './RecordCountsInline'
export { GenerateButton, getMissingRequirements } from './GenerateButton'
export type { MissingRequirement } from './GenerateButton'
export { FixturesSidebar } from './FixturesSidebar'

// Overview components
export { ProductOverview } from './overview'
