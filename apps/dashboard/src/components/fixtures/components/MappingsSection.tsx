/**
 * MappingsSection Component
 *
 * Collapsible section for displaying and managing endpoint mappings.
 * Shows a list of configured API endpoint → fixture data mappings.
 */

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronIcon } from "./icons";
import {
  useEndpointMappings,
  useToggleEndpointMapping,
  useDeleteEndpointMapping,
  type EndpointMapping,
  type HttpMethod,
} from "@/hooks/use-endpoint-mappings";
import { Plus, Trash2, Pencil, AlertCircle, Sparkles } from "lucide-react";
import { MappingEditor } from "./MappingEditor";

export interface MappingsSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  fixtureId: string;
  availableModels: string[];
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PATCH: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function MappingsSection({
  open,
  onOpenChange,
  projectId,
  fixtureId,
  availableModels,
}: MappingsSectionProps) {
  const { data: mappings, isLoading, error } = useEndpointMappings(projectId, fixtureId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<EndpointMapping | null>(null);

  const enabledCount = mappings?.filter((m) => m.isEnabled).length || 0;
  const totalCount = mappings?.length || 0;

  const handleAddMapping = () => {
    setEditingMapping(null);
    setEditorOpen(true);
  };

  const handleEditMapping = (mapping: EndpointMapping) => {
    setEditingMapping(mapping);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingMapping(null);
  };

  return (
    <>
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
                  Endpoint Mappings
                </h3>
                <MappingsIndicator
                  enabledCount={enabledCount}
                  totalCount={totalCount}
                  isLoading={isLoading}
                />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-border p-4">
              {isLoading ? (
                <MappingsLoadingState />
              ) : error ? (
                <MappingsErrorState error={error} />
              ) : mappings && mappings.length > 0 ? (
                <MappingsList
                  mappings={mappings}
                  projectId={projectId}
                  fixtureId={fixtureId}
                  onEdit={handleEditMapping}
                  onAdd={handleAddMapping}
                />
              ) : (
                <MappingsEmptyState onAdd={handleAddMapping} />
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <MappingEditor
        open={editorOpen}
        onOpenChange={handleEditorClose}
        projectId={projectId}
        fixtureId={fixtureId}
        mapping={editingMapping}
        availableModels={availableModels}
      />
    </>
  );
}

function MappingsIndicator({
  enabledCount,
  totalCount,
  isLoading,
}: {
  enabledCount: number;
  totalCount: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-5 w-12 rounded-full" />;
  }

  if (totalCount === 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
        None
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
      {enabledCount}/{totalCount}
    </span>
  );
}

function MappingsLoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
          <Skeleton className="h-6 w-12 rounded" />
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-4 w-20 rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}

function MappingsErrorState({ error }: { error: Error }) {
  return (
    <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm">Failed to load mappings: {error.message}</span>
    </div>
  );
}

function MappingsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium text-foreground mb-1">
        No endpoint mappings
      </h4>
      <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
        Map API endpoints to your fixture data for automatic response generation.
      </p>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Mapping
      </Button>
    </div>
  );
}

interface MappingsListProps {
  mappings: EndpointMapping[];
  projectId: string;
  fixtureId: string;
  onEdit: (mapping: EndpointMapping) => void;
  onAdd: () => void;
}

function MappingsList({
  mappings,
  projectId,
  fixtureId,
  onEdit,
  onAdd,
}: MappingsListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">
          {mappings.length} mapping{mappings.length !== 1 ? "s" : ""} configured
        </span>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {mappings.map((mapping) => (
          <MappingCard
            key={mapping.id}
            mapping={mapping}
            projectId={projectId}
            fixtureId={fixtureId}
            onEdit={() => onEdit(mapping)}
          />
        ))}
      </div>
    </div>
  );
}

interface MappingCardProps {
  mapping: EndpointMapping;
  projectId: string;
  fixtureId: string;
  onEdit: () => void;
}

function MappingCard({ mapping, projectId, fixtureId, onEdit }: MappingCardProps) {
  const toggleMutation = useToggleEndpointMapping(projectId, fixtureId);
  const deleteMutation = useDeleteEndpointMapping(projectId, fixtureId);

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate({ mappingId: mapping.id, isEnabled: checked });
  };

  const handleDelete = () => {
    if (confirm("Delete this mapping?")) {
      deleteMutation.mutate(mapping.id);
    }
  };

  const isUpdating = toggleMutation.isPending || deleteMutation.isPending;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
        mapping.isEnabled
          ? "bg-background border-border"
          : "bg-muted/30 border-border/50 opacity-60"
      }`}
    >
      {/* Method badge */}
      <Badge
        variant="outline"
        className={`font-mono text-xs px-2 py-0.5 ${METHOD_COLORS[mapping.method]}`}
      >
        {mapping.method}
      </Badge>

      {/* Pattern */}
      <code className="text-sm font-mono text-foreground flex-1 truncate">
        {mapping.pattern}
      </code>

      {/* Source model */}
      <span className="text-xs text-muted-foreground">
        → {mapping.sourceModel}
      </span>

      {/* Response type badge */}
      <Badge variant="secondary" className="text-xs">
        {mapping.responseType}
      </Badge>

      {/* Auto-generated indicator */}
      {mapping.isAutoGenerated && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Auto-generated from schema</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Status indicator for flagged/corrected */}
      {mapping.status === "flagged" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertCircle className="h-3.5 w-3.5 text-warning" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{mapping.validationReason || "Needs review"}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 ml-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onEdit}
              disabled={isUpdating}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit mapping</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isUpdating}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete mapping</TooltipContent>
        </Tooltip>

        <Switch
          checked={mapping.isEnabled}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
          className="ml-1"
        />
      </div>
    </div>
  );
}
