import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FixtureDetail } from '@/components/fixtures'
import type { FixtureWithRelations } from '@/hooks/use-fixtures'
import type { ValidationResult } from '@demokit-ai/core'

interface SelectedFixturePreviewProps {
  fixture: FixtureWithRelations
  projectId: string
  projectName: string
  validation: ValidationResult | undefined
  onNameChange: (newName: string) => void
  onRegenerate: () => void
  onClearSelection: () => void
  onDelete: () => void
}

export function SelectedFixturePreview({
  fixture,
  projectId,
  projectName,
  validation,
  onNameChange,
  onRegenerate,
  onClearSelection,
  onDelete,
}: SelectedFixturePreviewProps) {
  if (!fixture.activeGeneration) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No generation data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This fixture doesn&apos;t have any generated data yet.
        </p>
        <Button onClick={onClearSelection}>
          Create New Fixture
        </Button>
      </div>
    )
  }

  const gen = fixture.activeGeneration
  return (
    <FixtureDetail
      projectId={projectId}
      fixtureId={fixture.id}
      name={fixture.name}
      onNameChange={onNameChange}
      description={fixture.description || undefined}
      data={gen.data as Record<string, Record<string, unknown>[]>}
      code={gen.code || undefined}
      validation={validation}
      narrative={fixture.description ? { scenario: fixture.description, keyPoints: [] } : undefined}
      projectName={projectName}
      onRegenerate={onRegenerate}
      saving={false}
      createdAt={fixture.createdAt}
      createdBy={fixture.createdBy ? {
        fullName: fixture.createdBy.fullName || undefined,
        email: fixture.createdBy.email,
      } : undefined}
      templateName={fixture.template?.name}
      onDuplicate={() => {}}
      onDelete={onDelete}
    />
  )
}
