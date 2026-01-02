/**
 * FixtureCard Component
 *
 * Displays a single fixture with its metadata and actions.
 * Features:
 * - Name, description, created date
 * - Record count and validation status
 * - Actions: View, Delete, Duplicate, Export (via dropdown menu)
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Download,
  Trash2,
  MoreHorizontal,
  FileCode,
  Zap,
} from "lucide-react";
import type { FixtureWithRelations } from "@/hooks/use-fixtures";

interface FixtureCardProps {
  fixture: FixtureWithRelations;
  isSelected?: boolean;
  isActive?: boolean;
  onSelect?: (fixture: FixtureWithRelations) => void;
  onDelete?: (fixtureId: string) => void;
  onDuplicate?: (fixture: FixtureWithRelations) => void;
  onExport?: (
    fixture: FixtureWithRelations,
    format: "json" | "typescript"
  ) => void;
  onSetActive?: (fixture: FixtureWithRelations) => void;
  deleting?: boolean;
}

export function FixtureCard({
  fixture,
  isSelected,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
  onExport,
  onSetActive,
  deleting,
}: FixtureCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete?.(fixture.id);
  };

  const hasActions = onDuplicate || onExport || onDelete || onSetActive;

  return (
    <>
      <Card
        className={`group cursor-pointer transition-colors border-transparent ${
          isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
        } ${isActive ? "ring-1 ring-primary/50" : ""} ${deleting ? "opacity-50 pointer-events-none" : ""}`}
        onClick={() => onSelect?.(fixture)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Main content */}
            <div className="flex-1 min-w-0">
              {/* Name and validation status */}
              <div className="flex items-center gap-2 min-w-0">
                {isActive && (
                  <Zap className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                )}
                <span className="text-sm truncate min-w-0 flex-1 max-w-[200px]">
                  {fixture.name}
                </span>
              </div>
            </div>

            {/* Right: Action menu */}
            {hasActions && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isSelected ? "text-primary-foreground hover:bg-primary-foreground/20" : ""
                    }`}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onSetActive && !isActive && (
                    <DropdownMenuItem onClick={() => onSetActive(fixture)}>
                      <Zap className="w-4 h-4 mr-2" />
                      Set as Active
                    </DropdownMenuItem>
                  )}
                  {onSetActive && !isActive && (onDuplicate || onExport) && (
                    <DropdownMenuSeparator />
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={() => onDuplicate(fixture)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onExport(fixture, "json")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onExport(fixture, "typescript")}
                      >
                        <FileCode className="w-4 h-4 mr-2" />
                        Export TypeScript
                      </DropdownMenuItem>
                    </>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Fixture</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{fixture.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
