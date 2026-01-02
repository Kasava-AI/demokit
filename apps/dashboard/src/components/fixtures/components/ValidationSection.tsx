/**
 * ValidationSection Component
 *
 * Collapsible section for displaying validation results.
 */

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronIcon } from "./icons";
import { ValidationView } from "./ValidationView";
import type { ValidationResult } from "./types";

export interface ValidationSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validation?: ValidationResult;
  onRevalidate?: () => void;
}

export function ValidationSection({
  open,
  onOpenChange,
  validation,
  onRevalidate,
}: ValidationSectionProps) {
  const errorCount = validation?.errors.length || 0;
  const warningCount = validation?.warnings.length || 0;

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
              <h3 className="text-sm font-medium text-foreground">Validation</h3>
              <ValidationIndicator
                errorCount={errorCount}
                warningCount={warningCount}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border p-4">
            <ValidationView validation={validation} onRevalidate={onRevalidate} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ValidationIndicator({
  errorCount,
  warningCount,
}: {
  errorCount: number;
  warningCount: number;
}) {
  if (errorCount > 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
        {errorCount}
      </span>
    );
  }

  if (warningCount > 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning">
        {warningCount}
      </span>
    );
  }

  return (
    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
