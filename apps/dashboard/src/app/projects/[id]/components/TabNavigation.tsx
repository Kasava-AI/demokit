import { AnimatedTabsList, AnimatedTabsTrigger } from "@/components/ui/tabs";

export type ProjectTab = "overview" | "fixtures" | "generation-rules" | "integrations";

interface TabNavigationProps {
  activeTab: ProjectTab;
  fixturesCount: number;
  hasSchema?: boolean;
  hasIntelligence?: boolean;
  isRegenerating?: boolean;
  onCreateFixture?: () => void;
  onRegenerateAI?: () => void;
  onViewSchema?: () => void;
}

export function TabNavigation({
  activeTab,
  fixturesCount,
}: TabNavigationProps) {
  return (
    <div className="border-b px-4">
      <div className="relative flex items-center h-12">
        {/* Centered tabs */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <AnimatedTabsList
            variant="underline"
            layoutId="project-tabs"
            className="h-12"
          >
            <AnimatedTabsTrigger
              value="overview"
              variant="underline"
              isActive={activeTab === "overview"}
              layoutId="project-tab-indicator"
            >
              Overview
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger
              value="fixtures"
              variant="underline"
              isActive={activeTab === "fixtures"}
              layoutId="project-tab-indicator"
            >
              Fixtures
              {fixturesCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({fixturesCount})
                </span>
              )}
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger
              value="generation-rules"
              variant="underline"
              isActive={activeTab === "generation-rules"}
              layoutId="project-tab-indicator"
            >
              Generation Rules
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger
              value="integrations"
              variant="underline"
              isActive={activeTab === "integrations"}
              layoutId="project-tab-indicator"
            >
              Integrations
            </AnimatedTabsTrigger>
          </AnimatedTabsList>
        </div>
      </div>
    </div>
  );
}
