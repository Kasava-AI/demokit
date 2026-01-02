/**
 * PreviewSection Component
 *
 * Collapsible section for displaying fixture data preview in table or code view.
 */

import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChevronIcon, IconButton, ActionButton } from "./icons";
import { CodeView } from "./CodeView";
import { DataView } from "./DataView";
import { FORMAT_OPTIONS } from "./utils";
import type { ExportFormat, PreviewSubMode, DemoData, DemoNarrative } from "./types";

export interface PreviewSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalRecords: number;
  previewSubMode: PreviewSubMode;
  setPreviewSubMode: (mode: PreviewSubMode) => void;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  modelNames: string[];
  selectedCsvModel?: string;
  setSelectedCsvModel: (model: string) => void;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  data: DemoData;
  code?: string;
  narrative?: DemoNarrative;
  expandedModels: Set<string>;
  onToggleModel: (model: string) => void;
  getFormattedModelContent: (format: ExportFormat, modelName: string) => string;
  // Editing
  editable?: boolean;
  isDirty?: boolean;
  canUndo?: boolean;
  onUndo?: () => void;
  onReset?: () => void;
  onFieldChange?: (model: string, index: number, field: string, value: unknown) => void;
  onDeleteRecord?: (model: string, index: number) => void;
  onDuplicateRecord?: (model: string, index: number) => void;
  onAddRecord?: (model: string) => void;
}

export function PreviewSection({
  open,
  onOpenChange,
  totalRecords,
  previewSubMode,
  setPreviewSubMode,
  exportFormat,
  setExportFormat,
  modelNames,
  selectedCsvModel,
  setSelectedCsvModel,
  copied,
  onCopy,
  onDownload,
  data,
  code,
  narrative,
  expandedModels,
  onToggleModel,
  getFormattedModelContent,
  editable = false,
  isDirty = false,
  canUndo = false,
  onUndo,
  onReset,
  onFieldChange,
  onDeleteRecord,
  onDuplicateRecord,
  onAddRecord,
}: PreviewSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ChevronIcon open={open} />
              <h3 className="text-sm font-medium text-foreground">Preview</h3>
              <span className="text-xs text-muted-foreground">
                ({totalRecords} {totalRecords === 1 ? "record" : "records"})
              </span>
            </button>
          </CollapsibleTrigger>

          {/* Table/Code toggle - only show when open */}
          {open && (
            <div className="flex items-center gap-2">
              <div
                className="inline-flex rounded-md border border-border overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    previewSubMode === "table"
                      ? "bg-muted text-foreground"
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setPreviewSubMode("table")}
                >
                  Table
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-border ${
                    previewSubMode === "code"
                      ? "bg-muted text-foreground"
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setPreviewSubMode("code")}
                >
                  Code
                </button>
              </div>
            </div>
          )}
        </div>

        <CollapsibleContent>
          <div className="border-t border-border">
            {/* Preview controls */}
            <PreviewControls
              previewSubMode={previewSubMode}
              editable={editable}
              isDirty={isDirty}
              canUndo={canUndo}
              onUndo={onUndo}
              onReset={onReset}
              exportFormat={exportFormat}
              setExportFormat={setExportFormat}
              modelNames={modelNames}
              selectedCsvModel={selectedCsvModel}
              setSelectedCsvModel={setSelectedCsvModel}
              copied={copied}
              onCopy={onCopy}
              onDownload={onDownload}
            />

            {/* Preview content */}
            <div className="p-4">
              {previewSubMode === "code" ? (
                <CodeView
                  code={code}
                  data={data}
                  format={exportFormat}
                  narrative={narrative}
                  selectedModel={selectedCsvModel}
                />
              ) : (
                <DataView
                  data={data}
                  expandedModels={expandedModels}
                  onToggleModel={onToggleModel}
                  editable={editable}
                  onFieldChange={onFieldChange}
                  onDeleteRecord={onDeleteRecord}
                  onDuplicateRecord={onDuplicateRecord}
                  onAddRecord={onAddRecord}
                  getFormattedContent={getFormattedModelContent}
                />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface PreviewControlsProps {
  previewSubMode: PreviewSubMode;
  editable: boolean;
  isDirty: boolean;
  canUndo: boolean;
  onUndo?: () => void;
  onReset?: () => void;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  modelNames: string[];
  selectedCsvModel?: string;
  setSelectedCsvModel: (model: string) => void;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}

function PreviewControls({
  previewSubMode,
  editable,
  isDirty,
  canUndo,
  onUndo,
  onReset,
  exportFormat,
  setExportFormat,
  modelNames,
  selectedCsvModel,
  setSelectedCsvModel,
  copied,
  onCopy,
  onDownload,
}: PreviewControlsProps) {
  const showControls =
    previewSubMode === "code" ||
    (editable && previewSubMode === "table" && (canUndo || isDirty));

  if (!showControls) return null;

  return (
    <div className="flex items-center justify-end gap-2 px-4 py-2 bg-background border-b border-border">
      {/* Edit mode actions - only in table sub-mode */}
      {editable && previewSubMode === "table" && (
        <>
          {onUndo && (
            <ActionButton onClick={onUndo} icon="undo" disabled={!canUndo}>
              Undo
            </ActionButton>
          )}
          {onReset && isDirty && (
            <ActionButton onClick={onReset} icon="reset">
              Reset
            </ActionButton>
          )}
        </>
      )}

      {/* Export Format Selector - only in code sub-mode */}
      {previewSubMode === "code" && (
        <>
          <select
            value={exportFormat}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExportFormat(e.target.value as ExportFormat)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground"
          >
            {FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* CSV Model Selector (only shown for CSV format) */}
          {exportFormat === "csv" && modelNames.length > 0 && (
            <select
              value={selectedCsvModel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCsvModel(e.target.value)}
              className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground"
            >
              {modelNames.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
          )}

          <TooltipProvider delayDuration={300}>
            <IconButton
              onClick={onCopy}
              icon={copied ? "check" : "copy"}
              tooltip={copied ? "Copied!" : "Copy"}
              testId="copy-button"
            />
            <IconButton
              onClick={onDownload}
              icon="download"
              tooltip="Download"
              testId="download-button"
            />
          </TooltipProvider>
        </>
      )}
    </div>
  );
}
