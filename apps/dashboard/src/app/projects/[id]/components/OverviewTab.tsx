'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TabsContent } from '@/components/ui/tabs'
import { ProductOverview, AddSourceDialog, EditSourceDialog, SchemaUploadSheet } from './overview'
import { DemoComposer, type DemoComposerOutput } from './demos/DemoComposer'
import type { ProjectWithRelations, ProjectSource } from '@/lib/api-client/projects'
import type { Feature } from './overview/FeaturesPreview'
import { useStreamIntelligence } from '@/hooks/use-stream-intelligence'
import { useCreateDemo, useCreateDemoVariant } from '@/hooks/use-demos'
import type { DemokitSchema } from './types'

interface OverviewTabProps {
  project: ProjectWithRelations
  isLoading?: boolean
  onRegenerationStart?: () => void
}

export function OverviewTab({
  project,
  isLoading = false,
  onRegenerationStart,
}: OverviewTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const projectId = project.id

  // Dialog state
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [editSourceOpen, setEditSourceOpen] = useState(false)
  const [schemaSheetOpen, setSchemaSheetOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<ProjectSource | null>(null)
  const [demoComposerOpen, setDemoComposerOpen] = useState(false)
  const [preselectedFeatureIds, setPreselectedFeatureIds] = useState<string[]>([])

  // Demo creation mutations
  const createDemo = useCreateDemo()
  const createDemoVariant = useCreateDemoVariant()

  // Schema state
  const schema = useMemo(() => {
    if (project?.schema) {
      return project.schema as unknown as DemokitSchema
    }
    return undefined
  }, [project?.schema])

  // Intelligence regeneration hook
  const {
    isStreaming: isRegenerating,
    start: startRegeneration,
  } = useStreamIntelligence({ projectId })

  // Handlers
  const handleCreateFixture = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'fixtures')
    params.delete('fixture') // Clear fixture selection to show creation flow
    router.replace(`/projects/${projectId}?${params.toString()}`, { scroll: false })
  }, [router, projectId, searchParams])

  const handleRegenerateAI = useCallback(async () => {
    if (!project?.schema) return

    // Notify parent to open dialog if callback provided
    onRegenerationStart?.()

    try {
      await startRegeneration({
        schema: project.schema as Record<string, unknown>,
      })
    } catch (error) {
      console.error('Regeneration failed:', error)
    }
  }, [project?.schema, startRegeneration, onRegenerationStart])

  const handleViewSchema = useCallback(() => {
    setSchemaSheetOpen(true)
  }, [])

  // Navigate to fixtures tab with template pre-selected for fixture creation
  const handleCreateFromTemplate = useCallback((templateId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'fixtures')
    params.delete('fixture') // Clear fixture selection to show creation flow
    params.set('template', templateId) // Pre-select template
    router.replace(`/projects/${projectId}?${params.toString()}`, { scroll: false })
  }, [router, projectId, searchParams])

  // View all scenarios (could navigate to a dedicated page or expand all)
  const handleViewScenarios = useCallback(() => {
    // For now, just scroll to the scenarios section or could open a modal
    // Could be expanded to navigate to a dedicated scenarios page
    console.log('View all scenarios')
  }, [])

  // Navigate to fixtures tab with specific fixture selected
  const handleViewFixture = useCallback((fixtureId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'fixtures')
    params.set('fixture', fixtureId)
    router.replace(`/projects/${projectId}?${params.toString()}`, { scroll: false })
  }, [router, projectId, searchParams])

  const handleAddSource = useCallback(() => {
    setAddSourceOpen(true)
  }, [])

  const handleEditSource = useCallback((source: ProjectSource) => {
    setSelectedSource(source)
    setEditSourceOpen(true)
  }, [])

  const handleSourceSuccess = useCallback(() => {
    // Invalidate project query to refresh sources
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
  }, [queryClient, projectId])

  // Handle "Create Demo from Selected Features" action
  const handleCreateDemoFromFeatures = useCallback((selectedFeatures: Feature[]) => {
    setPreselectedFeatureIds(selectedFeatures.map((f) => f.id))
    setDemoComposerOpen(true)
  }, [])

  // Handle DemoComposer submission
  const handleDemoComposerSubmit = useCallback(async (data: DemoComposerOutput) => {
    try {
      // Create the demo (starts as draft, isPublished defaults to false)
      const demo = await createDemo.mutateAsync({
        projectId,
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          category: data.category,
          tags: data.tags,
          baseJourneyId: data.baseJourneyId,
          persona: data.persona,
          goal: data.goal,
          constraints: data.constraints,
          storyNotes: data.storyNotes,
          customSteps: data.customSteps.length > 0 ? data.customSteps : undefined,
          selectedFeatureIds: data.selectedFeatureIds,
        },
      })

      // Create the initial variant
      await createDemoVariant.mutateAsync({
        projectId,
        demoId: demo.id,
        data: {
          name: data.variant.name,
          slug: data.variant.slug,
          generationParams: data.variant.generationParams,
          isDefault: true,
        },
      })

      toast.success('Demo created successfully', {
        description: `${data.name} is ready. Generate fixture data to complete setup.`,
      })

      // Close composer and reset state
      setDemoComposerOpen(false)
      setPreselectedFeatureIds([])

      // Invalidate demos query
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'demos'] })
    } catch (error) {
      console.error('Failed to create demo:', error)
      toast.error('Failed to create demo', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  }, [projectId, createDemo, createDemoVariant, queryClient])

  // Transform user journeys for DemoComposer
  const journeysForComposer = useMemo(() => {
    return project.userJourneys.map((j) => ({
      ...j,
      steps: (j.steps as Array<{
        order: number
        action: string
        description?: string
        endpoint?: string
        model?: string
        featuresUsed?: string[]
      }>) || null,
    }))
  }, [project.userJourneys])

  return (
    <TabsContent value="overview" className="flex-1 overflow-y-auto overflow-x-hidden mt-0">
      <div className="max-w-4xl mx-auto px-4 py-8 w-full">
        <ProductOverview
          project={project}
          schema={schema}
          sources={project.sources}
          onCreateFixture={handleCreateFixture}
          onCreateFromTemplate={handleCreateFromTemplate}
          onViewFixture={handleViewFixture}
          onRegenerateAI={handleRegenerateAI}
          onViewSchema={handleViewSchema}
          onViewScenarios={handleViewScenarios}
          onAddSource={handleAddSource}
          onEditSource={handleEditSource}
          onCreateDemoFromFeatures={handleCreateDemoFromFeatures}
          isRegenerating={isRegenerating}
          loading={isLoading}
        />
      </div>

      {/* Add Source Dialog */}
      <AddSourceDialog
        projectId={projectId}
        open={addSourceOpen}
        onOpenChange={setAddSourceOpen}
        existingSources={project.sources}
        onSuccess={handleSourceSuccess}
      />

      {/* Edit Source Dialog */}
      <EditSourceDialog
        projectId={projectId}
        source={selectedSource}
        open={editSourceOpen}
        onOpenChange={setEditSourceOpen}
        onSuccess={handleSourceSuccess}
      />

      {/* Schema Upload Sheet */}
      <SchemaUploadSheet
        projectId={projectId}
        schema={schema}
        open={schemaSheetOpen}
        onOpenChange={setSchemaSheetOpen}
      />

      {/* Demo Composer */}
      <DemoComposer
        open={demoComposerOpen}
        onOpenChange={setDemoComposerOpen}
        projectId={projectId}
        features={project.features}
        journeys={journeysForComposer}
        onSubmit={handleDemoComposerSubmit}
        isSubmitting={createDemo.isPending || createDemoVariant.isPending}
        initialSelectedFeatureIds={preselectedFeatureIds}
      />
    </TabsContent>
  )
}
