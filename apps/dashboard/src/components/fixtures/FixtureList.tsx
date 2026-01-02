/**
 * FixtureList Component
 *
 * Displays a list of fixtures for a project with management capabilities.
 * Features:
 * - Grid layout of fixture cards
 * - Loading and empty states
 * - Delete, duplicate, and export actions
 * - Selection for viewing in FixtureDetail
 */

import { useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Database, Plus } from 'lucide-react'
import { FixtureCard } from './FixtureCard'
import {
  useFixtures,
  useDeleteFixture,
  useCreateFixture,
  useCreateGeneration,
  type FixtureWithRelations,
} from '@/hooks/use-fixtures'
import { formatAsJSON, formatAsTypeScript } from '@demokit-ai/core'

interface FixtureListProps {
  projectId: string
  selectedFixtureId?: string
  onSelectFixture?: (fixture: FixtureWithRelations | null) => void
  onCreateFixture?: () => void
}

export function FixtureList({
  projectId,
  selectedFixtureId,
  onSelectFixture,
  onCreateFixture,
}: FixtureListProps) {
  const { data: fixtures, isLoading, error } = useFixtures(projectId)
  const deleteFixture = useDeleteFixture()
  const createFixture = useCreateFixture()
  const createGeneration = useCreateGeneration()

  const deletingId = useMemo(() => {
    if (deleteFixture.isPending && deleteFixture.variables) {
      return deleteFixture.variables.fixtureId
    }
    return null
  }, [deleteFixture.isPending, deleteFixture.variables])

  const handleDelete = useCallback(
    async (fixtureId: string) => {
      try {
        await deleteFixture.mutateAsync({ projectId, fixtureId })
        // If we deleted the selected fixture, clear selection
        if (selectedFixtureId === fixtureId) {
          onSelectFixture?.(null)
        }
      } catch (error) {
        console.error('Failed to delete fixture:', error)
      }
    },
    [projectId, deleteFixture, selectedFixtureId, onSelectFixture]
  )

  const handleDuplicate = useCallback(
    async (fixture: FixtureWithRelations) => {
      const sourceGeneration = fixture.activeGeneration
      if (!sourceGeneration?.data) return

      try {
        // Create the new fixture
        const newFixture = await createFixture.mutateAsync({
          projectId,
          data: {
            name: `${fixture.name} (Copy)`,
            description: fixture.description || undefined,
            templateId: fixture.templateId || undefined,
          },
        })

        // Copy the generation data to the new fixture
        await createGeneration.mutateAsync({
          projectId,
          fixtureId: newFixture.id,
          data: {
            label: sourceGeneration.label || undefined,
            level: sourceGeneration.level,
            data: sourceGeneration.data as Record<string, unknown[]>,
            code: sourceGeneration.code || undefined,
            validationValid: sourceGeneration.validationValid ?? false,
            validationErrorCount: sourceGeneration.validationErrorCount,
            validationWarningCount: sourceGeneration.validationWarningCount,
            validationErrors: sourceGeneration.validationErrors || undefined,
            recordCount: sourceGeneration.recordCount || undefined,
            recordsByModel: sourceGeneration.recordsByModel || undefined,
          },
        })

        // Select the new fixture
        onSelectFixture?.(newFixture as FixtureWithRelations)
      } catch (error) {
        console.error('Failed to duplicate fixture:', error)
      }
    },
    [projectId, createFixture, createGeneration, onSelectFixture]
  )

  const handleExport = useCallback(
    (fixture: FixtureWithRelations, format: 'json' | 'typescript') => {
      const generation = fixture.activeGeneration
      if (!generation?.data) return

      let content: string
      let extension: string
      let mimeType: string

      // Cast to correct type for formatters
      const demoData = generation.data as Record<string, Record<string, unknown>[]>

      if (format === 'json') {
        content = formatAsJSON(demoData, { indent: 2 })
        extension = 'json'
        mimeType = 'application/json'
      } else {
        content = formatAsTypeScript(demoData, { asConst: true })
        extension = 'ts'
        mimeType = 'text/typescript'
      }

      // Create download
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fixture.name.toLowerCase().replace(/\s+/g, '-')}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    []
  )

  const handleSelect = useCallback(
    (fixture: FixtureWithRelations) => {
      // Toggle selection if clicking the same fixture
      if (selectedFixtureId === fixture.id) {
        onSelectFixture?.(null)
      } else {
        onSelectFixture?.(fixture)
      }
    },
    [selectedFixtureId, onSelectFixture]
  )

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Loading fixtures...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-destructive mb-2">Failed to load fixtures</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!fixtures || fixtures.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Database className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No fixtures yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Generate your first fixture by configuring a narrative and clicking
              Generate, then save it for later use.
            </p>
            {onCreateFixture && (
              <Button onClick={onCreateFixture}>
                <Plus className="w-4 h-4 mr-2" />
                Generate First Fixture
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Saved Fixtures</CardTitle>
            <CardDescription>
              {fixtures.length} fixture{fixtures.length !== 1 ? 's' : ''} saved
            </CardDescription>
          </div>
          {onCreateFixture && (
            <Button size="sm" variant="outline" onClick={onCreateFixture}>
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3">
          {fixtures.map((fixture) => (
            <FixtureCard
              key={fixture.id}
              fixture={fixture}
              isSelected={selectedFixtureId === fixture.id}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onExport={handleExport}
              deleting={deletingId === fixture.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
