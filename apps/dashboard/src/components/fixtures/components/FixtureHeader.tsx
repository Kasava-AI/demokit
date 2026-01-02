/**
 * FixtureHeader Component
 *
 * Displays the header section with fixture name, metadata, and action buttons.
 */

import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Database,
  Calendar,
  User,
  MoreHorizontal,
  Copy,
  Download,
  FileCode,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "./icons";
import { EditableTitle } from "./EditableTitle";
import { formatRelativeTime } from "./utils";
import type { DemoNarrative, ValidationResult } from "./types";

export interface FixtureHeaderProps {
  name?: string;
  onNameChange?: (name: string) => void;
  description?: string;
  createdAt?: string;
  createdBy?: { fullName?: string; email: string };
  templateName?: string;
  totalRecords: number;
  validation?: ValidationResult;
  narrative?: DemoNarrative;
  isDirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onSaveWithName?: (name: string) => Promise<void>;
  savedFixtureName?: string;
  onOpenSaveDialog?: () => void;
  onRegenerate?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onDownload: () => void;
  onExportTypeScript: () => void;
}

export function FixtureHeader({
  name,
  onNameChange,
  description,
  createdAt,
  createdBy,
  templateName,
  totalRecords,
  validation,
  narrative,
  isDirty = false,
  saving = false,
  onSave,
  onSaveWithName,
  savedFixtureName,
  onOpenSaveDialog,
  onRegenerate,
  onDuplicate,
  onDelete,
  onDownload,
  onExportTypeScript,
}: FixtureHeaderProps) {
  const errorCount = validation?.errors.length || 0;
  const warningCount = validation?.warnings.length || 0;

  return (
    <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-background">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <EditableTitle name={name} onNameChange={onNameChange} />
            <ValidationBadge errorCount={errorCount} warningCount={warningCount} />
            {isDirty && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning">
                Unsaved
              </span>
            )}
          </div>

          {(narrative?.scenario || description) && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {narrative?.scenario || description}
            </p>
          )}

          <MetadataRow
            totalRecords={totalRecords}
            createdAt={createdAt}
            createdBy={createdBy}
            templateName={templateName}
          />
        </div>

        <HeaderActions
          saving={saving}
          onSave={onSave}
          onSaveWithName={onSaveWithName}
          savedFixtureName={savedFixtureName}
          onOpenSaveDialog={onOpenSaveDialog}
          onRegenerate={onRegenerate}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onDownload={onDownload}
          onExportTypeScript={onExportTypeScript}
        />
      </div>
    </div>
  );
}

function ValidationBadge({ errorCount, warningCount }: { errorCount: number; warningCount: number }) {
  if (errorCount > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
        {errorCount} {errorCount === 1 ? "error" : "errors"}
      </span>
    );
  }

  if (warningCount > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning">
        {warningCount} {warningCount === 1 ? "warning" : "warnings"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Valid
    </span>
  );
}

function MetadataRow({
  totalRecords,
  createdAt,
  createdBy,
  templateName,
}: {
  totalRecords: number;
  createdAt?: string;
  createdBy?: { fullName?: string; email: string };
  templateName?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
      {totalRecords > 0 && (
        <span className="inline-flex items-center gap-1">
          <Database className="w-3 h-3" />
          {totalRecords} records
        </span>
      )}
      {createdAt && (
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatRelativeTime(createdAt)}
        </span>
      )}
      {createdBy && (
        <span className="inline-flex items-center gap-1">
          <User className="w-3 h-3" />
          {createdBy.fullName || createdBy.email}
        </span>
      )}
      {templateName && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-foreground font-medium">
          {templateName}
        </span>
      )}
    </div>
  );
}

function HeaderActions({
  saving,
  onSave,
  onSaveWithName,
  savedFixtureName,
  onOpenSaveDialog,
  onRegenerate,
  onDuplicate,
  onDelete,
  onDownload,
  onExportTypeScript,
}: {
  saving: boolean;
  onSave?: () => void;
  onSaveWithName?: (name: string) => Promise<void>;
  savedFixtureName?: string;
  onOpenSaveDialog?: () => void;
  onRegenerate?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onDownload: () => void;
  onExportTypeScript: () => void;
}) {
  return (
    <div className="flex items-center gap-2 ml-4">
      <TooltipProvider delayDuration={300}>
        {onSave && !onSaveWithName && (
          <IconButton
            onClick={onSave}
            icon={saving ? "spinner" : "save"}
            tooltip={saving ? "Saving..." : "Save"}
            disabled={saving}
            testId="save-button"
          />
        )}
        {onSaveWithName && !savedFixtureName && onOpenSaveDialog && (
          <IconButton
            onClick={onOpenSaveDialog}
            icon={saving ? "spinner" : "save"}
            tooltip={saving ? "Saving..." : "Save Fixture"}
            disabled={saving}
            testId="save-button"
          />
        )}
        {onRegenerate && (
          <IconButton onClick={onRegenerate} icon="refresh" tooltip="Regenerate" testId="regenerate-button" />
        )}
      </TooltipProvider>

      {(onDuplicate || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportTypeScript}>
              <FileCode className="w-4 h-4 mr-2" />
              Export TypeScript
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
