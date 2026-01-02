'use client'

/**
 * IntegrationsTab Component
 *
 * Contains two integration methods as sub-tabs:
 * 1. Local (Bundled) - Bundle fixtures directly in the app
 * 2. Remote (API) - Fetch fixtures from DemoKit Cloud API
 */

import { useState, useMemo } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { IntegrationGuide } from '@/components/export/IntegrationGuide'
import { useFixtures } from '@/hooks/use-fixtures'
import type { ProjectWithRelations } from '@/lib/api-client/projects'
import { Package, Cloud } from 'lucide-react'

type IntegrationSubTab = 'local' | 'remote'

interface IntegrationsTabProps {
  project: ProjectWithRelations
}

export function IntegrationsTab({ project }: IntegrationsTabProps) {
  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<IntegrationSubTab>('local')

  // Fetch fixtures with full relations (includes activeGeneration)
  const { data: fixtures = [] } = useFixtures(project.id)

  // Selected fixture state - default to project's active fixture or first available
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | undefined>(
    project.activeFixture?.id || fixtures[0]?.id
  )

  // Get the selected fixture
  const selectedFixture = useMemo(() => {
    return fixtures.find((f) => f.id === selectedFixtureId) || fixtures[0]
  }, [fixtures, selectedFixtureId])

  // Get data from selected fixture for local integration guide
  const selectedFixtureData = useMemo(() => {
    if (selectedFixture?.activeGeneration?.data) {
      return selectedFixture.activeGeneration.data as Record<
        string,
        Record<string, unknown>[]
      >
    }
    return null
  }, [selectedFixture])

  const hasFixtures = fixtures.length > 0

  return (
    <TabsContent value="integrations" className="flex-1 overflow-y-auto mt-0 w-full">
      <Tabs
        value={activeSubTab}
        onValueChange={(v) => setActiveSubTab(v as IntegrationSubTab)}
      >
        {/* Sub-tab navigation with fixture selector */}
        <div className="border-b px-8 pt-4 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <TabsList className="h-auto p-0 bg-transparent gap-6">
              <TabsTrigger
                value="local"
                className="px-0 pb-3 pt-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Package className="h-4 w-4 mr-2" />
                Local (Bundled)
              </TabsTrigger>
              <TabsTrigger
                value="remote"
                className="px-0 pb-3 pt-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Remote (API)
              </TabsTrigger>
            </TabsList>

            {/* Fixture Selector */}
            {hasFixtures && (
              <div className="flex items-center gap-2 pb-3">
                <span className="text-sm text-muted-foreground">Fixture:</span>
                <Select
                  value={selectedFixtureId}
                  onValueChange={setSelectedFixtureId}
                >
                  <SelectTrigger className="w-48 h-8">
                    <SelectValue placeholder="Select fixture" />
                  </SelectTrigger>
                  <SelectContent>
                    {fixtures.map((fixture) => (
                      <SelectItem key={fixture.id} value={fixture.id}>
                        {fixture.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Local Integration Content */}
        <TabsContent value="local" className="mt-0">
          <div className="px-8 py-6">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Bundle fixtures directly in your app. Data is included in your build.
              </p>
            </div>

            {selectedFixtureData ? (
              <IntegrationGuide
                mode="local"
                data={selectedFixtureData}
                projectName={project.name}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Create a fixture with generated data to see integration instructions.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Remote Integration Content */}
        <TabsContent value="remote" className="mt-0">
          <div className="px-8 py-6">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Fetch fixtures from DemoKit Cloud at runtime. Update data without redeploying.
              </p>
            </div>

            {hasFixtures && selectedFixture ? (
              <IntegrationGuide
                mode="remote"
                projectId={project.id}
                fixtures={[selectedFixture]}
                projectName={project.name}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Create a fixture with generated data to enable the hosted API.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </TabsContent>
  )
}
