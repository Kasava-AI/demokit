/**
 * FixtureDetail Component
 *
 * Displays a complete fixture overview with collapsible sections:
 * - Fixture name and description header
 * - Data preview (table or code view) - collapsible
 * - Validation results - collapsible
 * - Integration guide - collapsible
 */

import { useState, useMemo, useCallback } from "react";
import {
  formatAsTypeScript,
  formatAsJSON,
  formatAsSQL,
  formatAsCSV,
} from "@demokit-ai/core";
import {
  type PreviewSubMode,
  type ExportFormat,
  type FixtureDetailProps,
  FORMAT_OPTIONS,
} from "./components";
import { FixtureHeader } from "./components/FixtureHeader";
import { PreviewSection } from "./components/PreviewSection";
import { ValidationSection } from "./components/ValidationSection";
import { IntegrationSection } from "./components/IntegrationSection";
import { MappingsSection } from "./components/MappingsSection";
import { SaveDialog } from "./components/SaveDialog";
import { LoadingState, EmptyState } from "./components/LoadingState";
import { toast } from "sonner";

export function FixtureDetail({
  projectId,
  fixtureId,
  name,
  onNameChange,
  description,
  createdAt,
  createdBy,
  templateName,
  data,
  code,
  validation,
  format: initialFormat = "typescript",
  loading = false,
  saving = false,
  onRegenerate,
  onRevalidate,
  onExport,
  onSave,
  onSaveWithName,
  savedFixtureName,
  onDuplicate,
  onDelete,
  narrative,
  projectName,
  editable = false,
  isDirty = false,
  onFieldChange,
  onDeleteRecord,
  onDuplicateRecord,
  onAddRecord,
  onUndo,
  canUndo = false,
  onReset,
}: FixtureDetailProps) {
  const [previewSubMode, setPreviewSubMode] = useState<PreviewSubMode>("table");
  const [exportFormat, setExportFormat] = useState<ExportFormat>(initialFormat);
  const [selectedCsvModel, setSelectedCsvModel] = useState<string>();
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Section collapse state
  const [previewOpen, setPreviewOpen] = useState(true);
  const [validationOpen, setValidationOpen] = useState(true);
  const [mappingsOpen, setMappingsOpen] = useState(true);
  const [integrationOpen, setIntegrationOpen] = useState(true);

  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [fixtureName, setFixtureName] = useState("");
  const [isSavingWithName, setIsSavingWithName] = useState(false);

  // Get available models for CSV export
  const modelNames = useMemo(() => {
    return data ? Object.keys(data) : [];
  }, [data]);

  // Set default CSV model when data changes
  useMemo(() => {
    if (modelNames.length > 0 && !selectedCsvModel) {
      setSelectedCsvModel(modelNames[0]);
    }
  }, [modelNames, selectedCsvModel]);

  const totalRecords = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, records) => sum + records.length, 0);
  }, [data]);

  const toggleModel = (model: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(model)) {
      newExpanded.delete(model);
    } else {
      newExpanded.add(model);
    }
    setExpandedModels(newExpanded);
  };

  // Generate formatted content based on export format
  const getFormattedContent = useCallback(
    (format: ExportFormat, model?: string) => {
      if (!data) return "";

      switch (format) {
        case "typescript":
          return code || formatAsTypeScript(data, { asConst: true, includeHeader: true, narrative });
        case "json":
          return formatAsJSON(data, { indent: 2, includeMetadata: true });
        case "sql":
          return formatAsSQL(data);
        case "csv":
          const modelToExport = model || selectedCsvModel || modelNames[0];
          return modelToExport ? formatAsCSV(data, modelToExport) : "";
        default:
          return JSON.stringify(data, null, 2);
      }
    },
    [code, data, narrative, selectedCsvModel, modelNames]
  );

  // Generate formatted content for a single model
  const getFormattedModelContent = useCallback(
    (format: ExportFormat, modelName: string) => {
      if (!data || !data[modelName]) return "";

      const singleModelData = { [modelName]: data[modelName] };

      switch (format) {
        case "typescript":
          return formatAsTypeScript(singleModelData, { asConst: true, includeHeader: true });
        case "json":
          return formatAsJSON(singleModelData, { indent: 2, includeMetadata: false });
        case "sql":
          return formatAsSQL(singleModelData);
        case "csv":
          return formatAsCSV(singleModelData, modelName);
        default:
          return JSON.stringify(singleModelData, null, 2);
      }
    },
    [data]
  );

  const handleCopy = async () => {
    const textToCopy = getFormattedContent(exportFormat, selectedCsvModel);
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = useCallback((formatOverride?: ExportFormat) => {
    const format = formatOverride || exportFormat;
    const content = getFormattedContent(format, selectedCsvModel);
    const formatOption = FORMAT_OPTIONS.find((f) => f.value === format);
    const extension = formatOption?.extension || "txt";

    let filename = `fixtures.${extension}`;
    if (format === "csv" && selectedCsvModel) {
      filename = `fixtures-${selectedCsvModel.toLowerCase()}.${extension}`;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    onExport?.({
      format,
      modelName: format === "csv" ? selectedCsvModel : undefined,
      timestamp: new Date().toISOString(),
    });
  }, [exportFormat, getFormattedContent, selectedCsvModel, onExport]);

  // Save dialog handlers
  const getDefaultFixtureName = useCallback(() => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 5).replace(":", "");
    return `fixture-${dateStr}-${timeStr}`;
  }, []);

  const handleOpenSaveDialog = useCallback(() => {
    setFixtureName(getDefaultFixtureName());
    setSaveDialogOpen(true);
  }, [getDefaultFixtureName]);

  const handleSaveWithName = useCallback(async () => {
    if (!fixtureName.trim()) {
      toast.error("Please enter a fixture name");
      return;
    }

    if (!onSaveWithName) return;

    setIsSavingWithName(true);
    try {
      await onSaveWithName(fixtureName.trim());
      setSaveDialogOpen(false);
      toast.success(`Fixture "${fixtureName}" saved successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save fixture");
    } finally {
      setIsSavingWithName(false);
    }
  }, [fixtureName, onSaveWithName]);

  const isCurrentlySaving = saving || isSavingWithName;

  if (loading) return <LoadingState />;
  if (!data && !code) return <EmptyState />;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header with fixture name and actions */}
      <FixtureHeader
        name={name}
        onNameChange={onNameChange}
        description={description}
        createdAt={createdAt}
        createdBy={createdBy}
        templateName={templateName}
        totalRecords={totalRecords}
        validation={validation}
        narrative={narrative}
        isDirty={isDirty}
        saving={isCurrentlySaving}
        onSave={onSave}
        onSaveWithName={onSaveWithName}
        savedFixtureName={savedFixtureName}
        onOpenSaveDialog={handleOpenSaveDialog}
        onRegenerate={onRegenerate}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onDownload={() => handleDownload()}
        onExportTypeScript={() => handleDownload("typescript")}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Preview Section */}
          <PreviewSection
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            totalRecords={totalRecords}
            previewSubMode={previewSubMode}
            setPreviewSubMode={setPreviewSubMode}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            modelNames={modelNames}
            selectedCsvModel={selectedCsvModel}
            setSelectedCsvModel={setSelectedCsvModel}
            copied={copied}
            onCopy={handleCopy}
            onDownload={() => handleDownload()}
            data={data!}
            code={code}
            narrative={narrative}
            expandedModels={expandedModels}
            onToggleModel={toggleModel}
            getFormattedModelContent={getFormattedModelContent}
            editable={editable}
            isDirty={isDirty}
            canUndo={canUndo}
            onUndo={onUndo}
            onReset={onReset}
            onFieldChange={onFieldChange}
            onDeleteRecord={onDeleteRecord}
            onDuplicateRecord={onDuplicateRecord}
            onAddRecord={onAddRecord}
          />

          {/* Validation Section */}
          <ValidationSection
            open={validationOpen}
            onOpenChange={setValidationOpen}
            validation={validation}
            onRevalidate={onRevalidate}
          />

          {/* Endpoint Mappings Section */}
          {projectId && fixtureId && data && (
            <MappingsSection
              open={mappingsOpen}
              onOpenChange={setMappingsOpen}
              projectId={projectId}
              fixtureId={fixtureId}
              availableModels={modelNames}
            />
          )}

          {/* Integration Section */}
          {data && (
            <IntegrationSection
              open={integrationOpen}
              onOpenChange={setIntegrationOpen}
              data={data}
              projectName={projectName}
            />
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {onSaveWithName && (
        <SaveDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          fixtureName={fixtureName}
          onFixtureNameChange={setFixtureName}
          onSave={handleSaveWithName}
          isSaving={isCurrentlySaving}
          data={data}
          validation={validation}
          totalRecords={totalRecords}
        />
      )}
    </div>
  );
}
