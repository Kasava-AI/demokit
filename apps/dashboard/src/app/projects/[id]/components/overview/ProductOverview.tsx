/**
 * ProductOverview Component
 *
 * Main overview page for a DemoKit project.
 * Displays product summary, stats, data sources, features, journeys, and quick actions.
 * Also shows the active fixture and integration guide.
 */

import { useMemo } from "react";
import type {
  ProjectWithRelations,
  ProjectSource,
} from "@/lib/api-client/projects";
import type { DemokitSchema } from "../types";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ProductSummaryCard } from "./ProductSummaryCard";
import { DataSourcesGrid } from "./DataSourcesGrid";
import { FeaturesPreview } from "./FeaturesPreview";
import { DemoScenariosPreview } from "./DemoScenariosPreview";
import { EntityOverview } from "./EntityOverview";

interface ProductOverviewProps {
  project: ProjectWithRelations;
  schema?: DemokitSchema | null;
  sources?: ProjectSource[];
  onCreateFixture: () => void;
  onCreateFromTemplate?: (templateId: string) => void;
  onViewFixture?: (fixtureId: string) => void;
  onRegenerateAI?: () => void;
  onViewSchema: () => void;
  onViewFeatures?: () => void;
  onViewScenarios?: () => void;
  onViewFixtures?: () => void;
  onAddSource?: () => void;
  onEditSource?: (source: ProjectSource) => void;
  onSetActiveFixture?: (fixtureId: string | null) => void;
  isSettingActiveFixture?: boolean;
  isRegenerating?: boolean;
  loading?: boolean;
  /** Callback to create demo from selected features */
  onCreateDemoFromFeatures?: (selectedFeatures: import('./FeaturesPreview').Feature[]) => void;
}

export function ProductOverview({
  project,
  schema,
  sources = [],
  onCreateFixture,
  onCreateFromTemplate,
  onViewFixture,
  onRegenerateAI,
  onViewSchema,
  onViewFeatures,
  onViewScenarios,
  onViewFixtures,
  onAddSource,
  onEditSource,
  onSetActiveFixture,
  isSettingActiveFixture = false,
  isRegenerating = false,
  loading = false,
  onCreateDemoFromFeatures,
}: ProductOverviewProps) {
  // Extract schema stats
  const schemaStats = useMemo(() => {
    if (!schema) return null;
    return {
      modelCount: Object.keys(schema.models || {}).length,
      endpointCount: schema.endpoints?.length || 0,
      relationshipCount: schema.relationships?.length || 0,
    };
  }, [schema]);

  // Extract model names and relationships for entity overview
  const entityData = useMemo(() => {
    if (!schema) return { models: [], relationships: [] };
    return {
      models: Object.keys(schema.models || {}),
      relationships: (schema.relationships || []).map((r) => ({
        source: r.from.model,
        target: r.to.model,
        type: r.type as
          | "one-to-one"
          | "one-to-many"
          | "many-to-one"
          | "many-to-many",
      })),
    };
  }, [schema]);

  // Transform user journeys to have proper types
  const userJourneys = useMemo(() => {
    return project.userJourneys.map((j) => ({
      ...j,
      steps:
        (j.steps as Array<{
          order: number;
          action: string;
          description: string;
          endpoint?: string;
          model?: string;
        }>) || null,
    }));
  }, [project.userJourneys]);

  // Join templates with their linked journeys for the unified DemoScenarios view
  const templatesWithJourneys = useMemo(() => {
    return project.templates.map((template) => {
      // Find linked journey by matching template name pattern or metadata
      // Templates often have names like "Sarah's First Purchase Journey" matching journey names
      const linkedJourney = userJourneys.find((j) => {
        // Check if template has metadata linking to a journey
        const metadata = template.metadata as { journeyId?: string } | null;
        if (metadata?.journeyId && metadata.journeyId === j.id) {
          return true;
        }
        // Fallback: match by similar name patterns
        const templateNameLower = template.name.toLowerCase();
        const journeyNameLower = j.name.toLowerCase();
        return (
          templateNameLower.includes(journeyNameLower) ||
          journeyNameLower.includes(templateNameLower)
        );
      });

      return {
        ...template,
        journey: linkedJourney || null,
      };
    });
  }, [project.templates, userJourneys]);

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header with Quick Actions */}
      <div className="flex items-start justify-between gap-4 w-full min-w-0">
        <div className="flex-1 min-w-0">
          {/* Product Summary - App identity + Active Fixture */}
          <ProductSummaryCard
            projectName={project.name}
            projectDescription={project.description}
            appIdentity={project.appIdentity}
            analysisSummary={{
              featureCount: project.features.length,
              journeyCount: project.userJourneys.length,
              templateCount: project.templates.length,
              analyzedAt: project.analyzedAt,
            }}
            activeFixture={project.activeFixture}
            fixtures={project.fixtures.map((f) => ({
              id: f.id,
              name: f.name,
              recordCount: f.recordCount,
            }))}
            onSetActiveFixture={onSetActiveFixture}
            onCreateFixture={onCreateFixture}
            onViewFixtures={onViewFixtures}
            isSettingActiveFixture={isSettingActiveFixture}
            loading={loading}
          />
        </div>
      </div>

      {/* Tabbed Section: Data Sources, Features, Entities */}
      <Tabs defaultValue="sources" className="w-full">
        <TabsList variant="underline" className="w-full justify-start mb-4">
          <TabsTrigger variant="underline" value="sources">
            Data Sources
            {sources.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({sources.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="features">
            Detected Features
            {project.features.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({project.features.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="entities">
            Entity Overview
            {entityData.models.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({entityData.models.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="scenarios">
            Demo Scenarios
            {templatesWithJourneys.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({templatesWithJourneys.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-0">
          <DataSourcesGrid
            projectId={project.id}
            sources={sources}
            schema={
              schemaStats
                ? {
                    version: project.schemaVersion,
                    modelCount: schemaStats.modelCount,
                    endpointCount: schemaStats.endpointCount,
                    rawSchema: schema,
                  }
                : null
            }
            onAddSource={onAddSource}
            onEditSource={onEditSource}
            onViewSchema={onViewSchema}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="features" className="mt-0">
          <FeaturesPreview
            features={project.features}
            maxVisible={12}
            onViewAll={onViewFeatures}
            loading={loading}
            onCreateDemoFromSelected={onCreateDemoFromFeatures}
          />
        </TabsContent>

        <TabsContent value="entities" className="mt-0">
          <EntityOverview
            models={entityData.models}
            relationships={entityData.relationships}
            modelSchemas={schema?.models}
            maxVisible={12}
            onViewSchema={onViewSchema}
            projectId={project.id}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="scenarios" className="mt-0">
          <DemoScenariosPreview
            templates={templatesWithJourneys}
            fixtures={project.fixtures}
            maxVisible={12}
            onViewAll={onViewScenarios}
            onCreateFromTemplate={onCreateFromTemplate}
            onViewFixture={onViewFixture}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
}
