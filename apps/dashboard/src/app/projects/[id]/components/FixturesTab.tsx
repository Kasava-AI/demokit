"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TabsContent } from "@/components/ui/tabs";
import type { DemoNarrative } from "@demokit-ai/core";
import { validateData } from "@demokit-ai/core";
import type { DynamicNarrativeTemplate } from "@intelligence";
import {
  useFixtures,
  useFixture,
  useCreateFixture,
  useCreateGeneration,
  useUpdateFixture,
} from "@/hooks/use-fixtures";
import type { ProjectWithRelations } from "@/lib/api-client/projects";
import {
  FixturesSidebar,
  NoSchemaPrompt,
  transformToIntelligence,
  useGeneration,
  getMissingRequirements,
} from ".";
import { FixtureCreationFlow, type BillingProps } from "./FixtureCreationFlow";
import { SelectedFixturePreview } from "./SelectedFixturePreview";
import { SchemaUploadSheet } from "./overview";
import type { DemokitSchema } from "./types";

interface FixturesTabProps {
  project: ProjectWithRelations;
  /** Optional billing props for Cloud deployments */
  billing?: BillingProps;
}

export function FixturesTab({ project, billing }: FixturesTabProps) {
  const projectId = project.id;
  const projectName = project.name;

  // Quote ID for billing (Cloud only)
  const [quoteId, setQuoteId] = useState<string | undefined>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get fixture ID from URL
  const fixtureIdFromUrl = searchParams.get("fixture");

  // Track if user explicitly wants to create a new fixture (prevents auto-selection)
  const isCreatingNewRef = useRef(false);

  // Transform project to intelligence format
  const intelligence = useMemo(
    () => transformToIntelligence(project),
    [project]
  );
  const templates = intelligence?.templates ?? [];

  // Schema state
  const [schema, setSchema] = useState<DemokitSchema | undefined>(() => {
    if (project?.schema) {
      return project.schema as unknown as DemokitSchema;
    }
    return undefined;
  });
  const hasSchema = !!schema;

  // Record counts state
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>(
    () => {
      const defaultCounts: Record<string, number> = {};
      if (schema) {
        Object.keys(schema.models || {}).forEach((model) => {
          defaultCounts[model] = 5;
        });
      }
      return defaultCounts;
    }
  );

  // Template and narrative state
  const [selectedTemplate, setSelectedTemplate] = useState<
    DynamicNarrativeTemplate | undefined
  >();
  const [narrative, setNarrative] = useState<DemoNarrative>({
    scenario: "",
    keyPoints: [],
  });
  const [showNarrativeWithoutTemplate, setShowNarrativeWithoutTemplate] =
    useState(false);
  const [savedFixtureName, setSavedFixtureName] = useState<
    string | undefined
  >();

  // Schema upload sheet state
  const [schemaSheetOpen, setSchemaSheetOpen] = useState(false);

  // Fetch fixtures list
  const { data: fixtures = [] } = useFixtures(projectId);

  // Fetch selected fixture with fresh data
  const { data: selectedSavedFixture } = useFixture(
    projectId,
    fixtureIdFromUrl ?? "",
    { enabled: !!fixtureIdFromUrl }
  );

  // Mutations
  const createFixture = useCreateFixture();
  const createGeneration = useCreateGeneration();
  const updateFixture = useUpdateFixture();

  // Extract generation rules from project settings
  const generationRules = useMemo(() => {
    const settings = project.settings as Record<string, unknown> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return settings?.generationRules as any;
  }, [project.settings]);

  // Generation hook
  const { generation, setLevel, handleGenerate, handleCancelGeneration } =
    useGeneration({
      projectId,
      selectedTemplate,
      schema,
      recordCounts,
      generationRules,
      quoteId,
    });

  // Derived state for progressive disclosure
  const hasTemplate = !!selectedTemplate;
  const hasNarrative = (narrative.scenario?.trim().length ?? 0) > 0;
  const showNarrative =
    hasTemplate || showNarrativeWithoutTemplate || hasNarrative;
  const canGenerate = hasSchema && hasNarrative;
  const hasGenerated = generation.status === "success" && !!generation.data;
  const isGenerating =
    generation.status === "generating" || generation.status === "validating";

  // Get missing requirements for the generate button
  const missingRequirements = useMemo(() => {
    return getMissingRequirements({
      hasSchema,
      hasTemplate,
      hasNarrative,
    });
  }, [hasSchema, hasTemplate, hasNarrative]);

  // Update schema state when project loads
  useEffect(() => {
    if (project?.schema && !schema) {
      const projectSchema = project.schema as unknown as DemokitSchema;
      setSchema(projectSchema);
      const newCounts: Record<string, number> = {};
      Object.keys(projectSchema.models || {}).forEach((model) => {
        newCounts[model] = 5;
      });
      setRecordCounts(newCounts);
    }
  }, [project?.schema, schema]);

  // Auto-revalidate saved fixture data when schema is available
  const savedFixtureValidation = useMemo(() => {
    const gen = selectedSavedFixture?.activeGeneration;
    if (!gen?.data || !schema) return undefined;

    const data = gen.data as Record<string, Record<string, unknown>[]>;
    return validateData(data, { schema, collectWarnings: true });
  }, [selectedSavedFixture?.activeGeneration, schema]);

  // Helper to update fixture in URL
  const updateFixtureUrl = useCallback(
    (fixtureId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (fixtureId) {
        params.set("fixture", fixtureId);
      } else {
        params.delete("fixture");
      }
      // Preserve the tab param
      if (!params.has("tab")) {
        params.set("tab", "fixtures");
      }
      const queryString = params.toString();
      router.replace(
        `/projects/${projectId}${queryString ? `?${queryString}` : ""}`,
        { scroll: false }
      );
    },
    [router, projectId, searchParams]
  );

  // Auto-select first fixture when tab is active and no fixture is selected
  // (but not when user explicitly clicked "New Fixture")
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (
      currentTab === "fixtures" &&
      !fixtureIdFromUrl &&
      fixtures.length > 0 &&
      !isCreatingNewRef.current
    ) {
      updateFixtureUrl(fixtures[0].id);
    }
  }, [searchParams, fixtureIdFromUrl, fixtures, updateFixtureUrl]);

  // Handlers
  const handleTemplateSelect = useCallback(
    (template: DynamicNarrativeTemplate) => {
      setSelectedTemplate(template);
      setNarrative({
        scenario: template.narrative.scenario,
        keyPoints: template.narrative.keyPoints,
      });
      if (template.suggestedCounts) {
        setRecordCounts((prev) => ({
          ...prev,
          ...template.suggestedCounts,
        }));
      }
      setShowNarrativeWithoutTemplate(false);
    },
    []
  );

  const handleTemplateClear = useCallback(() => {
    setSelectedTemplate(undefined);
  }, []);

  const handleStartFromScratch = useCallback(() => {
    setShowNarrativeWithoutTemplate(true);
    setSelectedTemplate(undefined);
  }, []);

  const handleGeneration = useCallback((newQuoteId?: string) => {
    setSavedFixtureName(undefined);
    // Update quoteId if provided (from billing flow)
    if (newQuoteId) {
      setQuoteId(newQuoteId);
    }
    handleGenerate(narrative);
  }, [handleGenerate, narrative]);

  const handleSaveFixture = useCallback(
    async (name: string) => {
      if (!generation.data) return;

      try {
        const fixture = await createFixture.mutateAsync({
          projectId,
          data: {
            name,
            description: narrative.scenario || undefined,
            templateId: selectedTemplate?.id,
          },
        });

        await createGeneration.mutateAsync({
          projectId,
          fixtureId: fixture.id,
          data: {
            level: "narrative-driven",
            data: generation.data as Record<string, unknown[]>,
            code: generation.code || undefined,
            validationValid: generation.validation?.valid ?? false,
            validationErrorCount: generation.validation?.errors?.length ?? 0,
            validationWarningCount:
              generation.validation?.warnings?.length ?? 0,
            validationErrors: generation.validation?.errors?.map((e) => ({
              type: e.type,
              model: e.model,
              field: e.field,
              message: e.message,
            })),
            recordCount: generation.validation?.stats?.totalRecords,
            recordsByModel: generation.validation?.stats?.recordsByModel,
            durationMs: generation.validation?.stats?.durationMs,
          },
        });

        setSavedFixtureName(name);
      } catch (error) {
        throw error;
      }
    },
    [
      projectId,
      generation,
      narrative.scenario,
      selectedTemplate,
      createFixture,
      createGeneration,
    ]
  );

  const handleSelectSavedFixture = useCallback(
    (fixture: { id: string } | null) => {
      // User selected a fixture, so they're no longer in "create new" mode
      isCreatingNewRef.current = false;
      updateFixtureUrl(fixture?.id ?? null);
    },
    [updateFixtureUrl]
  );

  const handleClearFixtureSelection = useCallback(() => {
    // User clicked "New Fixture", prevent auto-selection from overriding
    isCreatingNewRef.current = true;
    updateFixtureUrl(null);
    setShowNarrativeWithoutTemplate(false);
  }, [updateFixtureUrl]);

  const handleFixtureNameChange = useCallback(
    (newName: string) => {
      if (!selectedSavedFixture) return;
      updateFixture.mutate({
        projectId,
        fixtureId: selectedSavedFixture.id,
        data: { name: newName },
      });
    },
    [projectId, selectedSavedFixture, updateFixture]
  );

  const handleDeleteFixture = useCallback(() => {
    updateFixtureUrl(null);
  }, [updateFixtureUrl]);

  const handleOpenSchemaSheet = useCallback(() => {
    setSchemaSheetOpen(true);
  }, []);

  const isSaving = createFixture.isPending || createGeneration.isPending;

  return (
    <TabsContent value="fixtures" className="flex-1 overflow-hidden mt-0">
      <div className="flex h-full">
        {/* Left Sidebar - Fixtures List */}
        <div className="w-80 flex-shrink-0 border-r">
          <FixturesSidebar
            projectId={projectId}
            selectedFixtureId={fixtureIdFromUrl}
            activeFixtureId={project.activeFixtureId}
            onSelectFixture={handleSelectSavedFixture}
            onCreateNew={handleClearFixtureSelection}
          />
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {selectedSavedFixture ? (
              <SelectedFixturePreview
                fixture={selectedSavedFixture}
                projectId={projectId}
                projectName={projectName}
                validation={savedFixtureValidation}
                onNameChange={handleFixtureNameChange}
                onRegenerate={handleGeneration}
                onClearSelection={handleClearFixtureSelection}
                onDelete={handleDeleteFixture}
              />
            ) : (
              <>
                {!hasSchema ? (
                  <NoSchemaPrompt onUploadSchema={handleOpenSchemaSheet} />
                ) : schema ? (
                  <FixtureCreationFlow
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    onTemplateSelect={handleTemplateSelect}
                    onTemplateClear={handleTemplateClear}
                    onStartFromScratch={handleStartFromScratch}
                    narrative={narrative}
                    onNarrativeChange={setNarrative}
                    showNarrative={showNarrative}
                    schema={schema}
                    recordCounts={recordCounts}
                    onRecordCountsChange={setRecordCounts}
                    generation={generation}
                    canGenerate={canGenerate}
                    hasNarrative={hasNarrative}
                    hasGenerated={hasGenerated}
                    isGenerating={isGenerating}
                    missingRequirements={missingRequirements}
                    onGenerate={handleGeneration}
                    onCancelGeneration={handleCancelGeneration}
                    projectName={projectName}
                    onSaveFixture={handleSaveFixture}
                    isSaving={isSaving}
                    savedFixtureName={savedFixtureName}
                    onLevelChange={setLevel}
                    billing={billing}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Schema Upload Sheet */}
      <SchemaUploadSheet
        projectId={projectId}
        schema={schema}
        open={schemaSheetOpen}
        onOpenChange={setSchemaSheetOpen}
      />
    </TabsContent>
  );
}
