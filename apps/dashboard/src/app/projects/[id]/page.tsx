'use client'

/**
 * Project Detail Page (Redesigned with Tabs)
 *
 * Layout: Tab-based navigation between Overview and Fixtures views
 *
 * Tabs:
 * - Overview: Product summary, stats, data sources, features, journeys
 * - Fixtures: Left sidebar with fixtures list + Right content area for creation/viewing
 *
 * Right panel behavior (Fixtures tab):
 * - No fixture selected → Show "create new" workflow (templates → narrative → generate)
 * - Fixture selected → Show PreviewSection with saved fixture data
 */

import { useState, useCallback, use, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProject } from '@/hooks/use-projects'
import { useFixtures } from '@/hooks/use-fixtures'
import { useStreamIntelligence } from '@/hooks/use-stream-intelligence'

import { AppLayout } from '@/components/layout'
import { Tabs } from '@/components/ui/tabs'

import {
  type DemokitSchema,
  type ProjectTab,
  transformToIntelligence,
  ProjectLoadingState,
  ProjectErrorState,
  ProjectHeaderActions,
  ProjectBackButton,
  TabNavigation,
  OverviewTab,
  FixturesTab,
  GenerationRulesTabWrapper,
  IntegrationsTab,
  RegenerationDialog,
  ProjectSettingsSheet,
} from './components'
import { SchemaUploadSheet } from './components/overview'

interface ProjectPageProps {
  params: Promise<{ id: string }>
  /**
   * Optional custom FixturesTab component for deployments that need
   * custom functionality (e.g., Cloud billing).
   */
  FixturesTabComponent?: typeof FixturesTab
}

export default function ProjectPage({ params, FixturesTabComponent }: ProjectPageProps) {
  // Use custom component if provided, otherwise use default
  const FixturesTabToRender = FixturesTabComponent || FixturesTab
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get tab from URL
  const tabFromUrl = (searchParams.get('tab') as ProjectTab) || 'overview'

  // Fetch project data with related entities
  const { data: project, isLoading, error } = useProject(id)
  const { data: fixtures = [] } = useFixtures(id)

  // Transform to intelligence format for components
  const intelligence = useMemo(() => transformToIntelligence(project), [project])

  // Core state
  const [activeTab, setActiveTab] = useState<ProjectTab>(tabFromUrl)

  // Schema derived state
  const schema = useMemo(() => {
    if (project?.schema) {
      return project.schema as unknown as DemokitSchema
    }
    return undefined
  }, [project?.schema])
  const hasSchema = !!schema

  // Intelligence regeneration hook
  const {
    status: regenerationStatus,
    phase: regenerationPhase,
    progress: regenerationProgress,
    message: regenerationMessage,
    error: regenerationError,
    isStreaming: isRegenerating,
    start: startRegeneration,
    cancel: cancelRegeneration,
  } = useStreamIntelligence({ projectId: id })

  const [regenerationDialogOpen, setRegenerationDialogOpen] = useState(false)
  const [schemaSheetOpen, setSchemaSheetOpen] = useState(false)
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false)

  // Helper to update URL params
  const updateUrlParams = useCallback((tab: ProjectTab, fixtureId?: string | null) => {
    const params = new URLSearchParams()
    if (tab !== 'overview') {
      params.set('tab', tab)
    }
    if (fixtureId) {
      params.set('fixture', fixtureId)
    }
    const queryString = params.toString()
    router.replace(`/projects/${id}${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }, [router, id])

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    const newTab = tab as ProjectTab
    setActiveTab(newTab)
    // Preserve fixture param only when switching to fixtures tab
    const fixtureId = newTab === 'fixtures' ? searchParams.get('fixture') : null
    updateUrlParams(newTab, fixtureId)
  }, [updateUrlParams, searchParams])

  // Sync tab state with URL
  useEffect(() => {
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  // Handlers for header actions
  const handleRegenerateIntelligence = useCallback(async () => {
    if (!project?.schema) return

    setRegenerationDialogOpen(true)

    try {
      await startRegeneration({
        schema: project.schema as Record<string, unknown>,
      })
    } catch (error) {
      console.error('Regeneration failed:', error)
    }
  }, [project?.schema, startRegeneration])

  // Navigate to fixtures tab and create new
  const handleCreateFixture = useCallback(() => {
    setActiveTab('fixtures')
    updateUrlParams('fixtures', null)
  }, [updateUrlParams])

  // Open schema sheet for viewing/uploading
  const handleViewSchema = useCallback(() => {
    setSchemaSheetOpen(true)
  }, [])

  // Handle regeneration start from child components
  const handleRegenerationStart = useCallback(() => {
    setRegenerationDialogOpen(true)
  }, [])

  // Open settings sheet
  const handleOpenSettings = useCallback(() => {
    setSettingsSheetOpen(true)
  }, [])

  // Loading state
  if (isLoading) {
    return <ProjectLoadingState />
  }

  // Error state
  if (error || !project) {
    return <ProjectErrorState error={error} />
  }

  return (
    <AppLayout
      backButton={<ProjectBackButton />}
      title={project.name}
      status={project.status}
      subtitle={project.description || undefined}
      headerActions={
        <ProjectHeaderActions
          projectId={id}
          hasSchema={hasSchema}
          isRegenerating={isRegenerating}
          isGenerating={false}
          onRegenerateIntelligence={handleRegenerateIntelligence}
          onOpenSettings={handleOpenSettings}
        />
      }
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
        <TabNavigation
          activeTab={activeTab}
          fixturesCount={fixtures.length}
          hasSchema={hasSchema}
          hasIntelligence={!!intelligence}
          isRegenerating={isRegenerating}
          onCreateFixture={handleCreateFixture}
          onRegenerateAI={handleRegenerateIntelligence}
          onViewSchema={handleViewSchema}
        />

        <OverviewTab
          project={project}
          isLoading={isLoading}
          onRegenerationStart={handleRegenerationStart}
        />

        <FixturesTabToRender
          project={project}
        />

        <GenerationRulesTabWrapper
          project={project}
        />

        <IntegrationsTab
          project={project}
        />
      </Tabs>

      <RegenerationDialog
        open={regenerationDialogOpen}
        onOpenChange={setRegenerationDialogOpen}
        status={regenerationStatus}
        phase={regenerationPhase}
        progress={regenerationProgress}
        message={regenerationMessage}
        error={regenerationError}
        isRegenerating={isRegenerating}
        onCancel={cancelRegeneration}
        onRetry={handleRegenerateIntelligence}
      />

      <SchemaUploadSheet
        projectId={id}
        schema={schema}
        open={schemaSheetOpen}
        onOpenChange={setSchemaSheetOpen}
      />

      <ProjectSettingsSheet
        projectId={id}
        projectName={project.name}
        open={settingsSheetOpen}
        onOpenChange={setSettingsSheetOpen}
      />
    </AppLayout>
  )
}
