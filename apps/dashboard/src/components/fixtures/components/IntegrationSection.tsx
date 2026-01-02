/**
 * IntegrationSection Component
 *
 * Collapsible section for displaying integration guide.
 */

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { IntegrationGuide } from "@/components/export";
import { ChevronIcon } from "./icons";
import type { DemoData } from "./types";

export interface IntegrationSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DemoData;
  projectName?: string;
}

export function IntegrationSection({
  open,
  onOpenChange,
  data,
  projectName,
}: IntegrationSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <ChevronIcon open={open} />
              <h3 className="text-sm font-medium text-foreground">
                Integration Guide
              </h3>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border p-4">
            <IntegrationGuide mode="local" data={data} projectName={projectName} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
