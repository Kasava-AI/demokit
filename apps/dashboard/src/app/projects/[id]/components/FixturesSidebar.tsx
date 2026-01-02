"use client";

/**
 * FixturesSidebar Component
 *
 * Left sidebar showing saved fixtures with:
 * - "New Fixture" button at top
 * - Scrollable list of fixture cards
 * - Selection highlighting
 * - Empty state when no fixtures exist
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import {
  useFixtures,
  useDeleteFixture,
  useCreateFixture,
  useCreateGeneration,
  type FixtureWithRelations,
} from "@/hooks/use-fixtures";
import { useSetActiveFixture } from "@/hooks/use-projects";
import { formatAsJSON, formatAsTypeScript } from "@demokit-ai/core";
import { Loader2, Database, Plus } from "lucide-react";

interface FixturesSidebarProps {
  projectId: string;
  selectedFixtureId?: string | null;
  activeFixtureId?: string | null;
  onSelectFixture: (fixture: FixtureWithRelations | null) => void;
  onCreateNew: () => void;
}

export function FixturesSidebar({
  projectId,
  selectedFixtureId,
  activeFixtureId,
  onSelectFixture,
  onCreateNew,
}: FixturesSidebarProps) {
  const { data: fixtures, isLoading, error } = useFixtures(projectId);
  const deleteFixture = useDeleteFixture();
  const createFixture = useCreateFixture();
  const createGeneration = useCreateGeneration();
  const setActiveFixture = useSetActiveFixture();

  const handleDelete = useCallback(
    async (fixtureId: string) => {
      try {
        await deleteFixture.mutateAsync({ projectId, fixtureId });
        toast.success("Fixture deleted");
        if (selectedFixtureId === fixtureId) {
          onSelectFixture(null);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete fixture"
        );
      }
    },
    [projectId, deleteFixture, selectedFixtureId, onSelectFixture]
  );

  const handleDuplicate = useCallback(
    async (fixture: FixtureWithRelations) => {
      const sourceGeneration = fixture.activeGeneration;
      if (!sourceGeneration?.data) return;

      try {
        const newFixture = await createFixture.mutateAsync({
          projectId,
          data: {
            name: `${fixture.name} (Copy)`,
            description: fixture.description || undefined,
            templateId: fixture.templateId || undefined,
          },
        });

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
        });

        toast.success(`Duplicated as "${fixture.name} (Copy)"`);
        onSelectFixture(newFixture as FixtureWithRelations);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to duplicate fixture"
        );
      }
    },
    [projectId, createFixture, createGeneration, onSelectFixture]
  );

  const handleExport = useCallback(
    (fixture: FixtureWithRelations, format: "json" | "typescript") => {
      const generation = fixture.activeGeneration;
      if (!generation?.data) return;

      let content: string;
      let extension: string;
      let mimeType: string;

      const demoData = generation.data as Record<
        string,
        Record<string, unknown>[]
      >;

      if (format === "json") {
        content = formatAsJSON(demoData, { indent: 2 });
        extension = "json";
        mimeType = "application/json";
      } else {
        content = formatAsTypeScript(demoData, { asConst: true });
        extension = "ts";
        mimeType = "text/typescript";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fixture.name
        .toLowerCase()
        .replace(/\s+/g, "-")}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported as ${format.toUpperCase()}`);
    },
    []
  );

  const handleSelect = useCallback(
    (fixture: FixtureWithRelations) => {
      onSelectFixture(fixture);
    },
    [onSelectFixture]
  );

  const handleSetActive = useCallback(
    async (fixture: FixtureWithRelations) => {
      try {
        await setActiveFixture.mutateAsync({
          projectId,
          fixtureId: fixture.id,
        });
        toast.success(`"${fixture.name}" set as active fixture`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to set active fixture"
        );
      }
    },
    [projectId, setActiveFixture]
  );

  const handleCreateNewClick = useCallback(() => {
    onSelectFixture(null);
    onCreateNew();
  }, [onSelectFixture, onCreateNew]);

  const deletingId = deleteFixture.isPending
    ? deleteFixture.variables?.fixtureId
    : null;

  return (
    <div className="h-full flex flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="p-4 border-b">
        <Button
          onClick={handleCreateNewClick}
          size="sm"
          className="w-full"
          variant={selectedFixtureId === null ? "default" : "outline"}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Fixture
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm text-destructive mb-1">Failed to load</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!fixtures || fixtures.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Database className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No fixtures yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate and save your first fixture
            </p>
          </div>
        )}

        {/* Fixtures list */}
        {!isLoading && !error && fixtures && fixtures.length > 0 && (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {fixtures.map((fixture) => (
                <FixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  isSelected={selectedFixtureId === fixture.id}
                  isActive={activeFixtureId === fixture.id}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onExport={handleExport}
                  onSetActive={handleSetActive}
                  deleting={deletingId === fixture.id}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
